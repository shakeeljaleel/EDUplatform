import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      status: status.toLowerCase() === 'pending' ? { in: ['pending', 'PENDING'] } : status
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      batch: true,
      branch: true,
      subject: true
    },
    orderBy: { requestedAt: 'desc' }
  })

  return NextResponse.json({ enrollments })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id, action, selectedIds, ids } = body
  const targetIds: string[] = selectedIds || ids || (id ? [id] : [])

  if (targetIds.length === 0) {
    return NextResponse.json({ error: 'At least one enrollment ID is required' }, { status: 400 })
  }

  // Single database transaction
  const result = await prisma.studentEnrollment.updateMany({
    where: {
      id: { in: targetIds },
      status: { in: ['pending', 'PENDING'] }
    },
    data: {
      status: 'ACTIVE',
      adminApprovedAt: new Date()
    }
  })

  return NextResponse.json({
    success: true,
    count: result.count,
    message: `Successfully approved ${result.count} enrolments`
  })
}
