import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batches = await prisma.batch.findMany({
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
              assistants: true
            }
          }
        }
      },
      studentEnrollments: {
        select: {
          id: true,
          studentId: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const formatted = batches.map(batch => {
    const uniqueStudents = new Set(batch.studentEnrollments.map(e => e.studentId))
    
    const teacherIds = new Set<string>()
    const assistantIds = new Set<string>()
    batch.subjects.forEach(s => {
      s.branchTeachers.forEach(bt => {
        teacherIds.add(bt.teacherId)
        bt.assistants.forEach(ast => assistantIds.add(ast.assistantId))
      })
    })

    return {
      id: batch.id,
      name: batch.name,
      academicLevel: batch.academicLevel,
      description: batch.description,
      status: batch.status,
      createdAt: batch.createdAt,
      branchesCount: batch.batchBranches.length,
      studentsCount: uniqueStudents.size,
      subjectsCount: batch.subjects.length,
      teachersCount: teacherIds.size,
      assistantsCount: assistantIds.size,
      branches: batch.batchBranches.map(bb => bb.branch)
    }
  })

  return NextResponse.json({ batches: formatted })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, academicLevel, description, branchIds } = await request.json()

  if (!name?.trim() || !academicLevel?.trim()) {
    return NextResponse.json({ error: 'Name and academic level are required' }, { status: 400 })
  }

  const batch = await prisma.batch.create({
    data: {
      name: name.trim(),
      academicLevel: academicLevel.trim(),
      description: description?.trim() || null,
      status: 'active'
    }
  })

  if (Array.isArray(branchIds) && branchIds.length > 0) {
    await prisma.batchBranch.createMany({
      data: branchIds.map((branchId: string) => ({
        batchId: batch.id,
        branchId,
        status: 'active'
      }))
    })
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role,
      action: 'CREATE_BATCH',
      targetType: 'BATCH',
      targetId: batch.id,
      details: JSON.stringify({ name: batch.name, academicLevel: batch.academicLevel })
    }
  })

  return NextResponse.json({ batch })
}
