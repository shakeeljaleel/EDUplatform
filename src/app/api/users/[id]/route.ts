import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// PATCH - Super Admin updates a user's approvalStatus or role
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const body = await request.json()
    const { approvalStatus, paymentStatus } = body

    if (approvalStatus !== undefined) {
      if (!['APPROVED', 'REJECTED', 'PENDING'].includes(approvalStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      const user = await prisma.user.update({
        where: { id },
        data: { approvalStatus }
      })

      return NextResponse.json({ success: true, user: { id: user.id, name: user.name, approvalStatus: user.approvalStatus } })
    }

    if (paymentStatus !== undefined) {
      if (!['Paid', 'Pending'].includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
      }

      const profile = await prisma.studentProfile.upsert({
        where: { userId: id },
        update: { paymentStatus },
        create: { userId: id, paymentStatus }
      })

      return NextResponse.json({ success: true, profile })
    }

    return NextResponse.json({ error: 'No update parameters provided' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
