import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const branches = await prisma.branch.findMany({
    include: {
      batches: {
        select: {
          id: true,
          name: true,
          academicLevel: true,
          _count: { select: { enrollments: true, subjects: true } }
        }
      },
      _count: { select: { batches: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  const formatted = branches.map(b => {
    const studentCount = b.batches.reduce((sum, batch) => sum + (batch._count?.enrollments || 0), 0)
    return {
      ...b,
      studentCount
    }
  })

  return NextResponse.json({ branches: formatted })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, location, type } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        location: location?.trim() || null,
        type: type === 'Online' ? 'Online' : 'Physical'
      }
    })
    return NextResponse.json({ success: true, branch })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
