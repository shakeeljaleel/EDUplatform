import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifySubjectMembers } from '@/lib/notifications'

// GET - List quizzes for a given subject or batch
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const batchId = searchParams.get('batchId')

  if (!subjectId && !batchId) {
    return NextResponse.json({ error: 'subjectId or batchId is required' }, { status: 400 })
  }

  try {
    const statusFilter = session.user.role === 'STUDENT' ? { status: { in: ['PUBLISHED', 'CLOSED'] } } : {}

    const quizzes = await prisma.quiz.findMany({
      where: {
        ...(subjectId ? { subjectId } : {}),
        ...(batchId ? { batchId } : {}),
        ...statusFilter
      },
      include: {
        subject: { select: { id: true, name: true, colour: true } },
        linkedSession: { select: { id: true, title: true, scheduledDate: true } },
        _count: { select: { questions: true, attempts: true } },
        questions: { select: { id: true, points: true, maxMarks: true } },
        attempts: {
          where: session.user.role === 'STUDENT' ? { userId: session.user.id } : undefined,
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
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

// POST - Create a new quiz with questions (Teacher/Super Admin)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const {
      subjectId,
      batchId,
      branchId,
      linkedSessionId,
      title,
      topic,
      description,
      dueDate,
      showAnswersAfterSubmission = true,
      status = 'DRAFT',
      questions = []
    } = data

    if (!title) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 })
    }

    const quiz = await prisma.quiz.create({
      data: {
        subjectId: subjectId || null,
        batchId: batchId || null,
        branchId: branchId || null,
        teacherId: session.user.id,
        linkedSessionId: linkedSessionId || null,
        title,
        topic: topic || null,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        showAnswersAfterSubmission: !!showAnswersAfterSubmission,
        status: status || 'DRAFT',
        questions: {
          create: questions.map((q: any, idx: number) => ({
            type: q.type || 'MCQ',
            text: q.text,
            options: q.options ? JSON.stringify(q.options) : null,
            correctOption: q.correctOption ?? null,
            markScheme: q.markScheme || null,
            maxMarks: q.maxMarks || q.points || 10,
            points: q.maxMarks || q.points || 10,
            orderIndex: idx
          }))
        }
      },
      include: {
        questions: true,
        linkedSession: true
      }
    })

    // If published immediately, send notification
    if (status === 'PUBLISHED' && subjectId) {
      try {
        const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } })
        const dueStr = dueDate ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No due date'
        await notifySubjectMembers(
          subjectId,
          null,
          'QUIZ_ADDED',
          `New quiz published: ${title}`,
          `A new quiz "${title}" has been published for ${subject?.name}. Due: ${dueStr}.`
        )
      } catch (err) {
        console.error('Quiz notification error:', err)
      }
    }

    return NextResponse.json({ success: true, quiz })
  } catch (error: any) {
    console.error('Create quiz error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
