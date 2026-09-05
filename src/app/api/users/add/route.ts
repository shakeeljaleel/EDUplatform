import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { name, email, password, address, phone, batchId } = data

    if (!name || !email || !password || !batchId) {
      return NextResponse.json({ error: 'Name, email, password, and batch are required.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash,
        role: 'STUDENT',
        profile: {
          create: {
            address: address || '',
            phone: phone || '',
          }
        }
      }
    })

    // Enroll in batch
    await prisma.batchEnrollment.upsert({
      where: {
        userId_batchId: {
          userId: user.id,
          batchId: batchId
        }
      },
      update: {},
      create: {
        userId: user.id,
        batchId: batchId,
        role: 'STUDENT'
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('Manual student add error:', error)
    return NextResponse.json({ error: error.message || 'Failed to add student' }, { status: 500 })
  }
}
