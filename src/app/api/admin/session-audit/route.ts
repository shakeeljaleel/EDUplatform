import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendWarningEmail } from '@/lib/email'

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountDisabled: true,
        recordingAccessRevoked: true,
        activeSession: { select: { token: true, deviceId: true, ipAddress: true, createdAt: true } },
        loginLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const auditData = users.map(user => {
      const logsLast7Days = user.loginLogs.filter(l => new Date(l.createdAt) >= sevenDaysAgo)
      const logsLast24Hours = user.loginLogs.filter(l => new Date(l.createdAt) >= twentyFourHoursAgo)
      
      const uniqueIpsIn24h = Array.from(new Set(logsLast24Hours.map(l => l.ipAddress)))
      const isFlagged = uniqueIpsIn24h.length > 3
      const lastLogin = user.loginLogs[0]

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountDisabled: user.accountDisabled,
        recordingAccessRevoked: user.recordingAccessRevoked,
        hasActiveSession: !!user.activeSession,
        lastLoginTime: lastLogin ? lastLogin.createdAt : null,
        lastIp: lastLogin ? lastLogin.ipAddress : (user.activeSession?.ipAddress || 'None'),
        lastDevice: lastLogin ? lastLogin.deviceType : (user.activeSession?.deviceId || 'Unknown'),
        loginCount7Days: logsLast7Days.length,
        uniqueIps24hCount: uniqueIpsIn24h.length,
        isFlagged
      }
    })

    return NextResponse.json({ sessions: auditData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, action, reason, warningMessage } = await request.json()

    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (action === 'FORCE_LOGOUT') {
      await prisma.activeSession.delete({ where: { userId } }).catch(() => {})
      await sendWarningEmail(
        targetUser.email,
        'Account Session Terminated',
        warningMessage || 'An administrator has force-logged out your active session due to security monitoring.'
      )
      return NextResponse.json({ message: `User ${targetUser.name} has been logged out successfully.` })
    }

    if (action === 'REVOKE_RECORDINGS') {
      await prisma.user.update({
        where: { id: userId },
        data: { recordingAccessRevoked: true }
      })
      await sendWarningEmail(
        targetUser.email,
        'Recording Access Revoked',
        warningMessage || 'Your access to class video recordings has been revoked by the administrator pending security review.'
      )
      return NextResponse.json({ message: `Recording access revoked for ${targetUser.name}.` })
    }

    if (action === 'DISABLE_ACCOUNT') {
      await prisma.user.update({
        where: { id: userId },
        data: { accountDisabled: true }
      })
      await prisma.activeSession.delete({ where: { userId } }).catch(() => {})
      await sendWarningEmail(
        targetUser.email,
        'Account Suspended',
        warningMessage || 'Your HELIX account has been suspended pending security review. Contact support for assistance.'
      )
      return NextResponse.json({ message: `Account ${targetUser.name} has been suspended.` })
    }

    if (action === 'RESTORE_ACCESS') {
      await prisma.user.update({
        where: { id: userId },
        data: { accountDisabled: false, recordingAccessRevoked: false }
      })
      return NextResponse.json({ message: `Account access restored for ${targetUser.name}.` })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
