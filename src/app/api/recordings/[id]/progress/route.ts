import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: recordingId } = await params

  try {
    const progress = await prisma.recordingProgress.findUnique({
      where: { recordingId_userId: { recordingId, userId: session.user.id } }
    })

    const terms = await prisma.recordingTermsAcceptance.findUnique({
      where: { recordingId_userId: { recordingId, userId: session.user.id } }
    })

    return NextResponse.json({
      max_reached_seconds: progress?.maxReachedSeconds || 0,
      last_session_position_seconds: progress?.lastSessionPositionSeconds || 0,
      is_completed: progress?.isCompleted || false,
      terms_accepted: !!terms
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: recordingId } = await params

  try {
    const body = await request.json()
    const pos = Math.max(0, Math.floor(body.current_position_seconds || body.currentPositionSeconds || 0))

    const recording = await prisma.recording.findUnique({ where: { id: recordingId } })
    if (!recording) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })

    const existing = await prisma.recordingProgress.findUnique({
      where: { recordingId_userId: { recordingId, userId: session.user.id } }
    })

    const currentMax = existing?.maxReachedSeconds || 0
    // Monotonic increase constraint: maxReachedSeconds only ever increases
    const newMax = Math.max(currentMax, pos)
    
    // Check completion threshold
    const totalDuration = recording.duration || 1
    const isCompleted = existing?.isCompleted || newMax >= (totalDuration - 10) || (totalDuration > 0 && newMax / totalDuration >= 0.95)

    const updated = await prisma.recordingProgress.upsert({
      where: { recordingId_userId: { recordingId, userId: session.user.id } },
      create: {
        recordingId,
        userId: session.user.id,
        maxReachedSeconds: pos,
        lastSessionPositionSeconds: pos,
        isCompleted
      },
      update: {
        maxReachedSeconds: newMax,
        lastSessionPositionSeconds: pos,
        isCompleted
      }
    })

    return NextResponse.json({
      max_reached_seconds: updated.maxReachedSeconds,
      last_session_position_seconds: updated.lastSessionPositionSeconds,
      is_completed: updated.isCompleted
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
