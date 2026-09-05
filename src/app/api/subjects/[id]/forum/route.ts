import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Basic profanity filter
const PROFANITY_LIST = ['badword1', 'badword2', 'idiot', 'stupid', 'damn'] // Simplified for demo
const containsProfanity = (text: string) => {
  const lower = text.toLowerCase()
  return PROFANITY_LIST.some(word => lower.includes(word))
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const subject = await prisma.subject.findUnique({ where: { id } })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const posts = await prisma.forumPost.findMany({
      where: { batchId: subject.batchId },
      include: { 
        author: { select: { id: true, name: true, role: true } },
        replies: { include: { author: { select: { id: true, name: true, role: true } } } }
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    return NextResponse.json({ posts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const subject = await prisma.subject.findUnique({ where: { id } })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const { title, content, type, postId } = await request.json()

    if (containsProfanity(title || '') || containsProfanity(content)) {
      return NextResponse.json({ error: 'Message blocked by profanity filter.' }, { status: 400 })
    }

    if (type === 'REPLY' && postId) {
      const reply = await prisma.forumReply.create({
        data: {
          postId,
          authorId: session.user.id,
          content
        }
      })
      return NextResponse.json({ reply })
    } else {
      const post = await prisma.forumPost.create({
        data: {
          batchId: subject.batchId,
          authorId: session.user.id,
          title,
          content
        }
      })
      return NextResponse.json({ post })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
