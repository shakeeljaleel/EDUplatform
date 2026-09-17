import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list enrollments for a subject
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { subjectId: id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      branch: true,
      batch: true
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
  const { id: subjectId } = await params

  try {
    const body = await request.json()
    const branchId = body.branchId
    if (!branchId) return NextResponse.json({ error: 'Branch ID required' }, { status: 400 })

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        batch: true,
        branchTeachers: { include: { teacher: true } }
      }
    })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const enrollment = await prisma.studentEnrollment.upsert({
      where: { id: `enroll-${session.user.id}-${subjectId}` },
      update: { status: 'pending', branchId },
      create: {
        id: `enroll-${session.user.id}-${subjectId}`,
        studentId: session.user.id,
        batchId: subject.batchId,
        branchId,
        subjectId,
        status: 'pending'
      }
    })

    // Notify super admins
    const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } })
    for (const admin of superAdmins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'ENROLMENT_REQUEST',
          title: 'Subject Enrolment Request',
          message: `${session.user.name} has requested enrolment in ${subject.name} (${subject.batch.name}).`
        }
      })
    }

    return NextResponse.json({ success: true, enrollment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - teacher or admin approves or rejects an enrollment
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: subjectId } = await params

  try {
    const { enrollmentId, status } = await request.json() // status: "admin_approved" | "active" | "rejected"

    const enrollment = await prisma.studentEnrollment.update({
      where: { id: enrollmentId },
      data: { status },
      include: { student: true, subject: true }
    })

    await prisma.notification.create({
      data: {
        userId: enrollment.studentId,
        type: 'ENROLMENT_UPDATE',
        title: `Enrolment ${status.toUpperCase()}`,
        message: `Your enrolment request for ${enrollment.subject.name} is now ${status}.`
      }
    })

    return NextResponse.json({ success: true, enrollment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
