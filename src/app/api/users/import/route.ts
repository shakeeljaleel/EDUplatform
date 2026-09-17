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
    const branchId = formData.get('branchId') as string
    const rawSubjectIds = formData.get('subjectIds') as string

    if (!file || !batchId || !branchId) {
      return NextResponse.json({ error: 'File, target batch, and target branch are required' }, { status: 400 })
    }

    let selectedSubjectIds: string[] = []
    if (rawSubjectIds) {
      try {
        selectedSubjectIds = JSON.parse(rawSubjectIds)
      } catch {
        selectedSubjectIds = []
      }
    }

    const records = await parseStudentImportFile(file)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid student records with email addresses found in the uploaded file.' }, { status: 400 })
    }

    let successCount = 0

    // Fetch target batch details with subjects
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
    const targetSubjects = selectedSubjectIds.length > 0
      ? allSubjects.filter(s => selectedSubjectIds.includes(s.id))
      : allSubjects

    const importedStudents: Array<{ id: string; name: string; email: string; status: string }> = []

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

      for (const subject of targetSubjects) {
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

        // Notify teachers matching exact subject_id AND branch_id combination
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
      batchName: batch.name,
      students: importedStudents
    })
  } catch (error: any) {
    console.error('Student import error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to import students' }, { status: 500 })
  }
}
