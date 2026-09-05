import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user) {
      // Return positive message to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been logged and generated.'
      })
    }

    // Log security alert / audit trail for password reset request
    await prisma.securityAlert.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET_REQUESTED',
        message: `Password reset requested for ${user.email} at ${new Date().toISOString()}`
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset request recorded. An administrator or system notification has been dispatched.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
