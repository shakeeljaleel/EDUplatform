import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { parse } from 'csv-parse/sync'
import bcrypt from 'bcryptjs'

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

    const text = await file.text()
    // Expected CSV format: name, email, password, address, phone
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true
    }) as any[]

    let successCount = 0

    // Sequential insert to avoid overload and handle bcrypt safely
    for (const record of records) {
      if (!record.email || !record.name || !record.password) continue

      const passwordHash = await bcrypt.hash(record.password, 10)

      const user = await prisma.user.upsert({
        where: { email: record.email },
        update: {},
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

      successCount++
    }

    return NextResponse.json({ success: true, count: successCount })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: 'Failed to import students' }, { status: 500 })
  }
}
