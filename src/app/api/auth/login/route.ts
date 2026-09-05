import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'

let isSeeded = false

async function ensureDefaultUsersAndData() {
  if (isSeeded) return
  try {
    const userCount = await prisma.user.count()
    const subjectCount = await prisma.subject.count()
    if (userCount > 0 && subjectCount > 0) {
      isSeeded = true
      return
    }
      console.log('Seeding full demo academic platform data...')
      const adminHash = await bcrypt.hash('admin123', 10)
      const studentHash = await bcrypt.hash('password123', 10)

      const biologyId = '8a80c886-b557-4b5a-825b-2dcb347f1127'
      const batchId = '3e1ee5cf-1dd6-404f-a1a0-4c71dbd5b7b6'
      const branchId = '11111111-1111-1111-1111-111111111111'

      // 1. Create Branch & Batch
      const branch = await prisma.branch.upsert({
        where: { id: branchId },
        update: {},
        create: {
          id: branchId,
          name: 'Main Campus',
          location: '123 Academic Way',
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

      // 2. Create Users (Admin, Teacher, Students, Parent)
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

      // Parent user
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

      // Link Parent Profile
      const parentProfile = await prisma.parentProfile.upsert({
        where: { userId: parentUser.id },
        update: {},
        create: {
          userId: parentUser.id,
          phone: '+1-555-0199',
        },
      })

      // Link Test Student Profile
      await prisma.studentProfile.upsert({
        where: { userId: students[0].id },
        update: { parentId: parentProfile.id },
        create: {
          userId: students[0].id,
          parentId: parentProfile.id,
        },
      })

      // 3. Create Subject & Teacher Link
      const subject = await prisma.subject.upsert({
        where: { id: biologyId },
        update: {},
        create: {
          id: biologyId,
          name: 'Advanced Biology',
          batchId: batch.id,
        },
      })

      await prisma.subjectTeacher.upsert({
        where: {
          subjectId_userId: {
            subjectId: subject.id,
            userId: teacher.id,
          },
        },
        update: {},
        create: {
          subjectId: subject.id,
          userId: teacher.id,
        },
      })

      // 4. Enroll Students into Batch & Subject
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

      // 6. Class Session & Resources
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

      console.log('Full demo data seeding completed successfully!')
      isSeeded = true
  } catch (err) {
    console.error('Full demo seed check failed:', err)
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Auto-seed demo academic platform data on fresh databases
    await ensureDefaultUsersAndData()

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if account is disabled by admin
    if (user.accountDisabled) {
      return NextResponse.json({ error: 'Your account has been suspended by the administrator.' }, { status: 403 })
    }

    // Block teachers pending approval or rejected by super admin
    if (user.role === 'TEACHER' && user.approvalStatus === 'PENDING') {
      return NextResponse.json({ error: 'Your account is pending approval by the administrator.' }, { status: 403 })
    }
    if (user.role === 'TEACHER' && user.approvalStatus === 'REJECTED') {
      return NextResponse.json({ error: 'Your account application has been rejected. Please contact the administrator.' }, { status: 403 })
    }

    // Check for suspicious login (new device/IP)
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    const previousLogin = await prisma.loginAuditLog.findFirst({
      where: { userId: user.id }
    })

    if (previousLogin && (previousLogin.ipAddress !== ipAddress || previousLogin.userAgent !== userAgent)) {
      const { sendSecurityAlertEmail } = await import('@/lib/email')
      sendSecurityAlertEmail(user.email, {
        ip: ipAddress,
        device: userAgent,
        time: new Date().toLocaleString()
      }).catch(err => console.error('Alert email error:', err))

      // Create Security Alert in database
      await prisma.securityAlert.create({
        data: {
          userId: user.id,
          type: 'UNUSUAL_LOCATION',
          message: `Suspicious login detected from new device/IP (${ipAddress}) for account ${user.email}.`
        }
      }).catch(() => {})
    }

    // Generate single-active-session token
    const sessionToken = await createSession({
      id: user.id,
      role: user.role,
      name: user.name
    })

    // Force invalidation of any previous active session for this user
    await prisma.activeSession.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        token: sessionToken,
        deviceId: userAgent || 'unknown_device',
        ipAddress
      },
      update: {
        token: sessionToken,
        deviceId: userAgent || 'unknown_device',
        ipAddress
      }
    })

    // Log login event in audit history
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        deviceType: userAgent || 'unknown_device'
      }
    })

    return NextResponse.json({
      success: true,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
