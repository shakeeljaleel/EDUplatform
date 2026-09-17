import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Get all students enrolled in the batch
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { 
        batchId: id,
        status: 'active'
      },
      include: {
        student: {
          include: {
            profile: true
          }
        }
      }
    })

    // Map and sort by stars (descending)
    const leaderboard = enrollments
      .map(e => ({
        id: e.student.id,
        name: e.student.name,
        stars: e.student.profile?.stars || 0,
        medals: e.student.profile?.medals || 0,
        scholarshipFlag: e.student.profile?.scholarshipFlag || false
      }))
      .sort((a, b) => b.stars - a.stars)

    return NextResponse.json({ leaderboard })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
