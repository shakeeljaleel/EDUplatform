import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')

  const users = await prisma.user.findMany({
    where: role ? { role } : {},
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true, 
      approvalStatus: true, 
      createdAt: true,
      profile: {
        select: { paymentStatus: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ users })
}
