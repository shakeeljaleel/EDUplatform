import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subjectBranchTeacherId, assistantId, permissions } = await req.json()

  if (!subjectBranchTeacherId || !assistantId) {
    return NextResponse.json({ error: 'subjectBranchTeacherId and assistantId are required' }, { status: 400 })
  }

  const sbt = await prisma.subjectBranchTeacher.findUnique({
    where: { id: subjectBranchTeacherId },
    include: {
      subject: { include: { batch: true } },
      branch: true,
      teacher: { select: { id: true, name: true } },
      assistants: true
    }
  })

  if (!sbt) {
    return NextResponse.json({ error: 'Teacher assignment not found' }, { status: 404 })
  }

  // Teacher can only assign assistant for their own class unless admin
  if (session.user.role === 'TEACHER' && sbt.teacherId !== session.user.id) {
    return NextResponse.json({ error: 'You can only assign assistants to your own classes' }, { status: 403 })
  }

  const permissionsJson = JSON.stringify(Array.isArray(permissions) ? permissions : [])

  // Check if assistant already exists for this subjectBranchTeacherId
  const existing = sbt.assistants.find(a => a.assistantId === assistantId)

  let assignment
  let isNew = false

  if (existing) {
    assignment = await prisma.subjectBranchTeacherAssistant.update({
      where: { id: existing.id },
      data: {
        permissions: permissionsJson,
        assignedByTeacherId: session.user.id
      },
      include: { assistant: { select: { name: true } } }
    })
  } else {
    // Strictly enforce one assistant per teacher per subject per branch
    if (sbt.assistants.length > 0) {
      // Remove previous assistant assignment for this teacher at this subject branch
      await prisma.subjectBranchTeacherAssistant.deleteMany({
        where: { subjectBranchTeacherId }
      })
    }

    assignment = await prisma.subjectBranchTeacherAssistant.create({
      data: {
        subjectBranchTeacherId,
        assistantId,
        permissions: permissionsJson,
        assignedByTeacherId: session.user.id
      },
      include: { assistant: { select: { name: true } } }
    })
    isNew = true
  }

  const permList = Array.isArray(permissions) && permissions.length > 0 ? permissions.join(', ') : 'None'

  if (isNew) {
    await prisma.notification.create({
      data: {
        userId: assistantId,
        type: 'ASSISTANT_ASSIGNED',
        title: 'Assigned as Assistant',
        message: `You have been assigned as assistant to ${sbt.teacher.name} for ${sbt.subject.name} in ${sbt.subject.batch.name} at ${sbt.branch.name}. Permissions: ${permList}`,
        link: '/dashboard/assistant'
      }
    })
  } else {
    await prisma.notification.create({
      data: {
        userId: assistantId,
        type: 'ASSISTANT_PERMISSIONS_UPDATED',
        title: 'Permissions Updated',
        message: `Your permissions for ${sbt.subject.name} at ${sbt.branch.name} have been updated by ${session.user.name || 'Teacher'}. Permissions: ${permList}`,
        link: '/dashboard/assistant'
      }
    })
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: isNew ? 'ASSIGN_ASSISTANT' : 'UPDATE_ASSISTANT_PERMISSIONS',
      targetType: 'ASSISTANT_ASSIGNMENT',
      targetId: assignment.id,
      details: JSON.stringify({
        subjectName: sbt.subject.name,
        branchName: sbt.branch.name,
        teacherName: sbt.teacher.name,
        assistantName: assignment.assistant.name,
        permissions
      })
    }
  })

  return NextResponse.json({ assignment })
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Assistant assignment ID is required' }, { status: 400 })
  }

  const assignment = await prisma.subjectBranchTeacherAssistant.findUnique({
    where: { id },
    include: {
      subjectBranchTeacher: {
        include: {
          subject: { include: { batch: true } },
          branch: true,
          teacher: { select: { name: true } }
        }
      },
      assistant: { select: { id: true, name: true } }
    }
  })

  if (!assignment) {
    return NextResponse.json({ error: 'Assistant assignment not found' }, { status: 404 })
  }

  await prisma.subjectBranchTeacherAssistant.delete({ where: { id } })

  const sbt = assignment.subjectBranchTeacher
  await prisma.notification.create({
    data: {
      userId: assignment.assistantId,
      type: 'ASSISTANT_REMOVED',
      title: 'Assistant Assignment Removed',
      message: `You have been removed from ${sbt.subject.name} in ${sbt.subject.batch.name} at ${sbt.branch.name}`,
      link: '/dashboard/assistant'
    }
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'REMOVE_ASSISTANT',
      targetType: 'ASSISTANT_ASSIGNMENT',
      targetId: id,
      details: JSON.stringify({
        subjectName: sbt.subject.name,
        branchName: sbt.branch.name,
        assistantName: assignment.assistant.name
      })
    }
  })

  return NextResponse.json({ success: true })
}
