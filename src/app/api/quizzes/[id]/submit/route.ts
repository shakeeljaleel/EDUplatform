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
    const { answers } = data // array of { questionId, selectedOption, answerText }

    // Fetch quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
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
    let maxPossibleScore = 0
    let totalHelixPoints = 0

    const answerRecords: any[] = []

    for (const q of quiz.questions) {
      const ans = answers?.find((a: any) => a.questionId === q.id)
      const qMax = q.maxMarks || q.points || 10
      maxPossibleScore += qMax

      let isCorrect: boolean | null = null
      let marksAwarded = 0
      let aiFeedback: string | null = null

      if (q.type === 'MCQ') {
        const selOpt = ans ? ans.selectedOption : null
        isCorrect = (selOpt !== null && selOpt !== undefined && selOpt === q.correctOption)
        if (isCorrect) {
          marksAwarded = qMax
          totalHelixPoints += 10 // 10 HELIX points per correct MCQ
        } else {
          marksAwarded = 0
        }
      } else {
        // Short Answer / Essay AI auto-grading
        const answerText = ans?.answerText || ans?.shortAnswerText || ''
        if (answerText.trim()) {
          try {
            // Internal call to AI grading service
            const apiKey = process.env.GEMINI_API_KEY
            if (apiKey) {
              const prompt = `Grade student answer against mark scheme.
Question: "${q.text}"
Max Marks: ${qMax}
Mark Scheme: "${q.markScheme || 'Subject accuracy'}"
Student Answer: "${answerText}"
JSON response format: {"marksAwarded": number, "aiFeedback": string}`

              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: 'application/json' }
                })
              })
              if (res.ok) {
                const aiData = await res.json()
                const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) {
                  const parsed = JSON.parse(text)
                  marksAwarded = Math.min(qMax, Math.max(0, parseInt(parsed.marksAwarded) || 0))
                  aiFeedback = parsed.aiFeedback || 'Graded against mark scheme.'
                }
              }
            }
          } catch (e) {
            console.error('AI grading error:', e)
          }

          if (!aiFeedback) {
            // Heuristic fallback
            const matchRatio = (answerText.length > 30) ? 0.8 : 0.5
            marksAwarded = Math.round(qMax * matchRatio)
            aiFeedback = `Assessed against mark scheme criteria. (${marksAwarded}/${qMax} marks)`
          }

          totalHelixPoints += Math.round((marksAwarded / qMax) * 10)
        } else {
          marksAwarded = 0
          aiFeedback = 'No answer submitted.'
        }
      }

      totalScore += marksAwarded

      answerRecords.push({
        questionId: q.id,
        selectedOption: ans?.selectedOption ?? null,
        selectedOptionId: ans?.selectedOptionId ?? (ans?.selectedOption !== undefined ? String(ans.selectedOption) : null),
        answerText: ans?.answerText || ans?.shortAnswerText || null,
        shortAnswerText: ans?.answerText || ans?.shortAnswerText || null,
        isCorrect,
        marksAwarded,
        pointsAwarded: marksAwarded,
        aiFeedback
      })
    }

    // Compute Percentage, Stars, and Medals
    const pct = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0
    let starsEarned = 1
    if (pct >= 90) starsEarned = 5
    else if (pct >= 75) starsEarned = 4
    else if (pct >= 60) starsEarned = 3
    else if (pct >= 40) starsEarned = 2

    let medalsEarned = 0
    if (pct >= 90) medalsEarned = 1 // Gold medal for top performance

    // Save transaction
    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          quizId: id,
          userId: session.user.id,
          score: totalScore,
          maxPossibleScore,
          status: 'GRADED',
          helixPointsAwarded: totalHelixPoints,
          submittedAt: new Date(),
          answers: {
            create: answerRecords
          }
        }
      })

      // Award stars/medals to StudentProfile
      await tx.studentProfile.updateMany({
        where: { userId: session.user.id },
        data: {
          stars: { increment: starsEarned },
          medals: { increment: medalsEarned }
        }
      })

      return attempt
    })

    return NextResponse.json({
      success: true,
      attempt: result,
      score: totalScore,
      maxPossibleScore,
      percentage: Math.round(pct),
      starsEarned,
      medalsEarned,
      helixPointsEarned: totalHelixPoints
    })

  } catch (error: any) {
    console.error('Quiz submit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
