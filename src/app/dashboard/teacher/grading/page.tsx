import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { Sparkles, ArrowRight, CheckSquare } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function TeacherGradingHubPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return null

  // Fetch teacher's subjects and recent AI gradings
  const teacherAssignments = await prisma.subjectTeacher.findMany({
    where: { userId: session.user.id },
    include: {
      subject: {
        include: {
          batch: true,
          paperGradings: {
            include: { student: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      }
    }
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ec4899',
            border: '1px solid rgba(236, 72, 153, 0.3)'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              AI Marking & Auto-Grader Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Automated paper evaluation, marking scheme alignment, and instant student feedback powered by Gemini AI.
            </p>
          </div>
        </div>
      </div>

      {/* Course Subject Selection Boxes */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        Select a Course to Grade Papers
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {teacherAssignments.map(ta => (
          <div key={ta.id} className="card" style={{
            padding: '1.5rem',
            borderRadius: '18px',
            borderLeft: '6px solid #ec4899',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#ec4899', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                {ta.subject.batch.name}
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {ta.subject.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {ta.subject.paperGradings.length} paper(s) graded by AI so far.
              </p>
            </div>

            <Link
              href={`/dashboard/teacher/subjects/${ta.subject.id}/grading`}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #d946ef)',
                color: '#ffffff',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.25)'
              }}
            >
              Open AI Grader <ArrowRight size={16} />
            </Link>
          </div>
        ))}

        {teacherAssignments.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No Course Subjects Assigned"
              description="You do not have any assigned subjects yet. Contact your administrator to assign courses."
              actionLabel="Back to Dashboard"
              actionHref="/dashboard/teacher"
            />
          </div>
        )}
      </div>
    </div>
  )
}
