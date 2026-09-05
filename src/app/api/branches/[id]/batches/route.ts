import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// List batches in a branch
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const batches = await prisma.batch.findMany({
    where: { branchId: id },
    include: {
      _count: { select: { subjects: true, enrollments: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json({ batches })
}

// Create batch in a branch
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const { name, academicLevel } = await request.json()
    if (!name || !academicLevel) return NextResponse.json({ error: 'Name and academic level required' }, { status: 400 })

    const batch = await prisma.batch.create({
      data: { name, academicLevel, branchId: id }
    })
    return NextResponse.json({ success: true, batch })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
