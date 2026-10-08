import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  try {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, batchId: true }
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Filter the student pool by the subject/quiz's batchId
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { 
        batchId: subject.batchId,
        status: { in: ['ACTIVE', 'active'] }
      },
      include: { 
        student: { 
          select: { id: true, name: true, email: true } 
        } 
      }
    })

    // Deduplicate students
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
