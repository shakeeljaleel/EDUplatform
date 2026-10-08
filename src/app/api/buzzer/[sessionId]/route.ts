import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifySubjectMembers } from '@/lib/notifications'

// Get live session state
export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { sessionId } = await params

  const buzzerSession = await prisma.buzzerSession.findFirst({
    where: {
      OR: [
        { id: sessionId },
        { joinCode: sessionId.toLowerCase() }
      ]
    },
    include: {
      teams: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } }
        },
        orderBy: { score: 'desc' }
      },
      rounds: {
        orderBy: { order: 'asc' },
        include: {
          winner: { select: { id: true, name: true } },
          buzzes: {
            orderBy: { buzzedAt: 'asc' },
            include: { user: { select: { id: true, name: true } } }
          }
        }
      }
    }
  })

  if (!buzzerSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Calculate clean teamScores, playerScores, and finalScores
  const playerScores: Record<string, number> = {}
  const teamScores: Record<string, number> = {}

  for (const team of buzzerSession.teams) {
    teamScores[team.id] = team.score
    for (const m of team.members) {
      playerScores[m.userId] = 0
    }
  }

  for (const r of buzzerSession.rounds) {
    if (r.status === 'JUDGED' && r.correct && r.winnerId) {
      playerScores[r.winnerId] = (playerScores[r.winnerId] || 0) + (r.points || 10)
    }
  }

  return NextResponse.json({
    session: {
      ...buzzerSession,
      teamScores,
      playerScores,
      finalScores: teamScores
    }
  })
}

// Teacher actions: start session, open/close round, judge answer, end session
export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { sessionId: rawId } = await params
  const buzzerSession = await prisma.buzzerSession.findFirst({
    where: { OR: [{ id: rawId }, { joinCode: rawId.toLowerCase() }] },
    include: { teams: { include: { members: true } } }
  })
  if (!buzzerSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  
  const sessionId = buzzerSession.id
  const { action, roundId, correct } = await request.json()

  if (action === 'START') {
    await prisma.buzzerSession.update({ where: { id: sessionId }, data: { status: 'ACTIVE' } })
    
    // BUG 2 FIX: Reset team score to 0 at session start
    await prisma.buzzerTeam.updateMany({
      where: { sessionId },
      data: { score: 0 }
    })

    // Notify students that live quiz is starting
    if (buzzerSession.subjectId) {
      try {
        await notifySubjectMembers(
          buzzerSession.subjectId,
          null,
          'LIVE_QUIZ_START',
          'Live Quiz Active!',
          `The live buzzer quiz "${buzzerSession.title}" has started. Join now with code: ${(buzzerSession.joinCode || '').toUpperCase()}`
        )
      } catch (notifyErr) {
        console.error('Buzzer start notification failed:', notifyErr)
      }
    }
  }
  else if (action === 'OPEN_ROUND') {
    await prisma.buzzerRound.updateMany({ where: { sessionId, status: 'OPEN' }, data: { status: 'JUDGED' } })
    await prisma.buzzerRound.update({ where: { id: roundId }, data: { status: 'OPEN' } })
  }
  else if (action === 'JUDGE') {
    const round = await prisma.buzzerRound.findUnique({
      where: { id: roundId },
      include: { buzzes: { orderBy: { buzzedAt: 'asc' }, take: 1, include: { user: true } } }
    })
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const firstBuzz = round.buzzes[0]
    const winnerId = (correct && firstBuzz) ? firstBuzz.userId : null

    await prisma.buzzerRound.update({
      where: { id: roundId },
      data: { status: 'JUDGED', correct: !!correct, winnerId }
    })

    // BUG 2 FIX: Team score should only add points when that team's member answers correctly.
    // Do NOT add points from other teams or from the question pool.
    // Recalculate accurately from the session's judged rounds to completely prevent double-counting.
    const sessionTeams = await prisma.buzzerTeam.findMany({
      where: { sessionId },
      include: { members: true }
    })
    const judgedRounds = await prisma.buzzerRound.findMany({
      where: { sessionId, status: 'JUDGED', correct: true }
    })

    for (const team of sessionTeams) {
      const memberUserIds = new Set(team.members.map(m => m.userId))
      const teamScore = judgedRounds
        .filter(r => r.winnerId && memberUserIds.has(r.winnerId))
        .reduce((sum, r) => sum + (r.points || 10), 0)

      await prisma.buzzerTeam.update({
        where: { id: team.id },
        data: { score: teamScore }
      })
    }
  }
  else if (action === 'END') {
    await prisma.buzzerSession.update({ where: { id: sessionId }, data: { status: 'ENDED' } })
    
    // AWARD POINTS TO WINNING TEAM MEMBERS
    const teams = await prisma.buzzerTeam.findMany({
      where: { sessionId },
      include: { members: true }
    })
    if (teams.length > 0) {
      const topScore = Math.max(...teams.map(t => t.score))
      if (topScore > 0) {
        const winningTeams = teams.filter(t => t.score === topScore)
        const winningUserIds = winningTeams.flatMap(t => t.members.map(m => m.userId))
        
        // Award 10 stars to each winning student
        await prisma.studentProfile.updateMany({
          where: { userId: { in: winningUserIds } },
          data: { stars: { increment: 10 } }
        })
      }
    }
  }

  const updated = await prisma.buzzerSession.findUnique({
    where: { id: sessionId },
    include: {
      teams: { include: { members: { include: { user: { select: { id: true, name: true } } } } }, orderBy: { score: 'desc' } },
      rounds: { orderBy: { order: 'asc' }, include: { winner: { select: { id: true, name: true } }, buzzes: { orderBy: { buzzedAt: 'asc' }, include: { user: { select: { id: true, name: true } } } } } }
    }
  })

  // Calculate clean teamScores and playerScores
  const playerScores: Record<string, number> = {}
  const teamScores: Record<string, number> = {}

  if (updated) {
    for (const team of updated.teams) {
      teamScores[team.id] = team.score
      for (const m of team.members) {
        playerScores[m.userId] = 0
      }
    }

    for (const r of updated.rounds) {
      if (r.status === 'JUDGED' && r.correct && r.winnerId) {
        playerScores[r.winnerId] = (playerScores[r.winnerId] || 0) + (r.points || 10)
      }
    }
  }

  return NextResponse.json({
    session: updated ? {
      ...updated,
      teamScores,
      playerScores,
      finalScores: teamScores
    } : null
  })
}

// DELETE past session
export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { sessionId } = await params

  await prisma.buzzerSession.delete({
    where: { id: sessionId }
  })

  return NextResponse.json({ success: true })
}

// Student BUZZ action
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { sessionId: rawId } = await params
  const buzzerSession = await prisma.buzzerSession.findFirst({
    where: { OR: [{ id: rawId }, { joinCode: rawId.toLowerCase() }] }
  })
  if (!buzzerSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  
  const sessionId = buzzerSession.id
  const { roundId } = await request.json()

  const round = await prisma.buzzerRound.findFirst({
    where: { id: roundId, sessionId, status: 'OPEN' }
  })
  if (!round) return NextResponse.json({ error: 'No open round to buzz' }, { status: 400 })

  const existing = await prisma.buzzerBuzz.findUnique({
    where: { roundId_userId: { roundId, userId: session.user.id } }
  })
  if (existing) {
    // If student already buzzed, return their status cleanly instead of 400 error
    const firstBuzz = await prisma.buzzerBuzz.findFirst({
      where: { roundId },
      orderBy: { buzzedAt: 'asc' }
    })
    const isFirst = firstBuzz?.userId === session.user.id
    return NextResponse.json({ buzz: existing, isFirst, alreadyBuzzed: true })
  }

  const buzz = await prisma.buzzerBuzz.create({
    data: { roundId, userId: session.user.id, buzzedAt: new Date() },
    include: { user: { select: { id: true, name: true } } }
  })

  const firstBuzz = await prisma.buzzerBuzz.findFirst({
    where: { roundId },
    orderBy: { buzzedAt: 'asc' }
  })
  const isFirst = firstBuzz?.userId === session.user.id

  return NextResponse.json({ buzz, isFirst })
}
