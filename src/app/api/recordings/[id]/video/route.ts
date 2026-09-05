import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySignedStreamToken } from '@/lib/hmac'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: recordingId } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Stream token required' }, { status: 401 })
  }

  const verification = verifySignedStreamToken(token, recordingId)
  if (!verification.valid) {
    return NextResponse.json({ error: verification.error || 'Invalid or expired stream token' }, { status: 403 })
  }

  try {
    const recording = await prisma.recording.findUnique({ where: { id: recordingId } })
    if (!recording) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })

    // Safely redirect to server-stored Zoom/video URL for valid signed token requests
    return NextResponse.redirect(recording.videoUrl)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
