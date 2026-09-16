import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list teachers assigned to a subject
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const teachers = await prisma.subjectTeacher.findMany({
    where: { subjectId: id },
    include: { user: { select: { id: true, name: true, email: true } } }
  })
  return NextResponse.json({ teachers })
}

// POST - assign a teacher to a subject (Super Admin only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params

  try {
    const { userId, force } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { batch: true }
    })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    // Check if this teacher is already assigned to a subject in the SAME batch
    const existingAssignment = await prisma.subjectTeacher.findFirst({
      where: {
        userId,
        subject: { batchId: subject.batchId }
      },
      include: { subject: true }
    })

    if (existingAssignment && existingAssignment.subjectId !== subjectId) {
      if (!force) {
        return NextResponse.json({
          warning: true,
          existingSubjectId: existingAssignment.subjectId,
          existingSubjectName: existingAssignment.subject.name,
          message: `This teacher is already assigned to ${existingAssignment.subject.name} in this batch. Reassign?`
        })
      }

      // If force, remove from existing subject assignment in this batch
      await prisma.subjectTeacher.delete({
        where: { id: existingAssignment.id }
      })
    }

    // Each subject has one teacher - remove previous teacher if any
    await prisma.subjectTeacher.deleteMany({
      where: { subjectId }
    })

    const teacher = await prisma.subjectTeacher.create({
      data: {
        subjectId,
        userId,
        assignedBy: session.user.id,
        assignedAt: new Date()
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    })

    const studentCount = await prisma.subjectEnrollment.count({
      where: { subjectId }
    })

    await prisma.notification.create({
      data: {
        userId,
        type: 'TEACHER_ASSIGNMENT',
        title: 'Subject Assignment Update',
        message: `You have been assigned to teach ${subject.name} in ${subject.batch.name}. You have ${studentCount} students enrolled.`
      }
    })

    return NextResponse.json({ success: true, teacher })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - remove a teacher from a subject
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  try {
    if (userId) {
      await prisma.subjectTeacher.deleteMany({
        where: { subjectId, userId }
      })
    } else {
      await prisma.subjectTeacher.deleteMany({
        where: { subjectId }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
