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
        batch: true,
        studentEnrollments: {
          where: { status: 'active' },
          include: {
            student: {
              include: {
                profile: true,
                quizAttempts: {
                  where: { quiz: { subjectId }, status: 'GRADED' },
                  include: {
                    quiz: {
                      select: { id: true, title: true, topic: true, createdAt: true, questions: { select: { points: true } } }
                    }
                  },
                  orderBy: { updatedAt: 'asc' }
                },
                examRecords: {
                  where: { subjectId },
                  orderBy: { date: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    // Build student performance list
    const performanceData = subject.studentEnrollments.map((en: any) => {
      const student = en.student

      // Quiz performance
      const quizScores = student.quizAttempts.map((q: any) => {
        const maxMarks = q.quiz?.questions?.reduce((sum: number, ques: any) => sum + (ques.points || 0), 0) || 100
        const maxScore = q.maxPossibleScore || maxMarks
        return maxScore > 0 ? (q.score / maxScore) * 100 : 0
      })

      const hasQuizSubmissions = quizScores.length > 0
      const quizAvg = hasQuizSubmissions
        ? Math.round(quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length)
        : null

      // Exam performance
      const examScores = student.examRecords.map((e: any) =>
        e.maxMarks > 0 ? (e.marks / e.maxMarks) * 100 : 0
      )
      const hasExamRecords = examScores.length > 0
      const examAvg = hasExamRecords
        ? Math.round(examScores.reduce((a: number, b: number) => a + b, 0) / examScores.length)
        : null

      // Overall Score
      let overallScore = 0
      if (quizAvg !== null && examAvg !== null) {
        overallScore = Math.round(quizAvg * 0.4 + examAvg * 0.6)
      } else if (quizAvg !== null) {
        overallScore = quizAvg
      } else if (examAvg !== null) {
        overallScore = examAvg
      }

      // Collect all assessments chronologically for consecutive < 50% risk tracking
      const chronologicalAssessments: { title: string; pct: number; date: Date }[] = []
      student.quizAttempts.forEach((q: any) => {
        const maxMarks = q.quiz?.questions?.reduce((sum: number, ques: any) => sum + (ques.points || 0), 0) || 100
        const maxScore = q.maxPossibleScore || maxMarks
        const pct = maxScore > 0 ? (q.score / maxScore) * 100 : 0
        chronologicalAssessments.push({ title: q.quiz?.title || 'Quiz', pct, date: new Date(q.updatedAt) })
      })
      student.examRecords.forEach((e: any) => {
        const pct = e.maxMarks > 0 ? (e.marks / e.maxMarks) * 100 : 0
        chronologicalAssessments.push({ title: e.title, pct, date: new Date(e.date) })
      })

      chronologicalAssessments.sort((a, b) => a.date.getTime() - b.date.getTime())

      let consecutiveLow = 0
      let maxConsecutiveLow = 0
      for (const ass of chronologicalAssessments) {
        if (ass.pct < 50) {
          consecutiveLow++
          if (consecutiveLow > maxConsecutiveLow) maxConsecutiveLow = consecutiveLow
        } else {
          consecutiveLow = 0
        }
      }

      const isAtRisk = maxConsecutiveLow >= 2
      const recentScores = chronologicalAssessments.slice(-3).map(a => Math.round(a.pct))

      const helixScore = student.profile?.helixScore ?? 0

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        quizAvg,
        examAvg,
        overallScore,
        helixScore,
        hasQuizSubmissions,
        hasExamRecords,
        isAtRisk,
        recentScores,
        chronologicalAssessments
      }
    })

    // Sort students by HELIX score / overallScore for ranking
    const sortedData = [...performanceData].sort((a, b) => b.helixScore !== a.helixScore ? b.helixScore - a.helixScore : b.overallScore - a.overallScore)
    const rankedData = sortedData.map((s, index) => ({ ...s, rank: index + 1 }))

    // Calculate Batch Average (mean of quiz averages for students with submissions)
    const studentsWithSubmissions = rankedData.filter(s => s.hasQuizSubmissions && s.quizAvg !== null)
    const batchAvg = studentsWithSubmissions.length > 0
      ? Math.round(studentsWithSubmissions.reduce((acc, s) => acc + (s.quizAvg || 0), 0) / studentsWithSubmissions.length)
      : null

    // Top percentile count (top 25% of class)
    const topCount = Math.max(1, Math.ceil(rankedData.length * 0.25))
    const topPercentileStudents = rankedData.slice(0, topCount)

    // At risk count
    const atRiskStudents = rankedData.filter(s => s.isAtRisk)

    // Max HELIX Score in class
    const maxHelixScore = Math.max(...rankedData.map(s => s.helixScore), 1)

    // Topic performance breakdown
    const topicScoresMap = new Map<string, number[]>()
    subject.studentEnrollments.forEach((en: any) => {
      en.student.quizAttempts.forEach((q: any) => {
        const topic = q.quiz?.topic || 'General'
        const maxScore = q.maxPossibleScore || 100
        const pct = maxScore > 0 ? (q.score / maxScore) * 100 : 0
        if (!topicScoresMap.has(topic)) topicScoresMap.set(topic, [])
        topicScoresMap.get(topic)!.push(pct)
      })
    })

    const topics = Array.from(topicScoresMap.entries()).map(([name, scores]) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      return {
        name,
        avgScore: avg,
        status: avg < 60 ? 'weak' : avg >= 80 ? 'strong' : 'normal'
      }
    })

    // Performance trends over time
    const allAssessmentsMap = new Map<string, { title: string; date: Date; scores: number[] }>()
    subject.studentEnrollments.forEach((en: any) => {
      en.student.quizAttempts.forEach((q: any) => {
        const key = `quiz_${q.quizId}`
        const maxScore = q.maxPossibleScore || 100
        const pct = maxScore > 0 ? (q.score / maxScore) * 100 : 0
        if (!allAssessmentsMap.has(key)) {
          allAssessmentsMap.set(key, { title: q.quiz.title, date: new Date(q.updatedAt), scores: [] })
        }
        allAssessmentsMap.get(key)!.scores.push(pct)
      })
      en.student.examRecords.forEach((e: any) => {
        const key = `exam_${e.title}`
        const pct = e.maxMarks > 0 ? (e.marks / e.maxMarks) * 100 : 0
        if (!allAssessmentsMap.has(key)) {
          allAssessmentsMap.set(key, { title: e.title, date: new Date(e.date), scores: [] })
        }
        allAssessmentsMap.get(key)!.scores.push(pct)
      })
    })

    const trends = Array.from(allAssessmentsMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => {
        const avg = Math.round(item.scores.reduce((a, b) => a + b, 0) / item.scores.length)
        const highest = Math.round(Math.max(...item.scores))
        const lowest = Math.round(Math.min(...item.scores))
        return {
          title: item.title,
          date: item.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          avg,
          highest,
          lowest
        }
      })

    return NextResponse.json({
      performance: rankedData,
      batchAvg: batchAvg !== null ? `${batchAvg}%` : 'No data',
      batchAvgNumber: batchAvg,
      topPercentileCount: topPercentileStudents.length,
      topPercentileStudents,
      atRiskCount: atRiskStudents.length,
      atRiskStudents,
      maxHelixScore,
      topics,
      trends
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
