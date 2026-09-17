import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: batchId } = await params
  const { branchId, name, address, type, colour } = await req.json()

  let targetBranchId = branchId

  // Inline branch creation if branchId not provided
  if (!targetBranchId && name) {
    const newBranch = await prisma.branch.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        type: type || 'Physical',
        colour: colour || '#00c853'
      }
    })
    targetBranchId = newBranch.id
  }

  if (!targetBranchId) {
    return NextResponse.json({ error: 'Branch ID or branch details required' }, { status: 400 })
  }

  // Check if link exists
  const existing = await prisma.batchBranch.findUnique({
    where: {
      batchId_branchId: { batchId, branchId: targetBranchId }
    }
  })

  if (existing) {
    return NextResponse.json({ error: 'Branch already added to this batch' }, { status: 400 })
  }

  const link = await prisma.batchBranch.create({
    data: {
      batchId,
      branchId: targetBranchId,
      status: 'active'
    },
    include: { branch: true }
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'ADD_BRANCH_TO_BATCH',
      targetType: 'BATCH_BRANCH',
      targetId: link.id,
      details: JSON.stringify({ batchId, branchId: targetBranchId })
    }
  })

  return NextResponse.json({ link })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: batchId } = await params
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  const previewOnly = searchParams.get('preview') === 'true'

  if (!branchId) {
    return NextResponse.json({ error: 'branchId query parameter is required' }, { status: 400 })
  }

  // Find enrolled students for this batch at this branch
  const affectedStudentsCount = await prisma.studentEnrollment.count({
    where: { batchId, branchId }
  })

  // Find teacher assignments for subjects in this batch at this branch
  const batchSubjects = await prisma.subject.findMany({
    where: { batchId },
    select: { id: true }
  })
  const subjectIds = batchSubjects.map(s => s.id)

  const affectedTeachersCount = await prisma.subjectBranchTeacher.count({
    where: {
      subjectId: { in: subjectIds },
      branchId
    }
  })

  if (previewOnly) {
    return NextResponse.json({
      affectedStudentsCount,
      affectedTeachersCount
    })
  }

  // Perform removal
  // 1. Delete student enrollments for this batch at this branch
  await prisma.studentEnrollment.deleteMany({
    where: { batchId, branchId }
  })

  // 2. Delete subject branch teacher assignments
  await prisma.subjectBranchTeacher.deleteMany({
    where: {
      subjectId: { in: subjectIds },
      branchId
    }
  })

  // 3. Remove BatchBranch relationship
  await prisma.batchBranch.deleteMany({
    where: { batchId, branchId }
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'REMOVE_BRANCH_FROM_BATCH',
      targetType: 'BATCH_BRANCH',
      targetId: `${batchId}_${branchId}`,
      details: JSON.stringify({ batchId, branchId, affectedStudentsCount, affectedTeachersCount })
    }
  })

  return NextResponse.json({
    success: true,
    affectedStudentsCount,
    affectedTeachersCount
  })
}
