import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: quizId } = await params

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, batchId: true, subject: { select: { batchId: true } } }
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const batchId = quiz.batchId || quiz.subject?.batchId

    // Filter by the quiz's batchId with status ACTIVE
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        ...(batchId ? { batchId } : {}),
        status: { in: ['ACTIVE', 'active'] }
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    const studentMap = new Map<string, { id: string; name: string; email: string }>()
    for (const e of enrollments) {
      if (e.student && !studentMap.has(e.student.id)) {
        studentMap.set(e.student.id, e.student)
      }
    }

    const students = Array.from(studentMap.values())
    return NextResponse.json({ students })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
