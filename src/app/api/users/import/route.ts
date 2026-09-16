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

    // Fetch subjects of target batch to auto-enroll
    const subjects = await prisma.subject.findMany({ where: { batchId } })

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

      // Auto-enroll in batch subjects
      for (const subject of subjects) {
        await prisma.subjectEnrollment.upsert({
          where: {
            subjectId_userId: {
              subjectId: subject.id,
              userId: user.id
            }
          },
          update: { status: 'APPROVED' },
          create: {
            subjectId: subject.id,
            userId: user.id,
            status: 'APPROVED'
          }
        })
      }

      successCount++
    }

    return NextResponse.json({ success: true, count: successCount, totalParsed: records.length })
  } catch (error: any) {
    console.error('Student import error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to import students' }, { status: 500 })
  }
}
