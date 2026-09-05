import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { id } = await params

  try {
    const data = await request.json()
    const { type, text, options, correctOption, points } = data

    if (!type || !text) {
      return NextResponse.json({ error: 'Type and text are required' }, { status: 400 })
    }

    const question = await prisma.question.create({
      data: {
        quizId: id,
        type,
        text,
        options: options ? JSON.stringify(options) : null,
        correctOption: correctOption ?? null,
        points: points || 10
      }
    })

    return NextResponse.json({ success: true, question })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
