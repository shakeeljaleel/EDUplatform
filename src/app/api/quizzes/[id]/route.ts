import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
        subject: { include: { batch: true } }
      }
    })

    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Hide correct answers from students if they haven't been graded yet (or just completely remove them)
    if (session.user.role === 'STUDENT') {
      quiz.questions = quiz.questions.map(q => {
        const { correctOption, ...safeQuestion } = q
        return safeQuestion as any
      })
    }

    return NextResponse.json({ quiz })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}

// Update Quiz Status (Publish / Unpublish / Close)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const data = await request.json()
    const { status, dueDate } = data

    const updateData: any = {}
    if (status) updateData.status = status
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

    const quiz = await prisma.quiz.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, quiz })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update quiz' }, { status: 500 })
  }
}

// Full Update Quiz (Draft edit)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const existing = await prisma.quiz.findUnique({
      where: { id },
      include: {
        attempts: { select: { id: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Unpublish the quiz first to edit it.' }, { status: 400 })
    }

    if (existing.attempts.length > 0) {
      return NextResponse.json({ error: 'Cannot edit quiz because student submissions exist.' }, { status: 400 })
    }

    const data = await request.json()
    const {
      title,
      topic,
      description,
      dueDate,
      timeLimitMins,
      allowOneAttempt,
      showAnswersAfterSubmission,
      markingMode,
      status,
      linkedSessionId,
      questions = []
    } = data

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 })
    }

    // Delete existing questions and replace with updated question set
    await prisma.question.deleteMany({
      where: { quizId: id }
    })

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        title: title.trim(),
        topic: topic !== undefined ? (topic?.trim() || null) : existing.topic,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        dueDate: dueDate ? new Date(dueDate) : null,
        timeLimitMins: timeLimitMins !== undefined ? (timeLimitMins ? Number(timeLimitMins) : null) : existing.timeLimitMins,
        allowOneAttempt: allowOneAttempt !== undefined ? !!allowOneAttempt : existing.allowOneAttempt,
        showAnswersAfterSubmission: showAnswersAfterSubmission !== undefined ? !!showAnswersAfterSubmission : existing.showAnswersAfterSubmission,
        markingMode: markingMode || existing.markingMode,
        status: status || existing.status,
        linkedSessionId: linkedSessionId !== undefined ? (linkedSessionId || null) : existing.linkedSessionId,
        questions: {
          create: questions.map((q: any, idx: number) => ({
            type: q.type || 'MCQ',
            text: q.text || '',
            options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
            correctOption: q.correctOption !== undefined ? q.correctOption : null,
            markScheme: q.markScheme || null,
            maxMarks: q.maxMarks || q.points || 10,
            points: q.maxMarks || q.points || 10,
            orderIndex: idx
          }))
        }
      },
      include: {
        questions: true,
        subject: true
      }
    })

    return NextResponse.json({ success: true, quiz: updated })
  } catch (error: any) {
    console.error('Update quiz error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update quiz' }, { status: 500 })
  }
}
