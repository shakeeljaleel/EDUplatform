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

    const sessionWithStats = await Promise.all(
      sessions.map(async (sess) => {
        const records = await prisma.examRecord.findMany({
          where: { subjectId, title: sess.title }
        })

        let date = sess.createdAt
        let studentsSat = 0
        let avgScore = 0
        let highestScore = 0
        let lowestScore = 0

        if (records.length > 0) {
          date = records[0].date
          studentsSat = records.length
          const percentages = records.map(r => Math.round((r.marks / r.maxMarks) * 100))
          highestScore = Math.max(...percentages)
          lowestScore = Math.min(...percentages)
          const sum = percentages.reduce((a, b) => a + b, 0)
          avgScore = Math.round(sum / percentages.length)
        }

        return {
          ...sess,
          date,
          stats: {
            studentsSat,
            avgScore,
            highestScore,
            lowestScore
          }
        }
      })
    )

    return NextResponse.json({ sessions: sessionWithStats })
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('id')
  const title = searchParams.get('title')

  try {
    if (sessionId) {
      const examSess = await prisma.examSession.findUnique({ where: { id: sessionId } })
      if (examSess) {
        await prisma.examRecord.deleteMany({ where: { subjectId, title: examSess.title } })
        await prisma.examSession.delete({ where: { id: sessionId } })
      }
    } else if (title) {
      await prisma.examRecord.deleteMany({ where: { subjectId, title } })
      await prisma.examSession.deleteMany({ where: { subjectId, title } })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete exam session' }, { status: 500 })
  }
}

