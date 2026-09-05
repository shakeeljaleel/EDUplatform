import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { 
      name, 
      email, 
      password, 
      role = 'STUDENT',
      subjectArea,
      bio,
      qualifications,
      studentEmail,
      studentId
    } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    if (role === 'TEACHER') {
      const user = await prisma.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash,
          role: 'TEACHER',
          approvalStatus: 'PENDING',
          subjectArea: subjectArea || null,
          bio: bio || null,
          qualifications: qualifications || null
        }
      })

      // Notify Super Admins of new pending teacher approval
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true }
      })

      for (const admin of superAdmins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'TEACHER_APPROVAL_REQUIRED',
            title: 'New Teacher Registration',
            message: `${name} (${cleanEmail}) applied for teacher access in ${subjectArea || 'General Subjects'}.`
          }
        })
      }

      return NextResponse.json({ 
        success: true, 
        role: 'TEACHER',
        message: 'Teacher application submitted. Your account is pending Super Admin approval.' 
      })
    }

    if (role === 'PARENT') {
      const parentUser = await prisma.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash,
          role: 'PARENT',
          approvalStatus: 'APPROVED'
        }
      })

      const parentProfile = await prisma.parentProfile.create({
        data: {
          userId: parentUser.id
        }
      })

      let linkedStudentName = null

      // Optional student account linking by email or student ID
      if (studentEmail || studentId) {
        const studentUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: (studentEmail || '').toLowerCase().trim() },
              { id: studentId || '' }
            ],
            role: 'STUDENT'
          },
          include: { profile: true }
        })

        if (studentUser && studentUser.profile) {
          await prisma.studentProfile.update({
            where: { id: studentUser.profile.id },
            data: { parentId: parentProfile.id }
          })
          linkedStudentName = studentUser.name

          await prisma.notification.create({
            data: {
              userId: studentUser.id,
              type: 'PARENT_LINKED',
              title: 'Parent Profile Linked',
              message: `${name} (${cleanEmail}) linked their parent account to your student profile.`
            }
          })
        }
      }

      await createSession({
        id: parentUser.id,
        role: parentUser.role,
        name: parentUser.name
      })

      return NextResponse.json({
        success: true,
        role: 'PARENT',
        linkedStudentName,
        message: 'Parent account created successfully.'
      })
    }

    // Default: STUDENT Registration
    const studentUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash,
        role: 'STUDENT',
        approvalStatus: 'APPROVED'
      }
    })

    await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        paymentStatus: 'Pending'
      }
    })

    // Automatically assign session to student for immediate onboarding
    await createSession({
      id: studentUser.id,
      role: studentUser.role,
      name: studentUser.name
    })

    return NextResponse.json({
      success: true,
      role: 'STUDENT',
      message: 'Student account created successfully. Welcome to Helix!'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 })
  }
}
