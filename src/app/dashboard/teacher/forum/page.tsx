import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { MessageSquare, ArrowRight, HelpCircle } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function TeacherForumHubPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return null

  const teacherAssignments = await prisma.subjectTeacher.findMany({
    where: { userId: session.user.id },
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
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Discussion Forums & Q&A Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Answer student queries, pin important lecture announcements, and foster peer discussions across your courses.
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        Select a Discussion Board
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {teacherAssignments.map(ta => (
          <div key={ta.id} className="card" style={{
            padding: '1.5rem',
            borderRadius: '18px',
            borderLeft: '6px solid #2563eb',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                {ta.subject.batch.name}
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {ta.subject.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Active class discussion board & Q&A.
              </p>
            </div>

            <Link
              href={`/dashboard/teacher/subjects/${ta.subject.id}/forum`}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
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
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
              }}
            >
              Open Forum Board <ArrowRight size={16} />
            </Link>
          </div>
        ))}

        {teacherAssignments.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No Discussion Boards Available"
              description="You do not have any assigned course forums yet."
              actionLabel="Back to Dashboard"
              actionHref="/dashboard/teacher"
            />
          </div>
        )}
      </div>
    </div>
  )
}
