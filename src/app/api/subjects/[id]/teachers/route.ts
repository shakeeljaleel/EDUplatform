import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list teachers assigned to a subject
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const teachers = await prisma.subjectTeacher.findMany({
    where: { subjectId: id },
    include: { user: { select: { id: true, name: true, email: true } } }
  })
  return NextResponse.json({ teachers })
}

// POST - assign a teacher to a subject (Super Admin only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const teacher = await prisma.subjectTeacher.upsert({
      where: { subjectId_userId: { subjectId: id, userId } },
      update: {},
      create: { subjectId: id, userId }
    })
    return NextResponse.json({ success: true, teacher })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
