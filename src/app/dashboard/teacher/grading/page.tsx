import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { Sparkles, ArrowRight, CheckSquare } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function TeacherGradingHubPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return null

  // Fetch teacher's subjects and recent AI gradings
  const teacherAssignments = await prisma.subjectBranchTeacher.findMany({
    where: { teacherId: session.user.id },
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
      },
      branch: true
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {teacherAssignments.map(ta => (
          <div key={ta.id} className="card" style={{
            padding: '1.75rem',
            borderRadius: '16px',
            border: '3px solid #1a1a2e',
            boxShadow: '5px 5px 0px #1a1a2e',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                background: '#00c853',
                color: '#ffffff',
                border: '2px solid #1a1a2e',
                borderRadius: '50px',
                padding: '0.25rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                boxShadow: '2px 2px 0px #1a1a2e',
                marginBottom: '0.75rem'
              }}>
                {ta.subject.batch.name}
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>
                {ta.subject.name}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                {ta.subject.paperGradings.length} paper(s) graded by AI so far.
              </p>
            </div>

            <Link
              href={`/dashboard/teacher/subjects/${ta.subject.id}/grading`}
              className="comic-btn"
              style={{
                background: '#aa00ff',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: '4px 4px 0px #1a1a2e',
                padding: '0.75rem 1.5rem',
                fontWeight: 900,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none'
              }}
            >
              Open AI grader <ArrowRight size={18} />
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
