import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'

async function ensureDefaultUsers() {
  try {
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      console.log('Seeding initial default users...')
      const adminHash = await bcrypt.hash('admin123', 10)
      const studentHash = await bcrypt.hash('password123', 10)

      await prisma.user.createMany({
        data: [
          { name: 'Super Admin', email: 'admin@eduplatform.com', passwordHash: adminHash, role: 'SUPER_ADMIN', approvalStatus: 'APPROVED' },
          { name: 'Ms. Smith', email: 'teacher@test.com', passwordHash: adminHash, role: 'TEACHER', approvalStatus: 'APPROVED' },
          { name: 'Test Student', email: 'student1@test.com', passwordHash: studentHash, role: 'STUDENT', approvalStatus: 'APPROVED' },
          { name: 'Ahmed Khan', email: 'student2@test.com', passwordHash: studentHash, role: 'STUDENT', approvalStatus: 'APPROVED' },
          { name: 'Parent User', email: 'parent@test.com', passwordHash: studentHash, role: 'PARENT', approvalStatus: 'APPROVED' },
        ],
      })
      console.log('Default users successfully seeded!')
    }
  } catch (err) {
    console.error('Auto-seed check failed:', err)
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Auto-seed default users on fresh database deployments
    await ensureDefaultUsers()

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
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
