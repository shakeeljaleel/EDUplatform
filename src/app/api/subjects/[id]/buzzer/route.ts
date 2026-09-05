import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifySubjectMembers } from '@/lib/notifications'

// ── Buzzer Session CRUD ──────────────────────────────────────────────────────

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  const sessions = await prisma.buzzerSession.findMany({
    where: { subjectId },
    include: {
      host: { select: { name: true } },
      teams: { include: { members: { include: { user: { select: { id: true, name: true } } } } } },
      rounds: { orderBy: { order: 'asc' } }
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ sessions })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  const { title, teams, questions } = await request.json()
  const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  const joinCode = `${slug}${Math.floor(1000 + Math.random() * 9000)}`

  try {
    const buzzerSession = await prisma.buzzerSession.create({
      data: {
        subjectId,
        hostId: session.user.id,
        title,
        joinCode,
        teams: {
          create: teams.map((t: any) => ({
            name: t.name,
            color: t.color || '#059669',
            members: {
              create: (t.memberIds || []).map((uid: string) => ({ userId: uid }))
            }
          }))
        },
        rounds: {
          create: questions.map((q: string, i: number) => ({
            question: q,
            order: i,
            points: 10
          }))
        }
      },
      include: {
        teams: { include: { members: { include: { user: { select: { id: true, name: true } } } } } },
        rounds: { orderBy: { order: 'asc' } }
      }
    })

    // Notify subject members
    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } })
    try {
      await notifySubjectMembers(
        subjectId,
        null,
        'LIVE_QUIZ_ADDED',
        'New Live Quiz Posted',
        `A new live buzzer quiz "${title}" has been created for ${subject?.name}. Join Code: ${joinCode.toUpperCase()}`
      )
    } catch (notifyErr) {
      console.error('Buzzer creation notification failed:', notifyErr)
    }

    return NextResponse.json({ session: buzzerSession })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
