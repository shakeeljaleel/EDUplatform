import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'

// Mark recording as started watching / completed
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: recordingId } = await params

  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'

  try {
    const { deviceId, completed, lat, lng } = await request.json()

    const recording = await prisma.recording.findUnique({ where: { id: recordingId } })
    if (!recording) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })

    // Check: student enrolled + paid
    const enrollment = await prisma.subjectEnrollment.findFirst({
      where: { subjectId: recording.subjectId, userId: session.user.id, status: { in: ['APPROVED', 'ACTIVE'] } }
    })
    if (!enrollment) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile || profile.paymentStatus !== 'Paid') {
      return NextResponse.json({ error: 'Payment required. Recording access is restricted to enrolled students with active tuition payments.' }, { status: 403 })
    }

    // Active session validation: block concurrent streaming & shared password sessions
    if (session.sessionToken) {
      const activeSession = await prisma.activeSession.findUnique({
        where: { userId: session.user.id }
      })
      if (activeSession && activeSession.token !== session.sessionToken) {
        await prisma.securityAlert.create({
          data: {
            userId: session.user.id,
            type: 'ACCOUNT_SHARING_ATTEMPT',
            message: `Student "${session.user.name}" attempted recording access from a concurrent/secondary session. Potential credential sharing detected from IP: ${ipAddress}`
          }
        })
        return NextResponse.json({ error: 'Concurrent login or active session mismatch detected. Recording access blocked to prevent account sharing. Admin has been alerted.' }, { status: 403 })
      }
    }

    // Check existing access record
    const existing = await prisma.recordingAccess.findUnique({
      where: { recordingId_userId: { recordingId, userId: session.user.id } }
    })

    // One-time watch: if already completed, block access
    if (existing?.completed) {
      return NextResponse.json({ error: 'This recording has already been watched. One-time access policy.' }, { status: 403 })
    }

    // Device fingerprint check
    if (existing?.deviceId && deviceId && existing.deviceId !== deviceId) {
      // Unknown device — raise security alert
      await prisma.securityAlert.create({
        data: {
          userId: session.user.id,
          type: 'UNKNOWN_DEVICE',
          message: `Student accessed recording "${recording.title}" from an unrecognised device. Known: ${existing.deviceId}, New: ${deviceId}`
        }
      })
      return NextResponse.json({ error: 'Unrecognised device. Access blocked. Admin has been alerted.' }, { status: 403 })
    }

    // Location anomaly check (>100km from first access)
    if (existing?.lat && lat && existing?.lng && lng) {
      const distKm = getDistanceKm(existing.lat, existing.lng, lat, lng)
      if (distKm > 100) {
        await prisma.securityAlert.create({
          data: {
            userId: session.user.id,
            type: 'UNUSUAL_LOCATION',
            message: `Student accessed recording "${recording.title}" from unusual location (${distKm.toFixed(0)}km from registered location). IP: ${ipAddress}`
          }
        })
        return NextResponse.json({ error: 'Unusual location detected. Access blocked. Admin has been alerted.' }, { status: 403 })
      }
    }

    // Upsert access record
    const access = await prisma.recordingAccess.upsert({
      where: { recordingId_userId: { recordingId, userId: session.user.id } },
      create: {
        recordingId,
        userId: session.user.id,
        watchedAt: new Date(),
        completed: completed || false,
        deviceId,
        ipAddress,
        lat: lat || null,
        lng: lng || null
      },
      update: {
        completed: completed || false,
        ...(lat && { lat }),
        ...(lng && { lng })
      }
    })

    return NextResponse.json({ access })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Haversine distance in km
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLng = deg2rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
function deg2rad(deg: number) { return deg * (Math.PI / 180) }
