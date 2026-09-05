import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Teachers register as PENDING — must be approved by Super Admin
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'TEACHER',
        approvalStatus: 'PENDING'
      }
    })

    return NextResponse.json({ success: true, message: 'Registration submitted. You will be notified once an admin approves your account.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
