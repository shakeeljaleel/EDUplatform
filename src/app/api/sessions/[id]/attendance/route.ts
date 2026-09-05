import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Get all students enrolled in the subject this session belongs to
    const classSession = await prisma.classSession.findUnique({
      where: { id },
      include: {
        subject: {
          include: {
            enrollments: {
              where: { status: { in: ['APPROVED', 'ACTIVE'] } },
              include: { user: { select: { id: true, name: true, email: true } } }
            }
          }
        },
        attendance: true
      }
    })

    if (!classSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const students = classSession.subject.enrollments.map(e => ({
      ...e.user,
      attendanceStatus: classSession.attendance.find(a => a.userId === e.userId)?.status || 'ABSENT_PENDING'
    }))

    return NextResponse.json({ students })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const { userId, status } = await request.json()
    
    const record = await prisma.attendanceRecord.upsert({
      where: { classSessionId_userId: { classSessionId: id, userId } },
      update: { status },
      create: { classSessionId: id, userId, status }
    })

    return NextResponse.json({ success: true, record })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
