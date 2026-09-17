import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { MessageSquare, ArrowRight } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function StudentForumHubPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') return null

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      studentId: session.user.id,
      status: { in: ['active', 'admin_approved', 'ACTIVE', 'APPROVED'] }
    },
    include: {
      subject: {
        include: {
          batch: true
        }
      }
    }
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: '#aa00ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            border: '3px solid #1a1a2e',
            boxShadow: '3px 3px 0px #1a1a2e'
          }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Course Discussion Forums & Q&A
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>
              Ask questions, discuss topics with teachers and classmates, and read pinned announcements.
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        Your Enrolled Course Discussion Boards
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {enrollments.map(e => (
          <div key={e.id} className="card" style={{
            padding: '1.5rem',
            borderRadius: '18px',
            border: '3px solid #1a1a2e',
            boxShadow: '5px 5px 0px #1a1a2e',
            borderLeft: '8px solid #aa00ff',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#aa00ff', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                {e.subject.batch.name}
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {e.subject.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Active peer & teacher discussion board.
              </p>
            </div>

            <Link
              href={`/dashboard/student/subjects/${e.subject.id}/forum`}
              style={{
                background: '#aa00ff',
                color: '#ffffff',
                padding: '0.75rem 1.25rem',
                borderRadius: '50px',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
                fontWeight: 900,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none'
              }}
            >
              Open discussion forum <ArrowRight size={16} />
            </Link>
          </div>
        ))}

        {enrollments.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No Enrolled Course Forums"
              description="You are not enrolled in any active course subjects yet."
              actionLabel="Back to dashboard"
              actionHref="/dashboard/student"
            />
          </div>
        )}
      </div>
    </div>
  )
}

