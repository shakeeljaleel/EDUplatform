import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'
import bcrypt from 'bcryptjs'

// PATCH - Super Admin updates a user's approvalStatus, paymentStatus, or resets password
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const body = await request.json()
    const { approvalStatus, paymentStatus, newPassword } = body

    if (approvalStatus !== undefined) {
      if (!['APPROVED', 'REJECTED', 'PENDING'].includes(approvalStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      const user = await prisma.user.update({
        where: { id },
        data: { approvalStatus }
      })

      await logAdminAction({
        adminId: session.user.id,
        adminName: session.user.name,
        action: `USER_APPROVAL_${approvalStatus}`,
        targetUserId: user.id,
        details: `Updated approvalStatus to ${approvalStatus} for ${user.email}`
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

      await logAdminAction({
        adminId: session.user.id,
        adminName: session.user.name,
        action: 'UPDATE_PAYMENT_STATUS',
        targetUserId: id,
        details: `Updated payment status to ${paymentStatus}`
      })

      return NextResponse.json({ success: true, profile })
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      const passwordHash = await bcrypt.hash(newPassword, 10)
      const user = await prisma.user.update({
        where: { id },
        data: { passwordHash }
      })

      await logAdminAction({
        adminId: session.user.id,
        adminName: session.user.name,
        action: 'MANUAL_PASSWORD_RESET',
        targetUserId: user.id,
        details: `Manually reset password for ${user.email}`
      })

      return NextResponse.json({ success: true, message: 'Password reset successfully' })
    }

    return NextResponse.json({ error: 'No update parameters provided' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
