import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession, deleteSession, getSession } from '@/lib/auth'
import { validateEnv } from '@/lib/env'

let isSeeded = false

async function ensureDefaultUsersAndData() {
  if (isSeeded) return
  try {
    const adminHash = await bcrypt.hash('admin123', 10)

    // Always ensure Super Admin account exists regardless of state
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@eduplatform.com' }
    })
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: 'admin@eduplatform.com',
          passwordHash: adminHash,
          role: 'SUPER_ADMIN',
          approvalStatus: 'APPROVED',
        }
      })
    }

    const userCount = await prisma.user.count()
    const subjectCount = await prisma.subject.count()
    if (userCount > 1 && subjectCount > 0) {
      isSeeded = true
      return
    }

    console.log('Seeding full demo academic platform data...')
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
        address: '123 Academic Way',
        type: 'PHYSICAL',
        colour: '#00c853'
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

    // 2. Create Users (Teacher, Students, Parent)
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

    // 4. Enroll Students into Batch & Subject
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
    // 1. Audit Environment Variables Upfront
    const envValidation = validateEnv()
    if (!envValidation.valid) {
      console.error('[VERCEL_AUTH_ERROR] Environment validation failed!')
      console.error('[VERCEL_AUTH_ERROR] Missing variables:', envValidation.details.missingVars)
      console.error('[VERCEL_AUTH_ERROR] Validation errors:', envValidation.errors)
      return NextResponse.json(
        {
          error: 'Server configuration error: Required environment variables are missing or invalid.',
          missingVariables: envValidation.details.missingVars,
          details: envValidation.errors
        },
        { status: 500 }
      )
    }

    // 2. Pre-clear Stale or Expired Session Cookies
    try {
      const currentSession = await getSession()
      if (!currentSession) {
        // If cookie exists but getSession returned null (expired/malformed), clear it
        await deleteSession()
      }
    } catch (cookieErr) {
      console.warn('[AUTH_COOKIE_CLEANUP_WARN] Failed to pre-clear session cookie:', cookieErr)
      await deleteSession().catch(() => {})
    }

    // 3. Parse Request Payload
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // 4. Safely Query Database (with explicit DB connection error catch)
    let user = null
    try {
      // Auto-seed demo academic platform data on fresh databases
      await ensureDefaultUsersAndData()

      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      })
    } catch (dbErr: any) {
      console.error('[VERCEL_DB_CONNECTION_ERROR] Failed to query PostgreSQL database:', {
        message: dbErr?.message,
        code: dbErr?.code,
        meta: dbErr?.meta
      })
      return NextResponse.json(
        {
          error: 'Database connection failure: Unable to reach database server. Please verify your DATABASE_URL / POSTGRES_URL connection strings in Vercel settings.',
          details: dbErr?.message || 'Database query failed'
        },
        { status: 500 }
      )
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }


    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
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

    // Extract Request Headers safely
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check for suspicious login (new device/IP) - non-blocking
    try {
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

        await prisma.securityAlert.create({
          data: {
            userId: user.id,
            type: 'UNUSUAL_LOCATION',
            message: `Suspicious login detected from new device/IP (${ipAddress}) for account ${user.email}.`
          }
        }).catch(() => {})
      }
    } catch (auditErr) {
      console.error('Non-critical security alert check failed:', auditErr)
    }

    // 5. Generate Signed Session & Set Cookie
    const sessionToken = await createSession({
      id: user.id,
      role: user.role,
      name: user.name
    })

    // 6. Persistent Single Active Session Enforcement in DB
    try {
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
    } catch (sessionErr: any) {
      console.error('[VERCEL_AUTH_ERROR] ActiveSession DB upsert failed:', sessionErr)
      // Throw explicitly so login fails gracefully rather than leaving invalid active session token in DB
      throw new Error(`Database session store error: ${sessionErr?.message || 'Could not persist active session'}`)
    }

    // 7. Log login event in audit history
    try {
      await prisma.loginAuditLog.create({
        data: {
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent,
          deviceType: userAgent || 'unknown_device'
        }
      })
    } catch (logErr) {
      console.error('Non-critical login audit log failed:', logErr)
    }

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
    // 8. Server-Side Diagnostic Error Logging for Vercel Function Logs
    console.error('[VERCEL_LOGIN_ERROR]', {
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack
    })

    return NextResponse.json(
      { error: error?.message || 'Authentication failed due to a server error. Please try again.' },
      { status: 500 }
    )
  }
}
