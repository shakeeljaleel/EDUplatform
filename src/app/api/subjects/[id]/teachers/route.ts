import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list teachers assigned to a subject
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const teachers = await prisma.subjectBranchTeacher.findMany({
    where: { subjectId: id },
    include: { teacher: { select: { id: true, name: true, email: true } }, branch: true }
  })
  return NextResponse.json({ teachers })
}

// POST - assign a teacher to a subject at a branch (Super Admin only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params

  try {
    const { teacherId, branchId } = await request.json()
    if (!teacherId || !branchId) return NextResponse.json({ error: 'teacherId and branchId required' }, { status: 400 })

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { batch: true }
    })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const teacher = await prisma.subjectBranchTeacher.create({
      data: {
        subjectId,
        branchId,
        teacherId
      },
      include: { teacher: { select: { id: true, name: true, email: true } }, branch: true }
    })

    const studentCount = await prisma.studentEnrollment.count({
      where: { subjectId, branchId }
    })

    await prisma.notification.create({
      data: {
        userId: teacherId,
        type: 'TEACHER_ASSIGNMENT',
        title: 'Subject Assignment Update',
        message: `You have been assigned to teach ${subject.name} in ${subject.batch.name}. You have ${studentCount} students enrolled at this branch.`
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
  const teacherId = searchParams.get('teacherId')
  const branchId = searchParams.get('branchId')

  try {
    if (teacherId && branchId) {
      await prisma.subjectBranchTeacher.deleteMany({
        where: { subjectId, teacherId, branchId }
      })
    } else {
      await prisma.subjectBranchTeacher.deleteMany({
        where: { subjectId }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
