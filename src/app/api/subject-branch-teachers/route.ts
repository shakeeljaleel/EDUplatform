import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subjectId, branchId, teacherId } = await req.json()

  if (!subjectId || !branchId || !teacherId) {
    return NextResponse.json({ error: 'Subject ID, Branch ID, and Teacher ID are required' }, { status: 400 })
  }

  // Check unique constraint: same teacher cannot be assigned twice to same subject at same branch
  const existing = await prisma.subjectBranchTeacher.findUnique({
    where: {
      subjectId_branchId_teacherId: { subjectId, branchId, teacherId }
    }
  })

  if (existing) {
    return NextResponse.json({ error: 'This teacher is already assigned to this subject at this branch' }, { status: 400 })
  }

  const assignment = await prisma.subjectBranchTeacher.create({
    data: {
      subjectId,
      branchId,
      teacherId,
      assignedBy: session.user.id
    },
    include: {
      subject: { include: { batch: true } },
      branch: true,
      teacher: { select: { id: true, name: true, email: true } }
    }
  })

  // Notify assigned teacher
  await prisma.notification.create({
    data: {
      userId: teacherId,
      type: 'TEACHER_ASSIGNED',
      title: 'New Subject Assignment',
      message: `You have been assigned to teach ${assignment.subject.name} in ${assignment.subject.batch.name} at ${assignment.branch.name}`,
      link: '/dashboard/teacher'
    }
  })

  // Log in Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'ASSIGN_TEACHER_TO_SUBJECT_BRANCH',
      targetType: 'SUBJECT_BRANCH_TEACHER',
      targetId: assignment.id,
      details: JSON.stringify({
        subjectName: assignment.subject.name,
        branchName: assignment.branch.name,
        teacherName: assignment.teacher.name
      })
    }
  })

  return NextResponse.json({ assignment })
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const checkOnly = searchParams.get('checkOnly') === 'true'

  if (!id) {
    return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
  }

  const assignment = await prisma.subjectBranchTeacher.findUnique({
    where: { id },
    include: {
      subject: { include: { batch: true } },
      branch: true,
      teacher: { select: { id: true, name: true } },
      assistants: true
    }
  })

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  // Count total teachers for this subject at this branch
  const count = await prisma.subjectBranchTeacher.count({
    where: {
      subjectId: assignment.subjectId,
      branchId: assignment.branchId
    }
  })

  const isOnlyTeacher = count <= 1

  if (checkOnly) {
    return NextResponse.json({ isOnlyTeacher, hasAssistant: assignment.assistants.length > 0 })
  }

  // Deleting teacher automatically removes their assistant due to cascade onDelete in prisma schema,
  // but let's notify assistant if present
  for (const ast of assignment.assistants) {
    await prisma.notification.create({
      data: {
        userId: ast.assistantId,
        type: 'ASSISTANT_REMOVED',
        title: 'Assistant Assignment Removed',
        message: `You have been removed from ${assignment.subject.name} in ${assignment.subject.batch.name} at ${assignment.branch.name}`,
        link: '/dashboard/assistant'
      }
    })
  }

  await prisma.subjectBranchTeacher.delete({ where: { id } })

  // Send notification to teacher
  await prisma.notification.create({
    data: {
      userId: assignment.teacherId,
      type: 'TEACHER_REMOVED',
      title: 'Subject Assignment Removed',
      message: `You have been removed from ${assignment.subject.name} in ${assignment.subject.batch.name} at ${assignment.branch.name}`,
      link: '/dashboard/teacher'
    }
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'REMOVE_TEACHER_FROM_SUBJECT_BRANCH',
      targetType: 'SUBJECT_BRANCH_TEACHER',
      targetId: id,
      details: JSON.stringify({
        subjectName: assignment.subject.name,
        branchName: assignment.branch.name,
        teacherName: assignment.teacher.name,
        wasOnlyTeacher: isOnlyTeacher
      })
    }
  })

  return NextResponse.json({ success: true, isOnlyTeacher })
}
