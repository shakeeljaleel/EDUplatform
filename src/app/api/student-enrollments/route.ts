import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const batchId = searchParams.get('batchId')
  const branchId = searchParams.get('branchId')
  const studentId = searchParams.get('studentId')

  const whereClause: any = {}

  if (status) whereClause.status = status
  if (batchId) whereClause.batchId = batchId
  if (branchId) whereClause.branchId = branchId
  if (studentId) whereClause.studentId = studentId

  // If role is TEACHER, filter to subjects & branches taught by teacher
  if (session.user.role === 'TEACHER') {
    const teacherAssignments = await prisma.subjectBranchTeacher.findMany({
      where: { teacherId: session.user.id },
      select: { subjectId: true, branchId: true }
    })

    const OR = teacherAssignments.map(ta => ({
      subjectId: ta.subjectId,
      branchId: ta.branchId
    }))

    if (OR.length === 0) {
      return NextResponse.json({ enrollments: [] })
    }

    whereClause.OR = OR
  } else if (session.user.role === 'STUDENT') {
    whereClause.studentId = session.user.id
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: { select: { paymentStatus: true } }
        }
      },
      batch: true,
      branch: true,
      subject: {
        include: {
          branchTeachers: {
            include: {
              teacher: { select: { id: true, name: true } }
            }
          }
        }
      },
      confirmedByTeacher: { select: { id: true, name: true } }
    },
    orderBy: { requestedAt: 'desc' }
  })

  return NextResponse.json({ enrollments })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { batchId, branchId, subjectIds, isImport, studentId: targetStudentId } = await req.json()

  const studentId = (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') && targetStudentId
    ? targetStudentId
    : session.user.id

  if (!batchId || !branchId || !Array.isArray(subjectIds) || subjectIds.length === 0) {
    return NextResponse.json({ error: 'batchId, branchId, and subjectIds array are required' }, { status: 400 })
  }

  // Validate batch branch exists
  const bb = await prisma.batchBranch.findUnique({
    where: { batchId_branchId: { batchId, branchId } },
    include: { batch: true, branch: true }
  })

  if (!bb) {
    return NextResponse.json({ error: 'This batch does not run at the selected branch' }, { status: 400 })
  }

  // Validate subject teacher existence for selected branch
  for (const subId of subjectIds) {
    const teacherCount = await prisma.subjectBranchTeacher.count({
      where: { subjectId: subId, branchId }
    })
    if (teacherCount === 0) {
      const sub = await prisma.subject.findUnique({ where: { id: subId } })
      return NextResponse.json({
        error: `Subject '${sub?.name || subId}' does not have an assigned teacher at ${bb.branch.name} yet.`
      }, { status: 400 })
    }
  }

  const studentUser = await prisma.user.findUnique({ where: { id: studentId } })
  const createdEnrollments = []

  for (const subjectId of subjectIds) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) continue

    // Check existing
    const existing = await prisma.studentEnrollment.findFirst({
      where: { studentId, subjectId, branchId, batchId }
    })

    if (existing) {
      createdEnrollments.push(existing)
      continue
    }

    const initialStatus = isImport ? 'admin_approved' : 'pending'
    const now = new Date()

    const enrollment = await prisma.studentEnrollment.create({
      data: {
        studentId,
        subjectId,
        branchId,
        batchId,
        status: initialStatus,
        requestedAt: now,
        adminApprovedAt: isImport ? now : null
      }
    })

    createdEnrollments.push(enrollment)

    if (isImport) {
      // Direct Stage 2: notify teachers
      const assignedTeachers = await prisma.subjectBranchTeacher.findMany({
        where: { subjectId, branchId },
        select: { teacherId: true }
      })

      for (const t of assignedTeachers) {
        await prisma.notification.create({
          data: {
            userId: t.teacherId,
            type: 'TEACHER_CONFIRMATION_REQUEST',
            title: 'Confirm Student Enrolment',
            message: `${studentUser?.name || 'Student'} has been pre-approved by admin for ${subject.name}. Please confirm their enrolment.`,
            link: '/dashboard/teacher'
          }
        })
      }
    } else {
      // Stage 1: notify admin
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
        select: { id: true }
      })

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'STUDENT_ENROLLMENT_REQUESTED',
            title: 'New Enrolment Request',
            message: `${studentUser?.name || 'Student'} has requested to enrol in ${subject.name} — ${bb.batch.name} at ${bb.branch.name}`,
            link: '/dashboard/super-admin/batches'
          }
        })
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: isImport ? 'IMPORT_STUDENT_ENROLLMENT' : 'REQUEST_STUDENT_ENROLLMENT',
      targetType: 'STUDENT_ENROLLMENT',
      targetId: studentId,
      details: JSON.stringify({ batchId, branchId, subjectIds, isImport })
    }
  })

  return NextResponse.json({ enrollments: createdEnrollments })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action, rejectionReason } = await req.json()

  if (!id || !action) {
    return NextResponse.json({ error: 'Enrollment ID and action are required' }, { status: 400 })
  }

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true } },
      subject: true,
      batch: true,
      branch: true
    }
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Enrollment record not found' }, { status: 404 })
  }

  const now = new Date()

  if (action === 'ADMIN_APPROVE') {
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can approve stage 1' }, { status: 403 })
    }

    const updated = await prisma.studentEnrollment.update({
      where: { id },
      data: {
        status: 'admin_approved',
        adminApprovedAt: now
      }
    })

    // Notify student
    await prisma.notification.create({
      data: {
        userId: enrollment.studentId,
        type: 'ENROLLMENT_ADMIN_APPROVED',
        title: 'Enrolment Admin Approved',
        message: `Your enrolment in ${enrollment.subject.name} — ${enrollment.batch.name} at ${enrollment.branch.name} has been approved by Admin and is pending teacher confirmation.`,
        link: '/dashboard/student'
      }
    })

    // Stage 2: notify ALL assigned teachers for that subject at that branch
    const teachers = await prisma.subjectBranchTeacher.findMany({
      where: { subjectId: enrollment.subjectId, branchId: enrollment.branchId },
      select: { teacherId: true }
    })

    for (const t of teachers) {
      await prisma.notification.create({
        data: {
          userId: t.teacherId,
          type: 'TEACHER_CONFIRMATION_REQUEST',
          title: 'Confirm Student Enrolment',
          message: `${enrollment.student.name} has been approved by admin for ${enrollment.subject.name}. Please confirm their enrolment.`,
          link: '/dashboard/teacher'
        }
      })
    }

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'ADMIN_APPROVE_ENROLLMENT',
        targetType: 'STUDENT_ENROLLMENT',
        targetId: id,
        details: JSON.stringify({ studentName: enrollment.student.name, subjectName: enrollment.subject.name })
      }
    })

    return NextResponse.json({ enrollment: updated })
  }

  if (action === 'TEACHER_CONFIRM') {
    if (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to confirm' }, { status: 403 })
    }

    // First teacher to confirm activates the enrolment
    const updated = await prisma.studentEnrollment.update({
      where: { id },
      data: {
        status: 'active',
        teacherConfirmedAt: now,
        confirmedByTeacherId: session.user.id
      }
    })

    // Notify student
    await prisma.notification.create({
      data: {
        userId: enrollment.studentId,
        type: 'ENROLLMENT_ACTIVE',
        title: 'Enrolment Active!',
        message: `Your enrolment in ${enrollment.subject.name} — ${enrollment.batch.name} at ${enrollment.branch.name} has been confirmed by your teacher. You can now access your classes.`,
        link: '/dashboard/student'
      }
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'TEACHER_CONFIRM_ENROLLMENT',
        targetType: 'STUDENT_ENROLLMENT',
        targetId: id,
        details: JSON.stringify({ studentName: enrollment.student.name, subjectName: enrollment.subject.name })
      }
    })

    return NextResponse.json({ enrollment: updated })
  }

  if (action === 'REJECT') {
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can reject enrolments' }, { status: 403 })
    }

    const updated = await prisma.studentEnrollment.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason?.trim() || 'Criteria not met'
      }
    })

    // Notify student
    await prisma.notification.create({
      data: {
        userId: enrollment.studentId,
        type: 'ENROLLMENT_REJECTED',
        title: 'Enrolment Not Approved',
        message: `Your enrolment in ${enrollment.subject.name} was not approved. Reason: ${updated.rejectionReason}`,
        link: '/dashboard/student'
      }
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'REJECT_ENROLLMENT',
        targetType: 'STUDENT_ENROLLMENT',
        targetId: id,
        details: JSON.stringify({
          studentName: enrollment.student.name,
          subjectName: enrollment.subject.name,
          reason: updated.rejectionReason
        })
      }
    })

    return NextResponse.json({ enrollment: updated })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
