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
      batchBranches: { include: { branch: true } },
      subjects: true,
      _count: {
        select: { studentEnrollments: true, subjects: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Get student's current enrollments
  const myEnrollments = await prisma.studentEnrollment.findMany({
    where: { studentId: session.user.id },
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

  const body = await request.json()
  const { batchId, branchId, subjectIds } = body
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

  const targetBranchId = branchId || (await prisma.branch.findFirst())?.id
  if (!targetBranchId) {
    return NextResponse.json({ error: 'No branch available' }, { status: 400 })
  }

  const targetSubjects = Array.isArray(subjectIds) && subjectIds.length > 0 
    ? batch.subjects.filter(s => subjectIds.includes(s.id))
    : batch.subjects

  const enrollments = []
  for (const subject of targetSubjects) {
    const enrollment = await prisma.studentEnrollment.upsert({
      where: { id: `enroll-${session.user.id}-${subject.id}` },
      update: { status: 'pending', branchId: targetBranchId },
      create: {
        id: `enroll-${session.user.id}-${subject.id}`,
        studentId: session.user.id,
        batchId,
        branchId: targetBranchId,
        subjectId: subject.id,
        status: 'pending'
      }
    })
    enrollments.push(enrollment)
  }

  return NextResponse.json({ success: true, enrollments, batch })
}
