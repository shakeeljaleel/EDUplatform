import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Helper to notify members
async function notifySubjectMembers(
  subjectId: string,
  classSessionId: string,
  type: string,
  title: string,
  message: string
) {
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId, status: { in: ['APPROVED', 'ACTIVE'] } },
    include: {
      user: {
        include: { profile: { include: { parent: { include: { user: true } } } } }
      }
    }
  })

  const notifications: any[] = []
  for (const e of enrollments) {
    notifications.push({ userId: e.userId, type, title, message, classSessionId })
    const parentUser = e.user.profile?.parent?.user
    if (parentUser) notifications.push({ userId: parentUser.id, type, title, message, classSessionId })
  }
  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}

// PATCH - Edit, reschedule, or cancel a session, or mark it TAUGHT
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const { title, description, scheduledDate, durationMins, status, cancelReason, syllabusCodes } = await request.json()
    
    // Get existing session to compare
    const existing = await prisma.classSession.findUnique({
      where: { id },
      include: { subject: { select: { name: true } } }
    })
    
    if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (durationMins) updateData.durationMins = durationMins
    if (cancelReason) updateData.cancelReason = cancelReason

    if (syllabusCodes !== undefined) {
      const codes = syllabusCodes.split(',').map((c: string) => c.trim()).filter(Boolean)
      const objectives = await prisma.syllabusObjective.findMany({
        where: { subjectId: existing.subjectId, code: { in: codes } }
      })
      updateData.syllabusObjectives = {
        set: objectives.map(obj => ({ id: obj.id }))
      }
    }
    
    let notifyType = null
    let notifyMessage = ''

    if (scheduledDate && new Date(scheduledDate).getTime() !== existing.scheduledDate.getTime()) {
      updateData.scheduledDate = new Date(scheduledDate)
      updateData.status = 'RESCHEDULED'
      notifyType = 'CLASS_RESCHEDULED'
      const newDateStr = updateData.scheduledDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      notifyMessage = `The ${existing.subject.name} class "${existing.title}" has been rescheduled to ${newDateStr}.`
    }

    if (status) {
      updateData.status = status
      if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
        notifyType = 'CLASS_CANCELLED'
        notifyMessage = `The ${existing.subject.name} class "${existing.title}" has been cancelled. Reason: ${cancelReason || 'Not specified'}.`
      } else if (status === 'TAUGHT') {
        updateData.taughtAt = new Date()
        // We might not notify for "TAUGHT" unless specifically requested
      }
    }

    const updated = await prisma.classSession.update({
      where: { id },
      data: updateData
    })

    if (notifyType) {
      try {
        await notifySubjectMembers(existing.subjectId, id, notifyType, 'Class Update', notifyMessage)
      } catch (notifyErr) {
        console.error('Notification update failed:', notifyErr)
      }
    }

    return NextResponse.json({ success: true, session: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
