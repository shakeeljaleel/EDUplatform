import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { subjectId: id, status: 'active' },
      include: { student: { select: { id: true, name: true, email: true } } }
    })

    const students = enrollments.map(e => e.student)
    return NextResponse.json({ students })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
