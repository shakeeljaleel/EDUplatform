import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list all subjects for a batch
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const subjects = await prisma.subject.findMany({
      where: { batchId: id },
      include: {
        _count: { select: { quizzes: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({ subjects })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }
}

// POST - create a new subject in a batch
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })

    const subject = await prisma.subject.create({
      data: { name: name.trim(), batchId: id }
    })
    return NextResponse.json({ success: true, subject })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
