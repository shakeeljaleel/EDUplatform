import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifySubjectMembers, notifyBatchMembers } from '@/lib/notifications'

// List quizzes for a given batch (via query param)
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batchId')

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 })
  }

  // Ensure user has access to this batch
  const enrollment = await prisma.batchEnrollment.findUnique({
    where: {
      userId_batchId: { userId: session.user.id, batchId: batchId }
    }
  })

  // SUPER_ADMIN has global access, TEACHER/STUDENT need enrollment
  if (session.user.role !== 'SUPER_ADMIN' && !enrollment) {
    return NextResponse.json({ error: 'Access denied to this batch' }, { status: 403 })
  }

  try {
    const subjectId = searchParams.get('subjectId')
    const statusFilter = session.user.role === 'STUDENT' ? { status: 'PUBLISHED' } : {}

    const quizzes = await prisma.quiz.findMany({
      where: {
        batchId: batchId,
        ...(subjectId ? { subjectId } : {}),
        ...statusFilter
      },
      include: {
        subject: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
        attempts: {
          where: { userId: session.user.id },
          select: { status: true, score: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ quizzes })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}

// Create a new quiz (Teachers/Super Admins only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { batchId, subjectId, title, chapter, topic, subtopic, scheduledDate } = data

    if (!batchId || !title) {
      return NextResponse.json({ error: 'Missing batchId or title' }, { status: 400 })
    }

    const quiz = await prisma.quiz.create({
      data: {
        batchId,
        subjectId: subjectId || null,
        title,
        chapter: chapter || null,
        topic: topic || null,
        subtopic: subtopic || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        status: 'DRAFT'
      }
    })

    // Notify participants
    try {
      if (subjectId) {
        const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } })
        await notifySubjectMembers(
          subjectId, 
          null, 
          'QUIZ_ADDED', 
          'New Quiz Posted', 
          `A new quiz "${title}" has been posted for ${subject?.name}.`
        )
      } else {
        await notifyBatchMembers(
          batchId, 
          'QUIZ_ADDED', 
          'General Quiz Posted', 
          `A new general quiz "${title}" has been posted for your batch.`
        )
      }
    } catch (notifyErr) {
      console.error('Quiz notification failed:', notifyErr)
    }

    return NextResponse.json({ success: true, quiz })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
