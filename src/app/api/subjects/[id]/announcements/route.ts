import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const announcements = await prisma.announcement.findMany({
      where: { subjectId: id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ announcements })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const { title, content } = await request.json()
    const announcement = await prisma.announcement.create({
      data: {
        subjectId: id,
        authorId: session.user.id,
        title,
        content
      }
    })
    return NextResponse.json({ announcement })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
