import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const branches = await prisma.branch.findMany({
    include: {
      _count: { select: { batches: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json({ branches })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, location } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })

    const branch = await prisma.branch.create({
      data: { name: name.trim(), location: location?.trim() || null }
    })
    return NextResponse.json({ success: true, branch })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
