import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateSignedStreamToken } from '@/lib/hmac'
import { headers } from 'next/headers'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: recordingId } = await params

  try {
    const recording = await prisma.recording.findUnique({ where: { id: recordingId } })
    if (!recording) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.accountDisabled || user.recordingAccessRevoked) {
      return NextResponse.json({ error: 'Recording access revoked by administrator.' }, { status: 403 })
    }

    if (session.user.role === 'STUDENT') {
      const enrollment = await prisma.subjectEnrollment.findFirst({
        where: { subjectId: recording.subjectId, userId: session.user.id, status: { in: ['APPROVED', 'ACTIVE'] } }
      })
      if (!enrollment) return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })

      const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } })
      if (!profile || profile.paymentStatus !== 'Paid') {
        return NextResponse.json({ error: 'Payment required to stream recordings' }, { status: 403 })
      }
    }

    const sessionToken = session.sessionToken || 'session_' + session.user.id
    const { token, expiresAt } = generateSignedStreamToken(session.user.id, recordingId, sessionToken, 3600)

    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Log recording stream access event
    await prisma.recordingStreamLog.create({
      data: {
        recordingId,
        userId: session.user.id,
        sessionToken,
        ipAddress,
        userAgent
      }
    })

    // Audit multi-IP stream access in last 60 minutes
    const sixtyMinsAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentLogs = await prisma.recordingStreamLog.findMany({
      where: {
        userId: session.user.id,
        recordingId,
        createdAt: { gte: sixtyMinsAgo }
      },
      select: { ipAddress: true }
    })

    const uniqueIps = Array.from(new Set(recentLogs.map(l => l.ipAddress)))
    if (uniqueIps.length > 1) {
      await prisma.securityAlert.create({
        data: {
          userId: session.user.id,
          type: 'SHARE_ATTEMPT',
          message: `Recording "${recording.title}" stream token accessed from ${uniqueIps.length} different IPs within 60 mins. IPs: ${uniqueIps.join(', ')}`
        }
      }).catch(() => {})
    }

    const signedStreamUrl = `/api/recordings/${recordingId}/video?token=${token}`

    return NextResponse.json({ signedStreamUrl, expiresAt })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
