import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can approve enrolments' }, { status: 403 })
  }

  const body = await req.json()
  const selectedIds: string[] = body.selectedIds || body.ids || []

  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return NextResponse.json({ error: 'selectedIds array is required' }, { status: 400 })
  }

  // Processes all selected IDs in one database transaction
  const result = await prisma.studentEnrollment.updateMany({
    where: {
      id: { in: selectedIds },
      status: { in: ['pending', 'PENDING'] }
    },
    data: {
      status: 'ACTIVE',
      adminApprovedAt: new Date()
    }
  })

  try {
    const approved = await prisma.studentEnrollment.findMany({
      where: { id: { in: selectedIds } },
      include: { subject: true, batch: true }
    })

    for (const e of approved) {
      if (e.studentId) {
        await prisma.notification.create({
          data: {
            userId: e.studentId,
            type: 'ENROLLMENT_ADMIN_APPROVED',
            title: 'Enrolment Approved',
            message: `Your enrolment in ${e.subject?.name || 'Subject'} — ${e.batch?.name || 'Batch'} has been approved!`,
            link: '/dashboard/student'
          }
        }).catch(() => {})
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'BULK_ADMIN_APPROVE_ENROLLMENTS',
        targetType: 'STUDENT_ENROLLMENT',
        targetId: selectedIds.join(','),
        details: JSON.stringify({ count: result.count, ids: selectedIds })
      }
    }).catch(() => {})
  } catch {}

  return NextResponse.json({
    success: true,
    count: result.count,
    message: `Successfully approved ${result.count} enrolments`
  })
}

export async function PATCH(req: Request) {
  return POST(req)
}
