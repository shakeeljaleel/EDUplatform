import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import ParentSubjectCalendarPage from '../[subjectId]/calendar/page'

export default async function ParentChildSubjectLessonPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return null

  const { id: childId } = await params

  // Look up student profile
  const childProfile = await prisma.studentProfile.findFirst({
    where: { OR: [{ id: childId }, { userId: childId }] },
    include: { user: true }
  })

  if (!childProfile) {
    return (
      <div className="content-wrapper" style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2>Child Profile Not Found</h2>
          <Link href="/dashboard/parent" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to Parent Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Look up child's enrolled subject automatically
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: childProfile.userId,
      status: { in: ['active', 'ACTIVE', 'admin_approved'] }
    },
    include: { subject: true }
  })

  if (!enrollment) {
    return (
      <div className="content-wrapper" style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2>No Active Enrollments</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {childProfile.user.name} is not currently enrolled in any active subjects.
          </p>
          <Link href={`/dashboard/parent/children/${childProfile.userId}`} className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to {childProfile.user.name}&apos;s Report
          </Link>
        </div>
      </div>
    )
  }

  return ParentSubjectCalendarPage({ params: Promise.resolve({ id: childId, subjectId: enrollment.subjectId }) })
}
