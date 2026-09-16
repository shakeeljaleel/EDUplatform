import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active batches with branch and subject info
  const batches = await prisma.batch.findMany({
    include: {
      branch: true,
      subjects: true,
      _count: {
        select: { enrollments: true, subjects: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Get student's current enrollments
  const myEnrollments = await prisma.batchEnrollment.findMany({
    where: { userId: session.user.id },
    select: { batchId: true }
  })

  const enrolledBatchIds = new Set(myEnrollments.map(e => e.batchId))

  const formattedBatches = batches.map(b => ({
    ...b,
    isEnrolled: enrolledBatchIds.has(b.id)
  }))

  return NextResponse.json({ batches: formattedBatches })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { batchId } = await request.json()
  if (!batchId) {
    return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
  }

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { subjects: true }
  })

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  // Create or update batch enrollment
  const enrollment = await prisma.batchEnrollment.upsert({
    where: {
      userId_batchId: {
        userId: session.user.id,
        batchId
      }
    },
    update: {},
    create: {
      userId: session.user.id,
      batchId,
      role: 'STUDENT'
    }
  })

  // Self-enrolled students start at Stage 1: status PENDING (requires Admin approval then Teacher confirmation)
  for (const subject of batch.subjects) {
    await prisma.subjectEnrollment.upsert({
      where: {
        subjectId_userId: {
          subjectId: subject.id,
          userId: session.user.id
        }
      },
      update: { status: 'PENDING' },
      create: {
        subjectId: subject.id,
        userId: session.user.id,
        status: 'PENDING'
      }
    })
  }

  return NextResponse.json({ success: true, enrollment, batch })
}
