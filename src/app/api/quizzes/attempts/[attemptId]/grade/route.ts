import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recalculateQuizAttempt } from '@/lib/gamification'

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { attemptId } = await params

  try {
    const data = await request.json()
    const { grades } = data // array of { answerId, marksAwarded, teacherFeedback }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: { include: { question: true } },
        quiz: true,
        user: true
      }
    })

    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    for (const grade of grades) {
      const answer = attempt.answers.find(a => a.id === grade.answerId)
      if (!answer) continue

      const maxMarks = answer.question.maxMarks || 10
      const awarded = Math.min(maxMarks, Math.max(0, Number(grade.marksAwarded) || 0))

      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          marksAwarded: awarded,
          pointsAwarded: awarded,
          isCorrect: awarded >= maxMarks * 0.6,
          teacherFeedback: grade.teacherFeedback || null,
          gradingMethod: 'teacher',
          overrideByTeacher: true
        }
      })
    }

    // Recalculate quiz attempt
    const updatedAttempt = await recalculateQuizAttempt(attemptId)

    // Notify student about teacher grade/override
    await prisma.notification.create({
      data: {
        userId: attempt.userId,
        type: 'TEACHER_GRADED',
        title: 'Quiz Grade Updated',
        message: `Your answers for "${attempt.quiz.title}" have been reviewed by your teacher. Total Score: ${updatedAttempt?.score} / ${updatedAttempt?.maxPossibleScore}`,
        link: `/dashboard/student/quizzes/${attempt.quizId}`
      }
    })

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt
    })

  } catch (error: any) {
    console.error('Teacher manual grade error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
