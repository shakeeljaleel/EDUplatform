import { prisma } from '@/lib/prisma'

export interface GradingResult {
  marksAwarded: number
  percentage: number
  feedback: string
  keyPointsCovered: string[]
  keyPointsMissed: string[]
}

export function calculatePointsAndStars(
  score: number,
  maxPossibleScore: number,
  mcqCorrectCount: number,
  shortEssayPointsSum: number
) {
  const percentage = maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0

  // Points formula: MCQ 10 points per correct + Short/Essay (marks/max)*100
  const helixPoints = mcqCorrectCount * 10 + Math.round(shortEssayPointsSum)

  // Bonus points
  let bonusPoints = 0
  const participationBonus = 5
  bonusPoints += participationBonus

  const isPerfect = percentage >= 100 && maxPossibleScore > 0
  if (isPerfect) {
    bonusPoints += 25
  }

  const totalPoints = helixPoints + bonusPoints

  // Stars formula: 90%+ = 5, 75%-89% = 4, 60%-74% = 3, 40%-59% = 2, attempt = 1
  let stars = 1
  if (percentage >= 90) stars = 5
  else if (percentage >= 75) stars = 4
  else if (percentage >= 60) stars = 3
  else if (percentage >= 40) stars = 2

  return { percentage, totalPoints, bonusPoints, stars, isPerfect }
}

export async function recalculateQuizAttempt(attemptId: string) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: true } },
      answers: { include: { question: true } }
    }
  })

  if (!attempt) return null

  let totalScore = 0
  let maxPossibleScore = 0
  let mcqCorrectCount = 0
  let shortEssayPointsSum = 0
  let hasPendingAIOrTeacher = false

  for (const q of attempt.quiz.questions) {
    maxPossibleScore += q.maxMarks || 10

    const ans = attempt.answers.find(a => a.questionId === q.id)
    if (!ans) continue

    if (q.type === 'MCQ') {
      let isCorrect = false
      let correctOpt = q.correctOption

      // Try parsing JSON options if correctOption isn't directly stored
      if (correctOpt === null || correctOpt === undefined) {
        if (q.options) {
          try {
            const parsed = JSON.parse(q.options)
            if (Array.isArray(parsed)) {
              const idx = parsed.findIndex((opt: { isCorrect?: boolean; correct?: boolean }) => opt.isCorrect || opt.correct)
              if (idx !== -1) correctOpt = idx
            }
          } catch {}
        }
      }

      if (ans.selectedOption !== null && ans.selectedOption !== undefined && correctOpt !== null && correctOpt !== undefined) {
        isCorrect = ans.selectedOption === correctOpt
      }

      const marks = isCorrect ? (q.maxMarks || 10) : 0
      if (isCorrect) mcqCorrectCount += 1
      totalScore += marks

      // Update Answer record
      await prisma.answer.update({
        where: { id: ans.id },
        data: { isCorrect, marksAwarded: marks, gradingMethod: 'auto' }
      })
    } else {
      // Short answer or Essay
      const marks = ans.marksAwarded || 0
      totalScore += marks
      const qMax = q.maxMarks || 10
      shortEssayPointsSum += (marks / Math.max(1, qMax)) * 100

      if (ans.gradingMethod === 'ai' && !ans.aiFeedback && ans.marksAwarded === 0) {
        hasPendingAIOrTeacher = true
      }
    }
  }

  const { percentage, totalPoints, bonusPoints, stars, isPerfect } = calculatePointsAndStars(
    totalScore,
    maxPossibleScore,
    mcqCorrectCount,
    shortEssayPointsSum
  )

  const markingStatus = hasPendingAIOrTeacher ? 'pending_review' : 'fully_graded'

  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      score: Math.round(totalScore),
      maxPossibleScore,
      percentageScore: Math.round(percentage * 10) / 10,
      helixPointsAwarded: totalPoints,
      bonusPoints,
      starsAwarded: stars,
      status: 'GRADED',
      markingStatus
    }
  })

  // Recalculate batch medals and update student profile stats
  await updateBatchMedalsAndLeaderboard(attempt.quizId)

  // Send completion & perfect score notifications
  const user = await prisma.user.findUnique({ where: { id: attempt.userId } })
  if (user) {
    await prisma.notification.create({
      data: {
        userId: attempt.userId,
        type: 'QUIZ_GRADED',
        title: 'Quiz Graded!',
        message: `Quiz graded: ${attempt.quiz.title} — You scored ${Math.round(percentage)}% and earned ${totalPoints} HELIX points and ${stars} stars.`,
        link: `/dashboard/student/quizzes/${attempt.quizId}`
      }
    })

    if (isPerfect) {
      await prisma.notification.create({
        data: {
          userId: attempt.userId,
          type: 'PERFECT_SCORE',
          title: '⭐⭐⭐⭐⭐ Perfect Score!',
          message: `Perfect score on ${attempt.quiz.title}! 25 bonus points awarded.`,
          link: `/dashboard/student/quizzes/${attempt.quizId}`
        }
      })
    }
  }

  return updatedAttempt
}

export async function updateBatchMedalsAndLeaderboard(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      attempts: {
        where: { status: 'GRADED' },
        include: { user: { include: { profile: true } } },
        orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }]
      }
    }
  })

  if (!quiz || quiz.attempts.length === 0) return

  const attempts = quiz.attempts
  const uniqueScores = Array.from(new Set(attempts.map(a => a.score))).sort((a, b) => b - a)

  const goldScore = uniqueScores[0]
  const silverScore = uniqueScores[1]
  const bronzeScore = uniqueScores[2]

  for (let i = 0; i < attempts.length; i++) {
    const att = attempts[i]
    let medal = 'none'
    let medalBonus = 0

    if (att.score === goldScore && goldScore > 0) {
      medal = 'gold'
      medalBonus = 50
    } else if (att.score === silverScore && silverScore > 0) {
      medal = 'silver'
      medalBonus = 30
    } else if (att.score === bronzeScore && bronzeScore > 0) {
      medal = 'bronze'
      medalBonus = 20
    }

    const rankInBatch = uniqueScores.indexOf(att.score) + 1

    await prisma.quizAttempt.update({
      where: { id: att.id },
      data: {
        medalAwarded: medal,
        rankInBatch
      }
    })

    // Send medal notifications if newly awarded
    if (medal !== 'none' && att.medalAwarded !== medal) {
      const medalEmoji = medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : '🥉'
      const medalName = medal.charAt(0).toUpperCase() + medal.slice(1)
      await prisma.notification.create({
        data: {
          userId: att.userId,
          type: 'MEDAL_AWARDED',
          title: `${medalEmoji} ${medalName} Medal Won!`,
          message: `${medalEmoji} ${medalName} place on ${quiz.title}! ${medalBonus} bonus HELIX points awarded.`,
          link: `/dashboard/student/quizzes/${quiz.id}`
        }
      })
    }
  }

  // Recalculate student cumulative profile totals for all participants
  const userIds = Array.from(new Set(attempts.map(a => a.userId)))
  for (const userId of userIds) {
    await syncStudentHelixProfile(userId)
  }
}

export async function syncStudentHelixProfile(userId: string) {
  const allAttempts = await prisma.quizAttempt.findMany({
    where: { userId, status: 'GRADED' }
  })

  let helixScore = 0
  let totalStars = 0
  let goldMedals = 0
  let silverMedals = 0
  let bronzeMedals = 0
  let perfectScores = 0

  for (const att of allAttempts) {
    helixScore += att.helixPointsAwarded || 0

    let medalBonus = 0
    if (att.medalAwarded === 'gold') {
      goldMedals += 1
      medalBonus = 50
    } else if (att.medalAwarded === 'silver') {
      silverMedals += 1
      medalBonus = 30
    } else if (att.medalAwarded === 'bronze') {
      bronzeMedals += 1
      medalBonus = 20
    }

    helixScore += medalBonus
    totalStars += att.starsAwarded || 0
    if (att.percentageScore >= 100) perfectScores += 1
  }

  const quizCount = allAttempts.length
  const totalMedalsCount = goldMedals + silverMedals + bronzeMedals

  await prisma.studentProfile.upsert({
    where: { userId },
    create: {
      userId,
      helixScore,
      totalStars,
      stars: totalStars,
      medals: totalMedalsCount,
      goldMedals,
      silverMedals,
      bronzeMedals,
      quizCount,
      perfectScores
    },
    update: {
      helixScore,
      totalStars,
      stars: totalStars,
      medals: totalMedalsCount,
      goldMedals,
      silverMedals,
      bronzeMedals,
      quizCount,
      perfectScores
    }
  })
}
