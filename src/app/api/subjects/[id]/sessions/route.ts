import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifySubjectMembers } from '@/lib/notifications'

// GET - list all sessions for a subject
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const sessions = await prisma.classSession.findMany({
    where: { subjectId: id },
    include: { syllabusObjectives: true },
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
    const { title, description, scheduledDate, durationMins, syllabusCodes } = await request.json()
    if (!title || !scheduledDate) return NextResponse.json({ error: 'Title and date required' }, { status: 400 })

    // Parse syllabus codes
    const codes = syllabusCodes ? syllabusCodes.split(',').map((c: string) => c.trim()).filter(Boolean) : []
    const objectives = await prisma.syllabusObjective.findMany({
      where: { subjectId: id, code: { in: codes } }
    })

    const classSession = await prisma.classSession.create({
      data: {
        subjectId: id,
        title,
        description: description || null,
        scheduledDate: new Date(scheduledDate),
        durationMins: durationMins || 60,
        status: 'SCHEDULED',
        syllabusObjectives: {
          connect: objectives.map(obj => ({ id: obj.id }))
        }
      }
    })

    // Get subject name for notification
    const subject = await prisma.subject.findUnique({ where: { id }, select: { name: true } })
    const dateStr = new Date(scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

    try {
      await notifySubjectMembers(
        id, classSession.id,
        'CLASS_ADDED',
        `New class: ${title}`,
        `A new ${subject?.name} class has been scheduled — "${title}" on ${dateStr}.`
      )
    } catch (notifyErr) {
      console.error('Notification fan-out failed:', notifyErr)
      // We don't block the session creation if notifications fail
    }

    return NextResponse.json({ success: true, classSession })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
