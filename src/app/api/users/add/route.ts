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
    const { name, email, password, address, phone, batchId, branchId, subjectIds } = data

    if (!name || !email || !password || !batchId || !branchId) {
      return NextResponse.json({ error: 'Name, email, password, target batch, and target branch are required.' }, { status: 400 })
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

    // Fetch batch details and subjects
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        subjects: true
      }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Selected batch not found' }, { status: 404 })
    }

    const allSubjects = batch.subjects || []
    const selectedSubjects = Array.isArray(subjectIds) && subjectIds.length > 0
      ? allSubjects.filter(s => subjectIds.includes(s.id))
      : allSubjects

    for (const subject of selectedSubjects) {
      await prisma.studentEnrollment.upsert({
        where: { id: `enroll-${user.id}-${subject.id}` },
        update: { status: 'admin_approved', branchId: branchId, adminApprovedAt: new Date() },
        create: {
          id: `enroll-${user.id}-${subject.id}`,
          studentId: user.id,
          batchId: batchId,
          branchId: branchId,
          subjectId: subject.id,
          status: 'admin_approved',
          adminApprovedAt: new Date()
        }
      })

      // Notify teachers matching exact subjectId AND branchId combination
      const assignedTeachers = await prisma.subjectBranchTeacher.findMany({
        where: {
          subjectId: subject.id,
          branchId: branchId
        },
        select: { teacherId: true }
      })

      for (const t of assignedTeachers) {
        await prisma.notification.create({
          data: {
            userId: t.teacherId,
            type: 'TEACHER_ENROLMENT_CONFIRMATION',
            title: 'Student Enrolment Confirmation',
            message: `New student ${user.name} has been added to ${subject.name} — ${batch.name} by the admin. Please confirm their enrolment.`
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      user,
      batchName: batch.name,
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
