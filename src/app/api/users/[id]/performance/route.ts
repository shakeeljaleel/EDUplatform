import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params // student userId

  // Security check: Only allow the student themselves, their parent, a teacher, or a super admin
  let allowed = false
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'TEACHER') {
    allowed = true
  } else if (session.user.id === id) {
    allowed = true
  } else if (session.user.role === 'PARENT') {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: { children: true }
    })
    if (parentProfile?.children.some(c => c.userId === id)) {
      allowed = true
    }
  }

  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Fetch Online Quizzes
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: id, status: 'GRADED' },
      include: { quiz: { select: { title: true, subject: { select: { name: true } } } }, answers: true },
      orderBy: { updatedAt: 'asc' }
    })

    // Fetch Manual Exam Records
    const examRecords = await prisma.examRecord.findMany({
      where: { userId: id },
      include: { subject: { select: { name: true } } },
      orderBy: { date: 'asc' }
    })

    // Unify data into a chronological list
    const combinedMarks = [
      ...quizAttempts.map(q => {
        // Calculate max possible score from questions if we needed, but let's assume we just have score
        // Actually points are on question, but we don't have max score easily without fetching questions.
        // Let's assume standard out of 100 or just show absolute score for quizzes.
        const totalAwarded = q.answers.reduce((sum, a) => sum + a.pointsAwarded, 0)
        return {
          id: `quiz_${q.id}`,
          title: q.quiz.title,
          subject: q.quiz.subject?.name || 'General',
          type: 'Online Quiz',
          date: q.updatedAt,
          score: totalAwarded,
          maxScore: null, // Hard to calculate without questions include, but we'll adapt in UI
          percentage: null // Wait, if we can calculate it we should. Let's just pass raw score.
        }
      }),
      ...examRecords.map(e => ({
        id: `exam_${e.id}`,
        title: e.title,
        subject: e.subject.name,
        type: 'Physical Exam',
        date: e.date,
        score: e.marks,
        maxScore: e.maxMarks,
        percentage: (e.marks / e.maxMarks) * 100
      }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    // Also fetch attendance
    const attendance = await prisma.attendanceRecord.findMany({
      where: { userId: id },
      include: { classSession: { include: { subject: { select: { name: true } } } } },
      orderBy: { markedAt: 'desc' }
    })

    return NextResponse.json({ marks: combinedMarks, attendance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
