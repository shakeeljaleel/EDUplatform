import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      batchBranches: {
        include: {
          branch: true
        }
      },
      subjects: {
        include: {
          branchTeachers: {
            include: {
              branch: true,
              teacher: {
                select: { id: true, name: true, email: true }
              },
              assistants: {
                include: {
                  assistant: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        }
      },
      studentEnrollments: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: { select: { paymentStatus: true } }
            }
          },
          subject: true,
          branch: true
        }
      }
    }
  })

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  // Aggregate stats per branch
  const branchSummary = batch.batchBranches.map(bb => {
    const branchId = bb.branchId
    const branchEnrollments = batch.studentEnrollments.filter(e => e.branchId === branchId)
    
    // Teachers assigned to subjects at this branch
    const branchTeachersSet = new Set<string>()
    batch.subjects.forEach(sub => {
      sub.branchTeachers.forEach(bt => {
        if (bt.branchId === branchId) {
          branchTeachersSet.add(bt.teacherId)
        }
      })
    })

    // Subjects running at this branch (subjects that have a teacher at this branch or assigned to batch)
    const branchSubjects = batch.subjects.filter(sub =>
      sub.branchTeachers.some(bt => bt.branchId === branchId)
    )

    return {
      branchId,
      branchName: bb.branch.name,
      branchType: bb.branch.type,
      branchColour: bb.branch.colour,
      studentCount: new Set(branchEnrollments.map(e => e.studentId)).size,
      subjectCount: branchSubjects.length,
      teacherCount: branchTeachersSet.size
    }
  })

  // Collect overall stats
  const uniqueStudents = new Set(batch.studentEnrollments.map(e => e.studentId)).size
  const teacherIds = new Set<string>()
  const assistantIds = new Set<string>()

  batch.subjects.forEach(s => {
    s.branchTeachers.forEach(bt => {
      teacherIds.add(bt.teacherId)
      bt.assistants.forEach(a => assistantIds.add(a.assistantId))
    })
  })

  return NextResponse.json({
    batch: {
      ...batch,
      stats: {
        totalBranches: batch.batchBranches.length,
        totalSubjects: batch.subjects.length,
        totalStudents: uniqueStudents,
        totalTeachers: teacherIds.size,
        totalAssistants: assistantIds.size
      },
      branchSummary
    }
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { name, academicLevel, description, status } = await req.json()

  const updated = await prisma.batch.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(academicLevel !== undefined && { academicLevel: academicLevel.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status !== undefined && { status })
    }
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'UPDATE_BATCH',
      targetType: 'BATCH',
      targetId: id,
      details: JSON.stringify({ name: updated.name, status: updated.status })
    }
  })

  return NextResponse.json({ batch: updated })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { confirmName } = await req.json()

  const batch = await prisma.batch.findUnique({ where: { id } })
  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  if (confirmName !== batch.name) {
    return NextResponse.json({ error: 'Batch name does not match confirmation text' }, { status: 400 })
  }

  await prisma.batch.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'DELETE_BATCH',
      targetType: 'BATCH',
      targetId: id,
      details: JSON.stringify({ name: batch.name })
    }
  })

  return NextResponse.json({ success: true })
}
