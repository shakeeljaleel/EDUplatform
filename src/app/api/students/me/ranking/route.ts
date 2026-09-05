import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const studentUserId = session.user.id

    // Get student's batch
    const enrollment = await prisma.batchEnrollment.findFirst({
      where: { userId: studentUserId },
      include: { batch: true }
    })

    if (!enrollment) return NextResponse.json({ error: 'No batch enrollment found' }, { status: 404 })

    const batchId = enrollment.batchId

    // Get all students in this batch
    const batchStudents = await prisma.batchEnrollment.findMany({
      where: { batchId: batchId, role: 'STUDENT' },
      select: { userId: true }
    })

    const studentIds = batchStudents.map(s => s.userId)

    // Calculate scores for all students in the batch
    // Ranking based on Stars + Quiz Avg + Exam Avg
    const rankings = await Promise.all(studentIds.map(async (id) => {
      const [profile, quizAttempts, exams] = await Promise.all([
        prisma.studentProfile.findUnique({ where: { userId: id } }),
        prisma.quizAttempt.findMany({ where: { userId: id, status: 'GRADED' }, select: { score: true } }),
        prisma.examRecord.findMany({ where: { userId: id }, select: { marks: true, maxMarks: true } })
      ])

      const quizAvg = quizAttempts.length > 0 
        ? quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizAttempts.length 
        : 0
      
      const examAvg = exams.length > 0
        ? exams.reduce((sum, e) => sum + (e.marks / (e.maxMarks || 1)) * 100, 0) / exams.length
        : 0

      const totalScore = (profile?.stars || 0) * 10 + quizAvg + examAvg

      return {
        userId: id,
        name: (await prisma.user.findUnique({ where: { id: id }, select: { name: true } }))?.name || 'Unknown',
        stars: profile?.stars || 0,
        quizAvg,
        examAvg,
        totalScore
      }
    }))

    // Sort by totalScore
    rankings.sort((a, b) => b.totalScore - a.totalScore)

    const myRank = rankings.findIndex(r => r.userId === studentUserId) + 1
    const totalStudents = rankings.length

    return NextResponse.json({
      rank: myRank,
      totalStudents,
      percentile: Math.round(((totalStudents - myRank) / totalStudents) * 100),
      topStudents: rankings.slice(0, 5)
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: 500 })
  }
}
