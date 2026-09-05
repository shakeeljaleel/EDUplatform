import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { id } = await params

  try {
    const data = await request.json()
    const { answers } = data // array of { questionId, selectedOption, shortAnswerText }

    // Fetch quiz with questions to auto-grade
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true }
    })

    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    // Check if attempt already exists
    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { quizId_userId: { quizId: id, userId: session.user.id } }
    })

    if (existingAttempt) {
      return NextResponse.json({ error: 'You have already submitted this quiz' }, { status: 400 })
    }

    let totalScore = 0
    let totalStarsEarned = 0
    let needsReview = false

    const answerRecords = answers.map((ans: any) => {
      const question = quiz.questions.find(q => q.id === ans.questionId)
      if (!question) return null

      let isCorrect = null
      let pointsAwarded = 0

      if (question.type === 'MCQ') {
        isCorrect = (ans.selectedOption === question.correctOption)
        if (isCorrect) {
          pointsAwarded = question.points
          totalScore += pointsAwarded
          totalStarsEarned += 10 // Reward: 10 stars per correct MCQ
        }
      } else {
        // Short Answer
        needsReview = true
      }

      return {
        questionId: question.id,
        selectedOption: ans.selectedOption ?? null,
        shortAnswerText: ans.shortAnswerText ?? null,
        isCorrect,
        pointsAwarded
      }
    }).filter(Boolean)

    // Calculate max possible score to check for medals
    const maxScore = quiz.questions.reduce((acc, q) => acc + q.points, 0)
    let medalsEarned = 0
    if (!needsReview && maxScore > 0 && totalScore / maxScore >= 0.9) {
      medalsEarned = 1 // Reward: 1 medal for >90% score
    }

    // Use transaction to save attempt and update profile
    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          quizId: id,
          userId: session.user.id,
          score: totalScore,
          status: needsReview ? 'PENDING_REVIEW' : 'GRADED',
          answers: {
            create: answerRecords
          }
        }
      })

      // Grant stars/medals
      if (totalStarsEarned > 0 || medalsEarned > 0) {
        await tx.studentProfile.update({
          where: { userId: session.user.id },
          data: {
            stars: { increment: totalStarsEarned },
            medals: { increment: medalsEarned }
          }
        })
      }

      return attempt
    })

    return NextResponse.json({ 
      success: true, 
      attempt: result, 
      starsEarned: totalStarsEarned, 
      medalsEarned 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
