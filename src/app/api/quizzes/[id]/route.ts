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

// Update Quiz (e.g., Publish)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const data = await request.json()
    const { status } = data

    const quiz = await prisma.quiz.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 })
  }
}
