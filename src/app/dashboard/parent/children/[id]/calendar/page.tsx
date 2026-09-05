import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export default async function ChildCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return null
  const { id } = await params

  // Fetch the child's subjects
  const childProfile = await prisma.studentProfile.findUnique({
    where: { id },
    include: { user: true }
  })

  if (!childProfile) return <div>Child profile not found.</div>

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { userId: childProfile.userId, status: 'APPROVED' },
    include: {
      subject: {
        include: {
          classSessions: {
            where: {
              status: { in: ['SCHEDULED', 'RESCHEDULED', 'TAUGHT'] }
            },
            orderBy: { scheduledDate: 'asc' }
          }
        }
      }
    }
  })

  // Flatten all sessions
  const allSessions = enrollments.flatMap(e => 
    e.subject.classSessions.map(s => ({ ...s, subjectName: e.subject.name }))
  ).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{childProfile.user.name}&apos;s Lesson Plan</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Full academic schedule and lesson details.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {allSessions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No classes scheduled yet for any subjects.</p>
          </div>
        )}

        {allSessions.map((s) => (
          <div key={s.id} className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ minWidth: '100px', textAlign: 'center', paddingRight: '1.5rem', borderRight: '1px solid var(--bg-tertiary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                {s.scheduledDate.toLocaleString('en-GB', { month: 'short' })}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {s.scheduledDate.getDate()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {s.scheduledDate.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {s.subjectName}
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{s.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{s.description}</p>
            </div>
            <span className={`badge ${
              s.status === 'SCHEDULED' ? 'badge-pending' : 
              s.status === 'TAUGHT' ? 'badge-paid' : 'badge-level'
            }`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
