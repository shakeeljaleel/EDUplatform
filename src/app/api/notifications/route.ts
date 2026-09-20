import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - fetch unread notifications for current user
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, read: false },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  return NextResponse.json({ notifications })
}

// Helper to handle marking notifications as read
async function markNotificationsAsRead(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const notificationId = body.notificationId

    if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: session.user.id },
        data: { read: true }
      })
    } else {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  return markNotificationsAsRead(request)
}

export async function POST(request: Request) {
  return markNotificationsAsRead(request)
}

export async function PUT(request: Request) {
  return markNotificationsAsRead(request)
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.notification.deleteMany({
      where: { userId: session.user.id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
