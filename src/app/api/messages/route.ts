import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifyUser } from '@/lib/notifications'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const url = new URL(request.url)
  const otherUserId = url.searchParams.get('userId')

  try {
    if (otherUserId) {
      // Get conversation
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId, recipientId: otherUserId },
            { senderId: otherUserId, recipientId: userId }
          ]
        },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true, role: true } } }
      })
      
      // Mark as read
      await prisma.directMessage.updateMany({
        where: { senderId: otherUserId, recipientId: userId, read: false },
        data: { read: true }
      })
      
      return NextResponse.json({ messages })
    } else {
      // Get list of contacts who we have conversed with, or students if teacher
      const allMsgs = await prisma.directMessage.findMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          recipient: { select: { id: true, name: true, role: true } }
        }
      })
      
      const contactsMap = new Map()
      allMsgs.forEach(m => {
        const other = m.senderId === userId ? m.recipient : m.sender
        if (!contactsMap.has(other.id)) {
          contactsMap.set(other.id, {
            user: other,
            lastMessage: m.content,
            date: m.createdAt,
            unread: m.recipientId === userId && !m.read ? 1 : 0
          })
        } else if (m.recipientId === userId && !m.read) {
          contactsMap.get(other.id).unread++
        }
      })
      
      return NextResponse.json({ contacts: Array.from(contactsMap.values()) })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const senderId = session.user.id

  try {
    const { recipientId, content } = await request.json()

    // Validate no student-to-student messaging
    if (session.user.role === 'STUDENT') {
      const recipient = await prisma.user.findUnique({ where: { id: recipientId } })
      if (recipient?.role === 'STUDENT') {
        return NextResponse.json({ error: 'Student to student messaging is not allowed.' }, { status: 403 })
      }
    }

    const message = await prisma.directMessage.create({
      data: { senderId, recipientId, content }
    })

    // Notify recipient
    try {
      await notifyUser(
        recipientId,
        'NEW_MESSAGE',
        `New Message from ${session.user.name}`,
        content.length > 50 ? content.substring(0, 50) + '...' : content
      )
    } catch (notifyErr) {
      console.error('Message notification failed:', notifyErr)
    }

    return NextResponse.json({ message })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
