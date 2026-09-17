import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params

  try {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        batch: true,
        branchTeachers: {
          include: {
            branch: true,
            teacher: { select: { id: true, name: true, email: true } },
            assistants: {
              include: {
                assistant: { select: { id: true, name: true, email: true } }
              }
            }
          }
        },
        _count: { select: { studentEnrollments: true, quizzes: true } }
      }
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    return NextResponse.json({ subject })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { name, colour, description } = await request.json()
    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(colour ? { colour } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {})
      }
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'UPDATE_SUBJECT',
        targetType: 'SUBJECT',
        targetId: id,
        details: JSON.stringify({ name: updated.name, colour: updated.colour })
      }
    })

    return NextResponse.json({ success: true, subject: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const subject = await prisma.subject.findUnique({ where: { id } })
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    await prisma.subject.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'DELETE_SUBJECT',
        targetType: 'SUBJECT',
        targetId: id,
        details: JSON.stringify({ name: subject.name })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
