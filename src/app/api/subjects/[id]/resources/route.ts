import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifySubjectMembers } from '@/lib/notifications'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const materials = await prisma.studyMaterial.findMany({
      where: { subjectId: id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ materials })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const data = await request.json()
    const material = await prisma.studyMaterial.create({
      data: {
        subjectId: id,
        authorId: session.user.id,
        title: data.title,
        url: data.url,
        type: data.type || 'LINK'
      }
    })

    // Get subject name for notification
    const subject = await prisma.subject.findUnique({ where: { id }, select: { name: true } })

    try {
      await notifySubjectMembers(
        id, 
        null, 
        'RESOURCE_ADDED', 
        'New Resource Available', 
        `A new resource "${data.title}" has been uploaded for ${subject?.name}.`
      )
    } catch (notifyErr) {
      console.error('Resource notification failed:', notifyErr)
    }

    return NextResponse.json({ material })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
