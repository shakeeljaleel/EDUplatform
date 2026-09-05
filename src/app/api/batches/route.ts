import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: 'desc' }
  })
  
  return NextResponse.json({ batches })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, academicLevel } = await request.json()

  if (!name || !academicLevel) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const batch = await prisma.batch.create({
    data: {
      name,
      academicLevel,
    }
  })

  return NextResponse.json({ batch })
}
