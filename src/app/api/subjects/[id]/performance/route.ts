import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params

  try {
    // Get all students enrolled in this subject
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        enrollments: {
          where: { status: { in: ['APPROVED', 'ACTIVE'] } },
          include: {
            user: {
              include: {
                profile: true,
                quizAttempts: {
                  where: { quiz: { subjectId } },
                  include: { quiz: { include: { questions: { select: { points: true } } } } }
                },
                examRecords: {
                  where: { subjectId }
                }
              }
            }
          }
        }
      }
    })

    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const performanceData = subject.enrollments.map((en: any) => {
      const student = en.user
      
      // Quiz performance for THIS subject
      const quizScores = student.quizAttempts.map((q: any) => {
        const maxMarks = q.quiz?.questions?.reduce((sum: number, ques: any) => sum + (ques.points || 0), 0) || 1
        return (q.score / maxMarks) * 100
      })
      const quizAvg = quizScores.length > 0 ? quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length : 0

      // Exam performance for THIS subject
      const examScores = student.examRecords.map((e: any) => (e.marks / (e.maxMarks || 100)) * 100)
      const examAvg = examScores.length > 0 ? examScores.reduce((a: number, b: number) => a + b, 0) / examScores.length : 0

      // Overall score (weighted: 40% quizzes, 60% exams)
      const overallScore = (quizAvg * 0.4) + (examAvg * 0.6)

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        studentId: student.profile?.studentId || student.id.slice(0, 8),
        quizAvg: Math.round(quizAvg),
        examAvg: Math.round(examAvg),
        overallScore: Math.round(overallScore),
        quizCount: student.quizAttempts.length,
        examCount: student.examRecords.length
      }
    })

    const sortedData = performanceData.sort((a, b) => b.overallScore - a.overallScore)
    const rankedData = sortedData.map((s, index) => ({ ...s, rank: index + 1 }))

    return NextResponse.json({ performance: rankedData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
