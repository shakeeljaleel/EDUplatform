import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { parseStudentImportFile } from '@/lib/studentImportParser'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const batchId = formData.get('batchId') as string

    if (!file || !batchId) {
      return NextResponse.json({ error: 'File and batchId are required' }, { status: 400 })
    }

    const records = await parseStudentImportFile(file)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid student records with email addresses found in the uploaded file.' }, { status: 400 })
    }

    let successCount = 0

    // Fetch target batch details with subjects and assigned teachers
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        subjects: {
          include: {
            branchTeachers: { select: { teacherId: true } }
          }
        }
      }
    })

    const subjects = batch?.subjects || []
    const importedStudents: Array<{ id: string; name: string; email: string; status: string }> = []

    // Collect all unique teacher IDs assigned to this batch's subjects
    const teacherUserIds = new Set<string>()
    for (const subject of subjects) {
      for (const t of subject.branchTeachers) {
        if (t.teacherId) teacherUserIds.add(t.teacherId)
      }
    }

    const defaultBranch = await prisma.branch.findFirst()

    for (const record of records) {
      if (!record.email || !record.name) continue

      const initialPassword = record.password || 'Student2026!'
      const passwordHash = await bcrypt.hash(initialPassword, 10)

      const user = await prisma.user.upsert({
        where: { email: record.email },
        update: {
          name: record.name,
        },
        create: {
          email: record.email,
          name: record.name,
          passwordHash,
          role: 'STUDENT',
          profile: {
            create: {
              address: record.address || '',
              phone: record.phone || '',
            }
          }
        }
      })

      if (defaultBranch) {
        for (const subject of subjects) {
          await prisma.studentEnrollment.upsert({
            where: { id: `enroll-${user.id}-${subject.id}` },
            update: { status: 'admin_approved', adminApprovedAt: new Date() },
            create: {
              id: `enroll-${user.id}-${subject.id}`,
              studentId: user.id,
              batchId: batchId,
              branchId: defaultBranch.id,
              subjectId: subject.id,
              status: 'admin_approved',
              adminApprovedAt: new Date()
            }
          })
        }
      }

      // Notify teachers about new admin-imported student
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

      importedStudents.push({
        id: user.id,
        name: user.name,
        email: user.email,
        status: 'ADMIN_APPROVED'
      })

      successCount++
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      totalParsed: records.length,
      batchName: batch?.name || 'Selected Batch',
      students: importedStudents
    })
  } catch (error: any) {
    console.error('Student import error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to import students' }, { status: 500 })
  }
}
