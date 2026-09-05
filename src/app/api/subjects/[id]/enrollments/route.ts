import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list enrollments for a subject (Teacher sees pending/approved/rejected)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId: id },
    include: {
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json({ enrollments })
}

// POST - student requests to enroll in a subject
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only students can enroll' }, { status: 401 })
  }
  const { id } = await params

  try {
    const enrollment = await prisma.subjectEnrollment.upsert({
      where: { subjectId_userId: { subjectId: id, userId: session.user.id } },
      update: {},
      create: { subjectId: id, userId: session.user.id, status: 'PENDING' }
    })
    return NextResponse.json({ success: true, enrollment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - teacher approves or rejects an enrollment
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const { enrollmentId, status } = await request.json() // status: "APPROVED" | "REJECTED"

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Teachers must be assigned to this subject; Super Admin bypasses this check
    if (session.user.role === 'TEACHER') {
      const isTeacher = await prisma.subjectTeacher.findUnique({
        where: { subjectId_userId: { subjectId: id, userId: session.user.id } }
      })
      if (!isTeacher) return NextResponse.json({ error: 'You are not assigned to this subject' }, { status: 403 })
    }
    // SUPER_ADMIN can override any enrollment without restriction

    const enrollment = await prisma.subjectEnrollment.update({
      where: { id: enrollmentId },
      data: { status }
    })
    return NextResponse.json({ success: true, enrollment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
