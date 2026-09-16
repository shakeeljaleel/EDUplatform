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
  const { id: subjectId } = await params

  try {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        batch: true,
        teachers: { include: { user: true } }
      }
    })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const enrollment = await prisma.subjectEnrollment.upsert({
      where: { subjectId_userId: { subjectId, userId: session.user.id } },
      update: { status: 'PENDING' },
      create: { subjectId, userId: session.user.id, status: 'PENDING' }
    })

    // Ensure student is also in batch enrollments
    await prisma.batchEnrollment.upsert({
      where: { userId_batchId: { userId: session.user.id, batchId: subject.batchId } },
      update: {},
      create: { userId: session.user.id, batchId: subject.batchId, role: 'STUDENT' }
    })

    // Notify super admins (student name, batch name, AND subject name)
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

    // Notify ONLY the teacher(s) assigned to this specific subject
    for (const st of subject.teachers) {
      await prisma.notification.create({
        data: {
          userId: st.userId,
          type: 'ENROLMENT_REQUEST',
          title: 'Subject Enrolment Request',
          message: `New student ${session.user.name} requested enrolment in your subject ${subject.name} (${subject.batch.name}).`
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
    const { enrollmentId, status } = await request.json() // status: "APPROVED" | "REJECTED" | "ACTIVE"

    if (!['APPROVED', 'REJECTED', 'ACTIVE', 'ADMIN_APPROVED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        batch: true,
        teachers: true
      }
    })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    // Teachers must be assigned to this subject; Super Admin bypasses this check
    if (session.user.role === 'TEACHER') {
      const isTeacher = await prisma.subjectTeacher.findUnique({
        where: { subjectId_userId: { subjectId, userId: session.user.id } }
      })
      if (!isTeacher) return NextResponse.json({ error: 'You are not assigned to this subject' }, { status: 403 })
    }

    const enrollment = await prisma.subjectEnrollment.update({
      where: { id: enrollmentId },
      data: { status },
      include: { user: true }
    })

    // Notify student
    await prisma.notification.create({
      data: {
        userId: enrollment.userId,
        type: 'ENROLMENT_UPDATE',
        title: `Subject Enrolment ${status}`,
        message: `Your enrolment in ${subject.name} (${subject.batch.name}) is now ${status.toLowerCase()}.`
      }
    })

    // Notify ONLY the teacher(s) of this specific subject if approved
    if (status === 'APPROVED' || status === 'ACTIVE') {
      for (const st of subject.teachers) {
        if (st.userId !== session.user.id) {
          await prisma.notification.create({
            data: {
              userId: st.userId,
              type: 'ENROLMENT_CONFIRMED',
              title: 'Enrolment Confirmed',
              message: `Student ${enrollment.user.name} enrolment confirmed in ${subject.name} (${subject.batch.name}).`
            }
          })
        }
      }
    }

    return NextResponse.json({ success: true, enrollment })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
