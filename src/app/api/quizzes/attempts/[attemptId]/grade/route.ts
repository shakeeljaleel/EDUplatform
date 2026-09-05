import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Manual grading of short answer questions by Teacher
export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { attemptId } = await params

  try {
    const data = await request.json()
    const { grades } = data // array of { answerId, pointsAwarded, isCorrect }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { 
        answers: true,
        quiz: { include: { questions: true } }
      }
    })

    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    let additionalPoints = 0
    let additionalStars = 0

    await prisma.$transaction(async (tx) => {
      for (const grade of grades) {
        const answer = attempt.answers.find(a => a.id === grade.answerId)
        if (!answer) continue

        // Update the answer record
        await tx.answer.update({
          where: { id: answer.id },
          data: {
            pointsAwarded: grade.pointsAwarded,
            isCorrect: grade.isCorrect
          }
        })

        additionalPoints += grade.pointsAwarded
        if (grade.isCorrect) {
          additionalStars += 10 // Award stars for correct short answers
        }
      }

      // Update total score and status
      const newScore = attempt.score + additionalPoints
      
      // Check if all short answers are graded (for simplicity, we assume this grades all pending)
      await tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score: newScore,
          status: 'GRADED'
        }
      })

      // Check for medals (did this bump them to >90%?)
      const maxScore = attempt.quiz.questions.reduce((acc, q) => acc + q.points, 0)
      let medalsEarned = 0
      
      // If it wasn't graded before, we calculate medal eligibility now
      if (attempt.status === 'PENDING_REVIEW' && maxScore > 0 && newScore / maxScore >= 0.9) {
        medalsEarned = 1
      }

      // Update student profile
      if (additionalStars > 0 || medalsEarned > 0) {
        await tx.studentProfile.update({
          where: { userId: attempt.userId },
          data: {
            stars: { increment: additionalStars },
            medals: { increment: medalsEarned }
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
