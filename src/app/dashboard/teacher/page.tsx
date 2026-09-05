import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import TeacherDashboardTabs from '@/components/TeacherDashboardTabs'

export default async function TeacherDashboard() {
  const session = await getSession()
  if (!session) return null

  // Fetch batches via BatchEnrollment (legacy) + subjects via SubjectTeacher
  const [batchEnrollments, subjectAssignments] = await Promise.all([
    prisma.batchEnrollment.findMany({
      where: { userId: session.user.id, role: 'TEACHER' },
      include: { batch: { include: { branch: true } } }
    }),
    prisma.subjectTeacher.findMany({
      where: { userId: session.user.id },
      include: {
        subject: {
          include: {
            batch: { include: { branch: true } },
            _count: { select: { enrollments: true, quizzes: true } }
          }
        }
      }
    })
  ])

  // Get all unique students across all assigned batches/subjects
  const batchIds = Array.from(new Set([
    ...batchEnrollments.map(e => e.batchId),
    ...subjectAssignments.map(s => s.subject.batchId)
  ]))

  const allStudents = await prisma.user.findMany({
    where: {
      enrollments: {
        some: { batchId: { in: batchIds } }
      },
      role: 'STUDENT'
    },
    include: {
      profile: true,
      enrollments: {
        include: { batch: true }
      }
    }
  })

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Teacher Command</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Welcome back, {session.user.name}. Here is your academic overview.</p>
      </div>

      <TeacherDashboardTabs 
        subjectAssignments={subjectAssignments} 
        batchEnrollments={batchEnrollments}
        allStudents={allStudents}
      />
    </div>
  )
}
