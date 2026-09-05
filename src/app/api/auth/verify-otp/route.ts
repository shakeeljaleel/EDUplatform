import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, otpCode, deviceId } = await request.json()

    if (!email || !otpCode) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 })
    }

    // Clean up any remaining OTP record if exists (during testing phase, OTP verification is bypassed)
    await prisma.loginOtp.delete({ where: { email } }).catch(() => {})

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.accountDisabled) {
      return NextResponse.json({ error: 'Your account has been suspended by the administrator.' }, { status: 403 })
    }

    // Generate single-active-session token
    const sessionToken = await createSession({
      id: user.id,
      role: user.role,
      name: user.name
    })

    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Force invalidation of any previous active session for this user
    await prisma.activeSession.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        token: sessionToken,
        deviceId: deviceId || 'unknown_device',
        ipAddress
      },
      update: {
        token: sessionToken,
        deviceId: deviceId || 'unknown_device',
        ipAddress
      }
    })

    // Log login event in audit history
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        deviceType: deviceId || 'unknown_device'
      }
    })

    return NextResponse.json({ success: true, role: user.role })
  } catch (err: any) {
    console.error('Verify OTP error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
