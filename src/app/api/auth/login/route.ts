import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import { createSession, deleteSession } from '@/lib/auth'
import { validateEnv } from '@/lib/env'

export async function POST(request: Request) {
  try {
    // 1. Audit Environment Variables Upfront
    const envValidation = validateEnv()
    if (!envValidation.valid) {
      console.error('[VERCEL_AUTH_ERROR] Environment validation failed!')
      console.error('[VERCEL_AUTH_ERROR] Missing variables:', envValidation.details.missingVars)
      return NextResponse.json(
        {
          error: 'Server configuration error: Required environment variables are missing or invalid.',
          missingVariables: envValidation.details.missingVars
        },
        { status: 500 }
      )
    }

    // 2. Pre-clear Stale or Expired Session Cookie Unconditionally
    try {
      await deleteSession()
    } catch (cookieErr) {
      console.warn('[AUTH_COOKIE_CLEANUP_WARN] Failed to clear session cookie:', cookieErr)
    }

    // 3. Parse Request Payload
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    console.log('[LOGIN_ATTEMPT] Processing authentication for:', cleanEmail)

    // 4. Query Database case-insensitively with explicit select including passwordHash
    let user = null
    try {
      user = await prisma.user.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          approvalStatus: true,
          accountDisabled: true
        }
      })
    } catch (dbErr: any) {
      console.error('[VERCEL_DB_CONNECTION_ERROR] Failed to query PostgreSQL database:', {
        message: dbErr?.message,
        code: dbErr?.code
      })
      return NextResponse.json(
        {
          error: 'Database connection failure: Unable to reach database server. Please try again.',
          details: dbErr?.message || 'Database query failed'
        },
        { status: 500 }
      )
    }

    // Detailed diagnostic logs
    console.log('[LOGIN_DIAGNOSTIC] User found:', !!user)
    console.log('[LOGIN_DIAGNOSTIC] User role:', user?.role)
    console.log('[LOGIN_DIAGNOSTIC] Password hash exists:', !!user?.passwordHash)

    if (!user || !user.passwordHash) {
      console.log('[LOGIN_DIAGNOSTIC] Failed: User or passwordHash missing for', cleanEmail)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const passwordMatch = await bcryptjs.compare(password, user.passwordHash)
    console.log('[LOGIN_DIAGNOSTIC] Password valid:', passwordMatch)

    if (!passwordMatch) {
      console.log('[LOGIN_DIAGNOSTIC] Failed: Password mismatch for', cleanEmail)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Check if account is disabled by admin
    if (user.accountDisabled) {
      console.log('[LOGIN_DIAGNOSTIC] Failed: Account disabled for', cleanEmail)
      return NextResponse.json({ error: 'Your account has been suspended by the administrator.' }, { status: 403 })
    }

    // Block teachers pending approval or rejected by super admin
    if (user.role === 'TEACHER' && user.approvalStatus === 'PENDING') {
      console.log('[LOGIN_DIAGNOSTIC] Failed: Teacher approval pending for', cleanEmail)
      return NextResponse.json({ error: 'Your account is pending approval by the administrator.' }, { status: 403 })
    }
    if (user.role === 'TEACHER' && user.approvalStatus === 'REJECTED') {
      console.log('[LOGIN_DIAGNOSTIC] Failed: Teacher application rejected for', cleanEmail)
      return NextResponse.json({ error: 'Your account application has been rejected. Please contact the administrator.' }, { status: 403 })
    }

    // Extract Request Headers safely
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // 5. Generate Signed Session & Set Cookie
    const sessionToken = await createSession({
      id: user.id,
      role: user.role,
      name: user.name
    })

    // 6. Persistent Single Active Session Enforcement in DB
    try {
      await prisma.activeSession.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          token: sessionToken,
          deviceId: userAgent || 'unknown_device',
          ipAddress
        },
        update: {
          token: sessionToken,
          deviceId: userAgent || 'unknown_device',
          ipAddress
        }
      })
    } catch (sessionErr: any) {
      console.error('[VERCEL_AUTH_ERROR] ActiveSession DB upsert failed:', sessionErr)
    }

    // 7. Log login event in audit history
    try {
      await prisma.loginAuditLog.create({
        data: {
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent,
          deviceType: userAgent || 'unknown_device'
        }
      })
    } catch (logErr) {
      console.error('Non-critical login audit log failed:', logErr)
    }

    console.log('[LOGIN_SUCCESS] Successfully authenticated', cleanEmail, 'as', user.role)

    return NextResponse.json({
      success: true,
      role: user.role,
      token: sessionToken,
      session: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('[VERCEL_LOGIN_ERROR]', {
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack
    })

    return NextResponse.json(
      { error: error?.message || 'Authentication failed due to a server error. Please try again.' },
      { status: 500 }
    )
  }
}
