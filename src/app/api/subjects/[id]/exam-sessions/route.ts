import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params

  try {
    const sessions = await prisma.examSession.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ sessions })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch exam sessions' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params

  try {
    const { title, date, maxMarks, highlights, lows, suggestions, marks } = await request.json()

    // 1. Create or Update Exam Session Insights
    const examSession = await prisma.examSession.upsert({
      where: {
        subjectId_title: { subjectId, title }
      },
      update: {
        highlights,
        lows,
        suggestions,
        updatedAt: new Date()
      },
      create: {
        subjectId,
        title,
        highlights,
        lows,
        suggestions
      }
    })

    // 2. Create Bulk Exam Records
    if (marks && Array.isArray(marks)) {
      const records = marks
        .filter((m: any) => m.rawMarks !== '' && !isNaN(parseFloat(m.rawMarks)))
        .map((m: any) => ({
          subjectId,
          userId: m.userId,
          title,
          marks: parseFloat(m.rawMarks),
          maxMarks: parseFloat(maxMarks),
          date: new Date(date),
          grade: m.grade || null
        }))

      // Use a transaction to ensure atomic updates
      await prisma.$transaction([
        // Delete existing records for this exam title to avoid duplicates
        prisma.examRecord.deleteMany({
          where: { subjectId, title }
        }),
        prisma.examRecord.createMany({
          data: records
        })
      ])
    }

    return NextResponse.json({ examSession })
  } catch (err: any) {
    console.error('Exam Session Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save exam session' }, { status: 500 })
  }
}
