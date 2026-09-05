import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const adminHash = await bcrypt.hash('admin123', 10)
    const studentHash = await bcrypt.hash('password123', 10)

    const biologyId = '8a80c886-b557-4b5a-825b-2dcb347f1127'
    const batchId = '3e1ee5cf-1dd6-404f-a1a0-4c71dbd5b7b6'
    const branchId = '11111111-1111-1111-1111-111111111111'

    // 1. Branch & Batch
    const branch = await prisma.branch.upsert({
      where: { id: branchId },
      update: {},
      create: {
        id: branchId,
        name: 'Main Campus',
        code: 'MC-01',
        address: '123 Academic Way',
      },
    })

    const batch = await prisma.batch.upsert({
      where: { id: batchId },
      update: {},
      create: {
        id: batchId,
        name: 'Grade 11 Biology Batch',
        academicLevel: 'Grade 11',
        branchId: branch.id,
      },
    })

    // 2. Users
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@test.com' },
      update: {},
      create: {
        id: 'e154fdaf-5e58-4a8d-85ae-2c5ef0045fa8',
        name: 'Ms. Smith',
        email: 'teacher@test.com',
        passwordHash: adminHash,
        role: 'TEACHER',
        approvalStatus: 'APPROVED',
      },
    })

    await prisma.user.upsert({
      where: { email: 'admin@eduplatform.com' },
      update: {},
      create: {
        name: 'Super Admin',
        email: 'admin@eduplatform.com',
        passwordHash: adminHash,
        role: 'SUPER_ADMIN',
        approvalStatus: 'APPROVED',
      },
    })

    const studentData = [
      { email: 'student1@test.com', name: 'Test Student' },
      { email: 'student2@test.com', name: 'Ahmed Khan' },
      { email: 'sarah@test.com', name: 'Sarah Miller' },
      { email: 'james@test.com', name: 'James Wilson' },
      { email: 'elena@test.com', name: 'Elena Gilbert' },
    ]

    const students = []
    for (const s of studentData) {
      const student = await prisma.user.upsert({
        where: { email: s.email },
        update: {},
        create: {
          name: s.name,
          email: s.email,
          passwordHash: studentHash,
          role: 'STUDENT',
          approvalStatus: 'APPROVED',
        },
      })
      students.push(student)
    }

    const parentUser = await prisma.user.upsert({
      where: { email: 'parent@test.com' },
      update: {},
      create: {
        name: 'Parent User',
        email: 'parent@test.com',
        passwordHash: studentHash,
        role: 'PARENT',
        approvalStatus: 'APPROVED',
      },
    })

    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: {
        userId: parentUser.id,
        phone: '+1-555-0199',
      },
    })

    await prisma.studentProfile.upsert({
      where: { userId: students[0].id },
      update: { parentId: parentProfile.id },
      create: {
        userId: students[0].id,
        parentId: parentProfile.id,
      },
    })

    // 3. Subject
    const subject = await prisma.subject.upsert({
      where: { id: biologyId },
      update: {},
      create: {
        id: biologyId,
        name: 'Advanced Biology',
        code: 'BIO-301',
        teacherId: teacher.id,
        batchId: batch.id,
      },
    })

    // 4. Enrollments
    for (const st of students) {
      await prisma.batchEnrollment.upsert({
        where: {
          userId_batchId: {
            userId: st.id,
            batchId: batch.id,
          },
        },
        update: {},
        create: {
          userId: st.id,
          batchId: batch.id,
          role: 'STUDENT',
        },
      })

      await prisma.subjectEnrollment.upsert({
        where: {
          subjectId_userId: {
            userId: st.id,
            subjectId: subject.id,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          userId: st.id,
          subjectId: subject.id,
          status: 'ACTIVE',
        },
      })
    }

    // 5. Syllabus Objectives
    const objectives = [
      { code: 'BIO-1.1', description: 'Cell structure and organelles', subjectId: subject.id, curriculum: 'Standard' },
      { code: 'BIO-1.2', description: 'Membrane transport mechanisms', subjectId: subject.id, curriculum: 'Standard' },
      { code: 'BIO-2.1', description: 'Photosynthesis basics', subjectId: subject.id, curriculum: 'Standard' },
    ]

    for (const obj of objectives) {
      await prisma.syllabusObjective.upsert({
        where: { code: obj.code },
        update: {},
        create: obj,
      })
    }

    // 6. Class Session
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    const session = await prisma.classSession.create({
      data: {
        subjectId: subject.id,
        title: 'Advanced Mitochondrial Research',
        description: 'Deep dive into ATP synthesis and mitochondrial DNA.',
        scheduledDate: tomorrow,
        durationMins: 90,
        status: 'SCHEDULED',
      },
    })

    await prisma.classResource.create({
      data: {
        sessionId: session.id,
        title: 'Mitochondria Diagram PDF',
        url: 'https://example.com/mitochondria.pdf',
        type: 'PDF',
        isPreWatch: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Demo academic platform data seeded successfully!',
      stats: {
        users: students.length + 3,
        batches: 1,
        subjects: 1,
        sessionCreated: session.title,
      },
    })
  } catch (error: any) {
    console.error('Seed endpoint error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
