import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendWarningEmail } from '@/lib/email'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, recordingId, reason } = await request.json()

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ error: 'A mandatory reason is required to reset student playback progress.' }, { status: 400 })
    }

    const student = await prisma.user.findUnique({ where: { id: userId } })
    const recording = await prisma.recording.findUnique({ where: { id: recordingId } })

    if (!student || !recording) {
      return NextResponse.json({ error: 'Student or Recording not found' }, { status: 404 })
    }

    // Reset student progress to 0
    await prisma.recordingProgress.upsert({
      where: { recordingId_userId: { recordingId, userId } },
      create: {
        recordingId,
        userId,
        maxReachedSeconds: 0,
        lastSessionPositionSeconds: 0,
        isCompleted: false
      },
      update: {
        maxReachedSeconds: 0,
        lastSessionPositionSeconds: 0,
        isCompleted: false
      }
    })

    // Permanently log admin reset action
    await prisma.adminProgressResetLog.create({
      data: {
        adminId: session.user.id,
        userId,
        recordingId,
        reason
      }
    })

    // Send notification email to student
    await sendWarningEmail(
      student.email,
      `Playback Progress Reset: ${recording.title}`,
      `Your progress for "${recording.title}" has been reset by your administrator (Reason: ${reason}). You may now watch the recording from the beginning.`
    )

    return NextResponse.json({ success: true, message: `Progress reset successfully for ${student.name}.` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
