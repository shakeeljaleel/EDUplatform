import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import TeacherDashboardTabs from '@/components/TeacherDashboardTabs'

export default async function TeacherDashboard() {
  const session = await getSession()
  if (!session) return null

  // Fetch subject-branch combinations assigned to this teacher
  const teacherBranchSubjects = await prisma.subjectBranchTeacher.findMany({
    where: { teacherId: session.user.id },
    include: {
      subject: {
        include: {
          batch: true,
          studentEnrollments: {
            select: { id: true, studentId: true, branchId: true }
          }
        }
      },
      branch: true,
      assistants: {
        include: {
          assistant: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  // Format teacher classes with student count for this specific subject at this branch
  const teacherClasses = teacherBranchSubjects.map(tbs => {
    const enrollmentsAtBranch = tbs.subject.studentEnrollments.filter(se => se.branchId === tbs.branchId)
    const uniqueStudentCount = new Set(enrollmentsAtBranch.map(e => e.studentId)).size

    return {
      id: tbs.id,
      subject: tbs.subject,
      branch: tbs.branch,
      assistants: tbs.assistants,
      studentCount: uniqueStudentCount
    }
  })

  // Fetch pending Stage 2 enrolment confirmations for teacher's subject-branches
  const OR = teacherBranchSubjects.map(tbs => ({
    subjectId: tbs.subjectId,
    branchId: tbs.branchId
  }))

  let pendingConfirmations: any[] = []
  if (OR.length > 0) {
    pendingConfirmations = await prisma.studentEnrollment.findMany({
      where: {
        status: 'admin_approved',
        OR
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        subject: true,
        batch: true,
        branch: true
      },
      orderBy: { requestedAt: 'desc' }
    })
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
          Teacher Portal
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.35rem' }}>
          Welcome, {session.user.name}. Manage your assigned subject-branch classes and assistants.
        </p>
      </div>

      <TeacherDashboardTabs 
        teacherClasses={teacherClasses} 
        pendingConfirmations={pendingConfirmations}
      />
    </div>
  )
}
