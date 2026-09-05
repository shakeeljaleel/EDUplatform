import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!profile) {
      // If profile doesn't exist, create it (lazy initialization)
      const newProfile = await prisma.studentProfile.create({
        data: {
          userId: session.user.id,
          paymentStatus: 'Pending'
        }
      })
      return NextResponse.json({ profile: newProfile })
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
