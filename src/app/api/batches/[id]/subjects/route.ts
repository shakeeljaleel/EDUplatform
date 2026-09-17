import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - list all subjects for a batch
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const subjects = await prisma.subject.findMany({
      where: { batchId: id },
      include: {
        branchTeachers: {
          include: {
            teacher: { select: { id: true, name: true, email: true } },
            branch: true
          }
        },
        _count: { select: { studentEnrollments: true, quizzes: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({ subjects })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }
}

// POST - create a new subject in a batch
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: batchId } = await params

  try {
    const { name, description, teacherId, branchId } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })

    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        batchId
      }
    })

    if (teacherId && branchId) {
      await prisma.subjectBranchTeacher.create({
        data: {
          subjectId: subject.id,
          branchId,
          teacherId,
        }
      })

      const studentCount = await prisma.studentEnrollment.count({
        where: { subjectId: subject.id }
      })

      await prisma.notification.create({
        data: {
          userId: teacherId,
          type: 'TEACHER_ASSIGNMENT',
          title: 'New Subject Assignment',
          message: `You have been assigned to teach ${subject.name} in ${batch.name}. You have ${studentCount} students enrolled.`
        }
      })
    }

    const fullSubject = await prisma.subject.findUnique({
      where: { id: subject.id },
      include: {
        branchTeachers: { include: { teacher: { select: { id: true, name: true, email: true } }, branch: true } },
        _count: { select: { studentEnrollments: true, quizzes: true } }
      }
    })

    return NextResponse.json({ success: true, subject: fullSubject })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
