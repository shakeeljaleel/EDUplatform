import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// List batches in a branch
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const batchBranches = await prisma.batchBranch.findMany({
    where: { branchId: id },
    include: {
      batch: {
        include: {
          _count: { select: { subjects: true, studentEnrollments: true } }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
  const batches = batchBranches.map(bb => bb.batch)
  return NextResponse.json({ batches })
}

// Assign or create batch in a branch
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: branchId } = await params

  try {
    const { name, academicLevel } = await request.json()
    if (!name || !academicLevel) return NextResponse.json({ error: 'Name and academic level required' }, { status: 400 })

    const batch = await prisma.batch.create({
      data: { name, academicLevel }
    })

    await prisma.batchBranch.create({
      data: { batchId: batch.id, branchId }
    })

    return NextResponse.json({ success: true, batch })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
