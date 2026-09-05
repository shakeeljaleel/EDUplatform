import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function TeacherBuzzerHubPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return null

  const teacherAssignments = await prisma.subjectTeacher.findMany({
    where: { userId: session.user.id },
    include: {
      subject: {
        include: {
          batch: true,
          _count: { select: { buzzerSessions: true } }
        }
      }
    }
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <Zap size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Live Speed Buzzer Quiz Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Host real-time interactive classroom speed buzzer competitions, team battles, and live scoreboards.
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        Select a Course to Host a Buzzer Quiz
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {teacherAssignments.map(ta => (
          <div key={ta.id} className="card" style={{
            padding: '1.5rem',
            borderRadius: '18px',
            borderLeft: '6px solid #f59e0b',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                {ta.subject.batch.name}
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {ta.subject.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {ta.subject._count.buzzerSessions} buzzer session(s) hosted.
              </p>
            </div>

            <Link
              href={`/dashboard/teacher/subjects/${ta.subject.id}/buzzer`}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
              }}
            >
              Launch Live Buzzer <ArrowRight size={16} />
            </Link>
          </div>
        ))}

        {teacherAssignments.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No Courses Available for Buzzer Quiz"
              description="You do not have any assigned courses to launch buzzer quizzes."
              actionLabel="Back to Dashboard"
              actionHref="/dashboard/teacher"
            />
          </div>
        )}
      </div>
    </div>
  )
}
