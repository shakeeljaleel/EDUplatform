import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET all security alerts for admin
export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alerts = await prisma.securityAlert.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ alerts })
}

// PATCH to resolve an alert
export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { alertId } = await request.json()
  const alert = await prisma.securityAlert.update({
    where: { id: alertId },
    data: { resolved: true }
  })
  return NextResponse.json({ alert })
}
