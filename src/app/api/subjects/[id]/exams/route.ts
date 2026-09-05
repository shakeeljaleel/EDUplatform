import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')

    const exams = await prisma.examRecord.findMany({
      where: { 
        subjectId: id,
        ...(title ? { title } : {})
      },
      include: { user: { select: { name: true } } },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json({ exams: title ? exams : exams, records: exams }) // Added 'records' for compatibility with my previous FE change
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const { userId, title, marks, maxMarks, date } = await request.json()
    
    const exam = await prisma.examRecord.create({
      data: {
        subjectId: id,
        userId,
        title,
        marks: parseFloat(marks),
        maxMarks: parseFloat(maxMarks || 100),
        date: date ? new Date(date) : new Date()
      }
    })

    return NextResponse.json({ success: true, exam })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
