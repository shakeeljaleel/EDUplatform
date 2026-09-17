import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list all sessions for a subject
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const sessions = await prisma.classSession.findMany({
    where: { subjectId: id },
    include: { syllabusObjectives: true, quizzes: { select: { id: true, title: true, status: true } } },
    orderBy: { scheduledDate: 'asc' }
  })
  return NextResponse.json({ sessions })
}

// POST - create a new class session (teacher/admin)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const {
      title,
      description,
      scheduledDate,
      durationMins,
      syllabusCodes,
      classType,
      meetingLink,
      recordingAvailable,
      isRecurring,
      recurrenceRule,
      resourcesList,
      sendNotification = true,
      customNotificationMessage,
      alsoNotifyParents = true
    } = await request.json()

    if (!title || !scheduledDate) {
      return NextResponse.json({ error: 'Title and date required' }, { status: 400 })
    }

    // Parse syllabus codes
    const codes = syllabusCodes ? syllabusCodes.split(',').map((c: string) => c.trim()).filter(Boolean) : []
    const objectives = await prisma.syllabusObjective.findMany({
      where: { subjectId: id, code: { in: codes } }
    })

    const baseDate = new Date(scheduledDate)
    const sessionsToCreate: any[] = []

    if (isRecurring && recurrenceRule?.endDate) {
      const endDate = new Date(recurrenceRule.endDate)
      const days: number[] = recurrenceRule.days || [baseDate.getDay()]
      const frequency = recurrenceRule.frequency || 'Weekly' // Weekly, Fortnightly, Monthly
      
      let curr = new Date(baseDate)
      let count = 0
      const maxSessions = 52

      while (curr <= endDate && count < maxSessions) {
        if (days.includes(curr.getDay()) || count === 0) {
          sessionsToCreate.push(new Date(curr))
        }
        // Increment date
        if (frequency === 'Weekly') {
          curr.setDate(curr.getDate() + (count === 0 ? 1 : 1))
        } else if (frequency === 'Fortnightly') {
          curr.setDate(curr.getDate() + 14)
        } else if (frequency === 'Monthly') {
          curr.setMonth(curr.getMonth() + 1)
        } else {
          curr.setDate(curr.getDate() + 7)
        }
        count++
      }
    } else {
      sessionsToCreate.push(baseDate)
    }

    const createdSessions = []
    for (const date of sessionsToCreate) {
      const classSession = await prisma.classSession.create({
        data: {
          subjectId: id,
          title,
          description: description || null,
          scheduledDate: date,
          durationMins: durationMins || 60,
          status: 'SCHEDULED',
          classType: classType || 'PHYSICAL',
          meetingLink: meetingLink || null,
          recordingAvailable: !!recordingAvailable,
          isRecurring: !!isRecurring,
          recurrenceRule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
          syllabusCodes: syllabusCodes || null,
          resourcesList: resourcesList ? JSON.stringify(resourcesList) : null,
          syllabusObjectives: {
            connect: objectives.map(obj => ({ id: obj.id }))
          }
        }
      })
      createdSessions.push(classSession)
    }

    const firstSession = createdSessions[0]

    // Notifications
    if (sendNotification) {
      try {
        const enrollments = await prisma.studentEnrollment.findMany({
          where: { subjectId: id, status: 'active' },
          include: {
            student: {
              include: { profile: { include: { parent: { include: { user: true } } } } }
            }
          }
        })

        const dateStr = baseDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        const defaultMsg = `New class scheduled: ${title} on ${dateStr}. Duration: ${durationMins} mins.`
        const msgText = customNotificationMessage || defaultMsg

        const notifications: any[] = []
        for (const e of enrollments) {
          notifications.push({
            userId: e.studentId,
            type: 'CLASS_ADDED',
            title: `New class: ${title}`,
            message: msgText,
            classSessionId: firstSession.id
          })
          if (alsoNotifyParents) {
            const parentUser = e.student.profile?.parent?.user
            if (parentUser) {
              notifications.push({
                userId: parentUser.id,
                type: 'CLASS_ADDED',
                title: `New class scheduled for student: ${title}`,
                message: msgText,
                classSessionId: firstSession.id
              })
            }
          }
        }

        if (notifications.length > 0) {
          await prisma.notification.createMany({ data: notifications })
        }
      } catch (notifyErr) {
        console.error('Notification failed:', notifyErr)
      }
    }

    return NextResponse.json({ success: true, classSession: firstSession, totalCreated: createdSessions.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
