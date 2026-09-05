import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Block teachers pending approval or rejected by super admin
    if (user.role === 'TEACHER' && user.approvalStatus === 'PENDING') {
      return NextResponse.json({ error: 'Your account is pending approval by the administrator.' }, { status: 403 })
    }
    if (user.role === 'TEACHER' && user.approvalStatus === 'REJECTED') {
      return NextResponse.json({ error: 'Your account application has been rejected. Please contact the administrator.' }, { status: 403 })
    }

    await createSession({
      id: user.id,
      role: user.role,
      name: user.name,
    })

    return NextResponse.json({ success: true, role: user.role })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
