import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: batchId } = await params

  try {
    // Get all students enrolled in this batch
    const students = await prisma.user.findMany({
      where: {
        enrollments: {
          some: { batchId }
        },
        role: 'STUDENT'
      },
      include: {
        profile: true,
        quizAttempts: {
          where: { quiz: { batchId } },
          include: { quiz: true }
        },
        examRecords: {
          where: { subject: { batchId } }
        }
      }
    })

    // Calculate performance metrics for each student
    const performanceData = students.map((student: any) => {
      // Quiz performance
      const quizScores = student.quizAttempts.map((q: any) => (q.score / (q.quiz?.maxMarks || 100)) * 100)
      const quizAvg = quizScores.length > 0 ? quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length : 0

      // Exam performance
      const examScores = student.examRecords.map((e: any) => (e.marks / (e.maxMarks || 100)) * 100)
      const examAvg = examScores.length > 0 ? examScores.reduce((a: number, b: number) => a + b, 0) / examScores.length : 0

      // Overall score (weighted: 40% quizzes, 60% exams)
      const overallScore = (quizAvg * 0.4) + (examAvg * 0.6)

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        level: student.profile?.level,
        studentId: student.profile?.studentId || student.id.slice(0, 8),
        quizAvg: Math.round(quizAvg),
        examAvg: Math.round(examAvg),
        overallScore: Math.round(overallScore),
        quizCount: student.quizAttempts.length,
        examCount: student.examRecords.length
      }
    })

    // Sort by overall score (Ranking)
    const sortedData = performanceData.sort((a, b) => b.overallScore - a.overallScore)
    
    // Assign ranks
    const rankedData = sortedData.map((s, index) => ({
      ...s,
      rank: index + 1
    }))

    return NextResponse.json({ performance: rankedData })
  } catch (error: any) {
    console.error('Performance API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
