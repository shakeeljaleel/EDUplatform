import { prisma } from '@/lib/prisma'

export async function logAdminAction({
  adminId,
  adminName,
  action,
  targetUserId,
  details
}: {
  adminId: string
  adminName: string
  action: string
  targetUserId?: string
  details?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action,
        targetUserId: targetUserId || null,
        details: details || null,
      }
    })
  } catch (err) {
    console.error('Failed to create audit log:', err)
  }
}
