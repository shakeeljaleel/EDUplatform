import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params

  // Verify session exists
  const session = await prisma.buzzerSession.findFirst({
    where: {
      OR: [
        { id: sessionId },
        { joinCode: sessionId.toLowerCase() }
      ]
    },
    include: {
      teams: { include: { members: true } },
      rounds: { orderBy: { order: 'asc' } }
    }
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    status: 'ready',
    sessionId: session.id,
    currentRound: session.rounds.find(r => r.status === 'OPEN') || null,
    teams: session.teams
  })
}
