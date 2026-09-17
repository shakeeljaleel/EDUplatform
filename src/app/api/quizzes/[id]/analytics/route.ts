import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, colour: true } },
        linkedSession: { select: { id: true, title: true, scheduledDate: true } },
        questions: { select: { id: true, type: true, maxMarks: true, points: true } },
        attempts: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    // Total max possible marks
    const maxScore = quiz.questions.reduce((acc, q) => acc + (q.maxMarks || q.points || 10), 0)

    // Enrolled students in this subject
    let totalEnrolled = 0
    if (quiz.subjectId) {
      totalEnrolled = await prisma.studentEnrollment.count({
        where: { subjectId: quiz.subjectId, status: 'active' }
      })
    }

    const attemptsCount = quiz.attempts.length
    const submissionRate = totalEnrolled > 0 ? Math.round((attemptsCount / totalEnrolled) * 100) : 100

    const scores = quiz.attempts.map(a => a.score)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0

    // Check all quizzes for this subject to compute consecutive <50% flags
    let flaggedStudentIds = new Set<string>()
    if (quiz.subjectId) {
      const allQuizzes = await prisma.quiz.findMany({
        where: { subjectId: quiz.subjectId, status: { in: ['PUBLISHED', 'CLOSED'] } },
        include: {
          questions: { select: { maxMarks: true, points: true } },
          attempts: { select: { userId: true, score: true } }
        },
        orderBy: { createdAt: 'asc' }
      })

      // Map scores per student across quizzes
      const studentHistory: { [studentId: string]: number[] } = {}

      for (const q of allQuizzes) {
        const qMax = q.questions.reduce((acc, qu) => acc + (qu.maxMarks || qu.points || 10), 0) || 1
        for (const att of q.attempts) {
          const pct = (att.score / qMax) * 100
          if (!studentHistory[att.userId]) studentHistory[att.userId] = []
          studentHistory[att.userId].push(pct)
        }
      }

      for (const [stId, pcts] of Object.entries(studentHistory)) {
        for (let i = 0; i < pcts.length - 1; i++) {
          if (pcts[i] < 50 && pcts[i + 1] < 50) {
            flaggedStudentIds.add(stId)
            break
          }
        }
      }
    }

    const studentBreakdown = quiz.attempts.map(a => {
      const pct = maxScore > 0 ? Math.round((a.score / maxScore) * 100) : 0
      let stars = 1
      if (pct >= 90) stars = 5
      else if (pct >= 75) stars = 4
      else if (pct >= 60) stars = 3
      else if (pct >= 40) stars = 2

      return {
        attemptId: a.id,
        studentId: a.userId,
        studentName: a.user.name,
        studentEmail: a.user.email,
        score: a.score,
        maxScore,
        percentage: pct,
        stars,
        submittedAt: a.submittedAt || a.createdAt,
        isFlagged: flaggedStudentIds.has(a.userId)
      }
    })

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        subjectName: quiz.subject?.name,
        linkedLessonTitle: quiz.linkedSession?.title,
        status: quiz.status,
        createdAt: quiz.createdAt
      },
      stats: {
        totalEnrolled,
        submittedCount: attemptsCount,
        submissionRate,
        avgScore,
        highestScore,
        lowestScore,
        maxPossibleScore: maxScore
      },
      students: studentBreakdown
    })

  } catch (error: any) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
