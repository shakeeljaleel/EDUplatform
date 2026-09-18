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
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        quizzes: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            createdAt: true,
            questions: {
              select: { id: true, text: true, type: true, points: true }
            }
          }
        },
        studentEnrollments: {
          where: { status: 'active' },
          include: {
            student: {
              include: {
                profile: true,
                quizAttempts: {
                  where: { quiz: { subjectId } },
                  include: {
                    answers: {
                      include: {
                        question: { select: { text: true, type: true, points: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const quizzes = subject.quizzes.map(q => ({
      id: q.id,
      title: q.title
    }))

    const students = subject.studentEnrollments.map(en => {
      const student = en.student
      const quizScores: Record<string, any> = {}

      let totalPctSum = 0
      let attemptedCount = 0
      let hasLowScore = false

      subject.quizzes.forEach(quiz => {
        const attempt = student.quizAttempts.find(att => att.quizId === quiz.id && att.status === 'GRADED')
        if (attempt) {
          const pct = Math.round(attempt.percentageScore)
          totalPctSum += pct
          attemptedCount++
          if (pct < 50) hasLowScore = true

          quizScores[quiz.id] = {
            attemptId: attempt.id,
            score: attempt.score,
            maxScore: attempt.maxPossibleScore,
            percentage: pct,
            submittedAt: attempt.updatedAt,
            answers: attempt.answers.map(a => ({
              id: a.id,
              questionText: a.question?.text || 'Question',
              studentAnswer: a.shortAnswerText || a.answerText || (a.selectedOption !== null ? `Option ${a.selectedOption}` : 'No answer'),
              marksAwarded: a.marksAwarded,
              maxMarks: a.question?.points || 10,
              aiFeedback: a.aiFeedback,
              teacherFeedback: a.teacherFeedback
            }))
          }
        } else {
          quizScores[quiz.id] = null
        }
      })

      const avgPct = attemptedCount > 0 ? Math.round(totalPctSum / attemptedCount) : null
      const helixScore = student.profile?.helixScore ?? 0

      return {
        studentId: student.id,
        name: student.name,
        email: student.email,
        helixScore,
        avgPct,
        hasLowScore,
        quizScores
      }
    })

    return NextResponse.json({
      quizzes,
      students
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
