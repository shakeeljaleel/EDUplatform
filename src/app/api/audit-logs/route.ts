import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const actorRole = searchParams.get('actorRole')

  const where: any = {}
  if (action) where.action = action
  if (actorRole) where.actorRole = actorRole

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  // Fetch actor user names for display
  const actorIds = Array.from(new Set(logs.map(l => l.actorId)))
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true }
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  const formatted = logs.map(l => ({
    ...l,
    actorName: userMap.get(l.actorId)?.name || 'System / Unknown',
    actorEmail: userMap.get(l.actorId)?.email || ''
  }))

  return NextResponse.json({ logs: formatted })
}
