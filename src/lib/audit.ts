import { prisma } from '@/lib/prisma'

export async function logAdminAction({
  adminId,
  adminName,
  action,
  targetUserId,
  details
}: {
  adminId: string
  adminName?: string
  action: string
  targetUserId?: string
  details?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'SUPER_ADMIN',
        action,
        targetType: targetUserId ? 'USER' : null,
        targetId: targetUserId || null,
        details: details || null,
      }
    })
  } catch (err) {
    console.error('Failed to create audit log:', err)
  }
}

