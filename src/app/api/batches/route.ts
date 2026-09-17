import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batches = await prisma.batch.findMany({
    include: {
      branch: true,
      subjects: {
        select: {
          id: true,
          teachers: {
            select: { userId: true }
          }
        }
      },
      _count: {
        select: { enrollments: true, subjects: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const formatted = batches.map(batch => {
    const teacherIds = new Set<string>()
    batch.subjects.forEach(s => {
      s.teachers.forEach(t => teacherIds.add(t.userId))
    })

    const { subjects, ...rest } = batch
    return {
      ...rest,
      teacherCount: teacherIds.size
    }
  })
  
  return NextResponse.json({ batches: formatted })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, academicLevel, branchId, description } = await request.json()

  if (!name?.trim() || !academicLevel?.trim()) {
    return NextResponse.json({ error: 'Name and academic level are required' }, { status: 400 })
  }

  const batch = await prisma.batch.create({
    data: {
      name: name.trim(),
      academicLevel: academicLevel.trim(),
      description: description?.trim() || null,
      branchId: branchId ? branchId : null
    },
    include: {
      branch: true
    }
  })

  return NextResponse.json({ batch })
}
