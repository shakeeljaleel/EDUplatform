import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const timeframe = searchParams.get('timeframe') || 'all_time' // all_time, month, week
  const subjectId = searchParams.get('subjectId') || 'all'

  try {
    // Find active student enrollment to identify batch and branch
    const activeEnrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: session.user.id,
        status: { in: ['active', 'admin_approved', 'ACTIVE', 'APPROVED'] }
      }
    })

    if (!activeEnrollment) {
      return NextResponse.json({ leaderboard: [], currentStudentRank: null })
    }

    const { batchId, branchId } = activeEnrollment

    // Find all enrolled students in this batch and branch
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        batchId,
        branchId,
        status: { in: ['active', 'admin_approved', 'ACTIVE', 'APPROVED'] }
      },
      include: {
        student: {
          include: {
            profile: true,
            quizAttempts: {
              where: {
                status: 'GRADED',
                ...(subjectId !== 'all' ? { quiz: { subjectId } } : {})
              },
              select: {
                score: true,
                helixPointsAwarded: true,
                starsAwarded: true,
                medalAwarded: true,
                percentageScore: true
              }
            }
          }
        }
      }
    })

    const studentMap = new Map<string, any>()

    for (const e of enrollments) {
      const u = e.student
      if (!u) continue

      const p = u.profile
      let helixScore = p?.helixScore || 0
      let stars = p?.stars || p?.totalStars || 0
      let gold = p?.goldMedals || 0
      let silver = p?.silverMedals || 0
      let bronze = p?.bronzeMedals || 0

      // If subject filter is specified, compute score specifically for that subject
      if (subjectId !== 'all') {
        helixScore = 0
        stars = 0
        gold = 0
        silver = 0
        bronze = 0

        for (const att of u.quizAttempts) {
          helixScore += att.helixPointsAwarded || 0
          stars += att.starsAwarded || 0
          if (att.medalAwarded === 'gold') gold++
          else if (att.medalAwarded === 'silver') silver++
          else if (att.medalAwarded === 'bronze') bronze++
        }
      }

      studentMap.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email,
        stars,
        goldMedals: gold,
        silverMedals: silver,
        bronzeMedals: bronze,
        helixScore,
        isCurrentStudent: u.id === session.user.id
      })
    }

    let leaderboard = Array.from(studentMap.values())
    const hasScores = leaderboard.some(s => s.helixScore > 0 || s.stars > 0)

    if (hasScores) {
      leaderboard.sort((a, b) => b.helixScore - a.helixScore || b.stars - a.stars)
      leaderboard = leaderboard.map((item, idx) => ({ ...item, rank: idx + 1 }))
    } else {
      leaderboard = leaderboard.map(item => ({ ...item, rank: 0 }))
    }

    const currentStudentRank = leaderboard.find(s => s.isCurrentStudent)?.rank || 0

    return NextResponse.json({
      leaderboard,
      hasScores,
      currentStudentRank
    })

  } catch (error: any) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
