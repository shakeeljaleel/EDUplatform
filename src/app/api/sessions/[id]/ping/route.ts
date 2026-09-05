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
    const classSession = await prisma.classSession.findUnique({ where: { id } })
    if (!classSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Only log if within the time window (e.g. 15 mins before to class end)
    const now = new Date()
    const startTime = new Date(classSession.scheduledDate)
    const endTime = new Date(startTime.getTime() + classSession.durationMins * 60000)
    
    // Buffer: 30 mins before class starts
    const bufferStart = new Date(startTime.getTime() - 30 * 60000)

    if (now >= bufferStart && now <= endTime) {
      await prisma.attendanceRecord.upsert({
        where: { classSessionId_userId: { classSessionId: id, userId: session.user.id } },
        update: { status: 'ONLINE' },
        create: { classSessionId: id, userId: session.user.id, status: 'ONLINE' }
      })
      return NextResponse.json({ success: true, status: 'ONLINE' })
    }

    return NextResponse.json({ success: false, message: 'Outside class window' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
