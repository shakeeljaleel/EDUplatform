import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { BarChart2, ArrowRight } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function TeacherPerformanceHubPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return null

  let teacherAssignments: any[] = []
  let fetchError = false

  try {
    const rawAssignments = await prisma.subjectBranchTeacher.findMany({
      where: { teacherId: session.user.id },
      include: {
        subject: {
          include: {
            batch: true,
            _count: { select: { examSessions: true } }
          }
        },
        branch: true
      }
    })

    teacherAssignments = rawAssignments.filter(ta => ta.subject && ta.subject.batch)
  } catch (err) {
    console.error('TeacherPerformanceHubPage database error:', err)
    fetchError = true
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00bcd4',
            border: '2px solid #1a1a2e',
            boxShadow: '3px 3px 0px #1a1a2e'
          }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#1a1a2e' }}>
              Mark Analytics & Gradebook Insights
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
              View class grade distributions, exam session mark sheets, and academic progress tracking across courses.
            </p>
          </div>
        </div>
      </div>

      {fetchError && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.25rem 1.5rem',
          background: '#fff0f3',
          border: '3px solid #1a1a2e',
          borderRadius: '16px',
          boxShadow: '5px 5px 0px #1a1a2e',
          color: '#1a1a2e'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>Unable to load performance data</h4>
          <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
            A temporary database query issue occurred. Please try refreshing.
          </p>
        </div>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: '#1a1a2e' }}>
        Select a Course to View Analytics
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
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
                {ta.subject?.batch?.name || 'Batch'}
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>
                {ta.subject?.name || 'Subject'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                {ta.subject?._count?.examSessions || 0} exam session(s) logged.
              </p>
            </div>

            <Link
              href={`/dashboard/teacher/subjects/${ta.subject?.id}/performance`}
              className="comic-btn"
              style={{
                background: '#00bcd4',
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
              View analytics & marks <ArrowRight size={18} />
            </Link>
          </div>
        ))}

        {teacherAssignments.length === 0 && !fetchError && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No Performance Data Available"
              description="You do not have any assigned courses with performance logs yet."
              actionLabel="Back to Dashboard"
              actionHref="/dashboard/teacher"
            />
          </div>
        )}
      </div>
    </div>
  )
}
