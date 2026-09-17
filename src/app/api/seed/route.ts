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

    // 1. Branch & Batches
    const branch = await prisma.branch.upsert({
      where: { id: branchId },
      update: {},
      create: {
        id: branchId,
        name: 'Main Campus',
        address: '123 Academic Way',
        type: 'PHYSICAL',
        colour: '#00c853'
      },
    })

    await prisma.branch.upsert({
      where: { id: '22222222-2222-2222-2222-222222222222' },
      update: {},
      create: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'City Branch',
        address: '456 Downtown Blvd',
        type: 'PHYSICAL',
        colour: '#2979ff'
      },
    })

    await prisma.branch.upsert({
      where: { id: '33333333-3333-3333-3333-333333333333' },
      update: {},
      create: {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Online Campus',
        address: 'Virtual Portal',
        type: 'ONLINE',
        colour: '#ff6d00'
      },
    })

    const batch = await prisma.batch.upsert({
      where: { id: batchId },
      update: {},
      create: {
        id: batchId,
        name: 'Grade 11 Biology Batch',
        academicLevel: 'Grade 11',
      },
    })

    await prisma.batchBranch.upsert({
      where: { id: `bb-${batch.id}-${branch.id}` },
      update: {},
      create: {
        id: `bb-${batch.id}-${branch.id}`,
        batchId: batch.id,
        branchId: branch.id,
      }
    })

    await prisma.batch.upsert({
      where: { id: '44444444-4444-4444-4444-444444444444' },
      update: {},
      create: {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Cambridge A2 2027',
        academicLevel: 'A Level',
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

    // 3. Subject & Teacher Link
    const subject = await prisma.subject.upsert({
      where: { id: biologyId },
      update: {},
      create: {
        id: biologyId,
        name: 'Advanced Biology',
        batchId: batch.id,
      },
    })

    await prisma.subjectBranchTeacher.upsert({
      where: {
        id: `sbt-${subject.id}-${branch.id}-${teacher.id}`
      },
      update: {},
      create: {
        id: `sbt-${subject.id}-${branch.id}-${teacher.id}`,
        subjectId: subject.id,
        branchId: branch.id,
        teacherId: teacher.id,
      },
    })

    // 4. Enrollments
    for (const st of students) {
      await prisma.studentEnrollment.upsert({
        where: {
          id: `enroll-${st.id}-${subject.id}`
        },
        update: { status: 'active' },
        create: {
          id: `enroll-${st.id}-${subject.id}`,
          studentId: st.id,
          batchId: batch.id,
          branchId: branch.id,
          subjectId: subject.id,
          status: 'active',
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

    let session = await prisma.classSession.findFirst({
      where: { subjectId: subject.id, title: 'Advanced Mitochondrial Research' }
    })

    if (!session) {
      session = await prisma.classSession.create({
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
    }

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
