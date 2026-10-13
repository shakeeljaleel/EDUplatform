import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { studentId, batchId } = await request.json()
    if (!studentId || !batchId) {
      return NextResponse.json({ error: 'studentId and batchId are required' }, { status: 400 })
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        subjects: true,
        batchBranches: { include: { branch: true } }
      }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // First subject in the batch (or create a general subject if batch has none)
    let subjectId = batch.subjects[0]?.id
    if (!subjectId) {
      const defaultSubject = await prisma.subject.create({
        data: {
          name: `${batch.name} Core`,
          batchId: batch.id
        }
      })
      subjectId = defaultSubject.id
    }

    // Branch associated with the batch
    let branchId = batch.batchBranches[0]?.branchId
    if (!branchId) {
      const firstBranch = await prisma.branch.findFirst()
      if (firstBranch) {
        branchId = firstBranch.id
      } else {
        const createdBranch = await prisma.branch.create({
          data: { name: 'Main Branch' }
        })
        branchId = createdBranch.id
      }
    }

    // Upsert or create enrollment with status 'ACTIVE'
    const existing = await prisma.studentEnrollment.findFirst({
      where: { studentId, batchId }
    })

    let enrollment
    if (existing) {
      enrollment = await prisma.studentEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          subjectId: subjectId || existing.subjectId,
          branchId: branchId || existing.branchId,
          adminApprovedAt: new Date()
        },
        include: {
          batch: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        }
      })
    } else {
      // 3. prisma.enrollment.create({ data: { studentId, batchId, subjectId: batch.subjects[0].id, status: 'ACTIVE' } })
      enrollment = await prisma.studentEnrollment.create({
        data: {
          studentId,
          batchId,
          subjectId,
          branchId,
          status: 'ACTIVE',
          adminApprovedAt: new Date()
        },
        include: {
          batch: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        }
      })
    }

    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'ENROLLMENT_ACTIVE',
        title: 'Assigned to Batch',
        message: `You have been enrolled in batch ${batch.name}.`,
        link: '/dashboard/student'
      }
    }).catch(() => {})

    await logAdminAction({
      adminId: session.user.id,
      adminName: session.user.name,
      action: 'ASSIGN_BATCH',
      targetUserId: studentId,
      details: JSON.stringify({ batchId: batch.id, batchName: batch.name })
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      enrollment,
      batch: { id: batch.id, name: batch.name }
    })
  } catch (error: any) {
    console.error('Assign batch error:', error)
    return NextResponse.json({ error: error.message || 'Failed to assign batch' }, { status: 500 })
  }
}
