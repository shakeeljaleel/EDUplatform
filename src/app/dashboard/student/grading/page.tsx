import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { Sparkles, ArrowRight, AlertTriangle } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function StudentGradingHubPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') return null

  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '')

  let enrollments: any[] = []
  let fetchError = false

  try {
    const rawEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        studentId: session.user.id,
        status: { in: ['active', 'admin_approved', 'ACTIVE', 'APPROVED'] }
      },
      include: {
        subject: {
          include: {
            batch: true,
            paperGradings: {
              where: { studentId: session.user.id }
            }
          }
        }
      }
    })

    enrollments = rawEnrollments.filter(e => e.subject && e.subject.batch)
  } catch (err) {
    console.error('StudentGradingHubPage database query error:', err)
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
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ec4899',
            border: '2px solid #1a1a2e',
            boxShadow: '3px 3px 0px #1a1a2e'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#1a1a2e' }}>
              AI Graded Scripts & Feedback
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
              View AI-evaluated exam answer scripts, marking scheme breakdowns, and teacher feedback.
            </p>
          </div>
        </div>
      </div>

      {!isGeminiConfigured && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.25rem 1.5rem',
          background: '#fffbe8',
          border: '3px solid #1a1a2e',
          borderRadius: '16px',
          boxShadow: '5px 5px 0px #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ffab00', border: '2px solid #1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e', flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.2rem' }}>
              AI grading is not fully configured
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
              Please contact your administrator to set up the <code style={{ background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>GEMINI_API_KEY</code> environment variable.
            </p>
          </div>
        </div>
      )}

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
          <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>Unable to load graded scripts</h4>
          <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
            A temporary database query issue occurred. Please try refreshing.
          </p>
        </div>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: '#1a1a2e' }}>
        Your Courses AI Gradebook
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {enrollments.map(e => (
          <div key={e.id} className="card" style={{
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
                {e.subject?.batch?.name || 'Batch'}
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>
                {e.subject?.name || 'Subject'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                {e.subject?.paperGradings?.length || 0} evaluated script(s) available.
              </p>
            </div>

            <Link
              href={`/dashboard/student/subjects/${e.subject?.id}/grading`}
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
              View graded papers <ArrowRight size={18} />
            </Link>
          </div>
        ))}

        {enrollments.length === 0 && !fetchError && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No Evaluated Papers Found"
              description="You are not enrolled in any active courses yet."
              actionLabel="Back to Dashboard"
              actionHref="/dashboard/student"
            />
          </div>
        )}
      </div>
    </div>
  )
}
