import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { name, email, password, address, phone, batchId } = data

    if (!name || !email || !password || !batchId) {
      return NextResponse.json({ error: 'Name, email, password, and batch are required.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash,
        role: 'STUDENT',
        profile: {
          create: {
            address: address || '',
            phone: phone || '',
          }
        }
      }
    })

    // Fetch batch details and assigned teachers
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        subjects: {
          include: {
            teachers: { select: { userId: true } }
          }
        }
      }
    })

    // Enroll in batch
    await prisma.batchEnrollment.upsert({
      where: {
        userId_batchId: {
          userId: user.id,
          batchId: batchId
        }
      },
      update: {},
      create: {
        userId: user.id,
        batchId: batchId,
        role: 'STUDENT'
      }
    })

    // Admin-imported/added students skip Stage 1: status is ADMIN_APPROVED awaiting Stage 3 Teacher confirmation
    const subjects = batch?.subjects || []
    for (const subject of subjects) {
      await prisma.subjectEnrollment.upsert({
        where: {
          subjectId_userId: {
            subjectId: subject.id,
            userId: user.id
          }
        },
        update: { status: 'ADMIN_APPROVED' },
        create: {
          subjectId: subject.id,
          userId: user.id,
          status: 'ADMIN_APPROVED'
        }
      })
    }

    // Collect teacher IDs
    const teacherUserIds = new Set<string>()
    for (const subject of subjects) {
      for (const t of subject.teachers) {
        if (t.userId) teacherUserIds.add(t.userId)
      }
    }

    // Notify teachers
    for (const teacherId of Array.from(teacherUserIds)) {
      await prisma.notification.create({
        data: {
          userId: teacherId,
          type: 'TEACHER_ENROLMENT_CONFIRMATION',
          title: 'Student Enrolment Confirmation',
          message: `New student ${user.name} has been added to ${batch?.name || 'the batch'} by the admin. Please confirm their enrolment.`
        }
      })
    }

    return NextResponse.json({
      success: true,
      user,
      batchName: batch?.name || 'Batch',
      students: [{
        id: user.id,
        name: user.name,
        email: user.email,
        status: 'ADMIN_APPROVED'
      }]
    })
  } catch (error: any) {
    console.error('Manual student add error:', error)
    return NextResponse.json({ error: error.message || 'Failed to add student' }, { status: 500 })
  }
}
