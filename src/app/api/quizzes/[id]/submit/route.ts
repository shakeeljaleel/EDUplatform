import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recalculateQuizAttempt } from '@/lib/gamification'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quizId } = await params

  try {
    const data = await request.json()
    const { answers } = data // array of { questionId, selectedOption, answerText, shortAnswerText }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    })

    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { quizId_userId: { quizId, userId: session.user.id } }
    })

    if (existingAttempt) {
      return NextResponse.json({ error: 'You have already submitted this quiz' }, { status: 400 })
    }

    let hasPendingManualOrAI = false
    let initialTotalScore = 0
    let maxPossibleScore = 0

    const answerRecords: any[] = []

    for (const q of quiz.questions) {
      const qMax = q.maxMarks || q.points || 10
      maxPossibleScore += qMax
      const ans = answers?.find((a: any) => a.questionId === q.id)
      const answerText = (ans?.answerText || ans?.shortAnswerText || '').trim()

      if (q.type === 'MCQ') {
        let correctOpt = q.correctOption
        if (correctOpt === null || correctOpt === undefined) {
          if (q.options) {
            try {
              const parsed = JSON.parse(q.options)
              if (Array.isArray(parsed)) {
                const idx = parsed.findIndex((opt: any) => opt.isCorrect || opt.correct || opt.is_correct)
                if (idx !== -1) correctOpt = idx
              }
            } catch {}
          }
        }

        const selOpt = ans ? ans.selectedOption : null
        const isCorrect = (selOpt !== null && selOpt !== undefined && correctOpt !== null && correctOpt !== undefined && selOpt === correctOpt)
        const marks = isCorrect ? qMax : 0
        initialTotalScore += marks

        answerRecords.push({
          questionId: q.id,
          selectedOption: selOpt,
          selectedOptionId: selOpt !== null && selOpt !== undefined ? String(selOpt) : null,
          answerText: null,
          shortAnswerText: null,
          isCorrect,
          marksAwarded: marks,
          pointsAwarded: marks,
          gradingMethod: 'auto',
          aiFeedback: isCorrect ? 'Correct selection.' : 'Incorrect option selected.'
        })
      } else {
        // Short Answer or Essay
        if (quiz.markingMode === 'MANUAL_ONLY') {
          hasPendingManualOrAI = true
          answerRecords.push({
            questionId: q.id,
            selectedOption: null,
            answerText: answerText || null,
            shortAnswerText: answerText || null,
            isCorrect: null,
            marksAwarded: 0,
            pointsAwarded: 0,
            gradingMethod: 'teacher',
            aiFeedback: 'Pending manual evaluation by teacher.'
          })
        } else {
          // AUTO_AI Mode
          let marksAwarded = 0
          let aiFeedback = ''
          let keyPointsCovered: string[] = []
          let keyPointsMissed: string[] = []
          let gradingMethod = 'ai'

          if (!answerText || answerText.length < 3) {
            marksAwarded = 0
            aiFeedback = 'No valid answer submitted.'
            keyPointsMissed = ['Answer not provided']
          } else {
            // Call AI grading helper via fetch or direct evaluation
            try {
              const origin = new URL(request.url).origin
              const aiRes = await fetch(`${origin}/api/ai/grade-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questionId: q.id,
                  studentId: session.user.id,
                  questionText: q.text,
                  questionType: q.type,
                  markScheme: q.markScheme || q.markingCriteria || 'Subject accuracy',
                  maxMarks: qMax,
                  studentAnswer: answerText
                })
              })

              if (aiRes.ok) {
                const aiData = await aiRes.json()
                marksAwarded = aiData.marks_awarded ?? 0
                aiFeedback = aiData.feedback || 'Evaluated against mark scheme.'
                keyPointsCovered = aiData.key_points_covered || []
                keyPointsMissed = aiData.key_points_missed || []
              } else {
                hasPendingManualOrAI = true
                aiFeedback = 'Being graded by AI / Pending review'
              }
            } catch (err) {
              console.error('AI grading error on submit:', err)
              hasPendingManualOrAI = true
              aiFeedback = 'Pending review'
            }
          }

          initialTotalScore += marksAwarded

          answerRecords.push({
            questionId: q.id,
            selectedOption: null,
            answerText,
            shortAnswerText: answerText,
            isCorrect: marksAwarded >= qMax * 0.6,
            marksAwarded,
            pointsAwarded: marksAwarded,
            aiFeedback,
            keyPointsCovered: JSON.stringify(keyPointsCovered),
            keyPointsMissed: JSON.stringify(keyPointsMissed),
            gradingMethod
          })
        }
      }
    }

    const markingStatus = hasPendingManualOrAI ? 'pending_review' : 'fully_graded'

    // Create QuizAttempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: session.user.id,
        score: Math.round(initialTotalScore),
        maxPossibleScore,
        status: 'SUBMITTED',
        markingStatus,
        submittedAt: new Date(),
        answers: {
          create: answerRecords
        }
      },
      include: {
        answers: true
      }
    })

    // Recalculate all gamification metrics (points, stars, medals, leaderboard, notifications)
    const updatedAttempt = await recalculateQuizAttempt(attempt.id)

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt || attempt,
      score: updatedAttempt?.score || Math.round(initialTotalScore),
      maxPossibleScore,
      percentage: updatedAttempt?.percentageScore || Math.round((initialTotalScore / maxPossibleScore) * 100),
      starsEarned: updatedAttempt?.starsAwarded || 1,
      helixPointsEarned: updatedAttempt?.helixPointsAwarded || 0,
      medalEarned: updatedAttempt?.medalAwarded || 'none',
      markingStatus: updatedAttempt?.markingStatus || markingStatus
    })

  } catch (error: any) {
    console.error('Quiz submit route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
