import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: recordingId } = await params

  try {
    const { durationAway } = await request.json()
    const duration = Math.max(1, Math.floor(durationAway || 0))

    const log = await prisma.recordingFocusLog.create({
      data: {
        recordingId,
        userId: session.user.id,
        durationAway: duration
      }
    })

    return NextResponse.json({ success: true, log })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
