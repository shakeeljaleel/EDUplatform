import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  try {
    // Students: only if active+paid and enrolled
    if (session.user.role === 'STUDENT') {
      const enrollment = await prisma.subjectEnrollment.findFirst({
        where: { subjectId, userId: session.user.id, status: { in: ['APPROVED', 'ACTIVE'] } }
      })
      if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

      const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } })
      if (!profile || profile.paymentStatus !== 'Paid') {
        return NextResponse.json({ error: 'Payment required to access recordings' }, { status: 403 })
      }
    }

    const recordings = await prisma.recording.findMany({
      where: { subjectId },
      include: {
        uploadedBy: { select: { name: true } },
        accesses: session.user.role === 'STUDENT'
          ? { where: { userId: session.user.id } }
          : true
      },
      orderBy: { classDate: 'desc' }
    })

    return NextResponse.json({ recordings })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: subjectId } = await params

  try {
    const { title, classDate, videoUrl, duration } = await request.json()

    const recording = await prisma.recording.create({
      data: {
        subjectId,
        uploadedById: session.user.id,
        title,
        classDate: new Date(classDate),
        videoUrl,
        duration: duration || 0
      }
    })

    return NextResponse.json({ recording })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
