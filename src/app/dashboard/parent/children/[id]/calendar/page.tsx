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

        {allSessions.map((s) => {
          const statusLower = (s.status || '').toLowerCase()
          const titleLower = (s.title || '').toLowerCase()

          let eventTheme = { bg: 'linear-gradient(135deg, #00b4d8, #0077b6)', border: '#00b4d8', label: 'Class Session' }
          if (statusLower.includes('cancel') || titleLower.includes('cancel')) {
            eventTheme = { bg: 'linear-gradient(135deg, #ff1744, #ff5252)', border: '#ff1744', label: 'Cancelled Class' }
          } else if (titleLower.includes('exam') || titleLower.includes('test') || titleLower.includes('mock')) {
            eventTheme = { bg: 'linear-gradient(135deg, #ff6d00, #ffd180)', border: '#ff6d00', label: 'Exam Session' }
          } else if (titleLower.includes('holiday') || titleLower.includes('break') || statusLower.includes('holiday')) {
            eventTheme = { bg: 'linear-gradient(135deg, #aa00ff, #ea80fc)', border: '#aa00ff', label: 'Holiday / Break' }
          }

          return (
            <div key={s.id} className="card" style={{
              display: 'flex', gap: '1.5rem', alignItems: 'center',
              borderLeft: `6px solid ${eventTheme.border}`,
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              boxShadow: `0 4px 14px ${eventTheme.border}22`
            }}>
              <div style={{ minWidth: '100px', textAlign: 'center', paddingRight: '1.5rem', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: eventTheme.border, textTransform: 'uppercase' }}>
                  {s.scheduledDate.toLocaleString('en-GB', { month: 'short' })}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
                  {s.scheduledDate.getDate()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {s.scheduledDate.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: eventTheme.border, fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {s.subjectName} • {eventTheme.label}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem', color: '#0f172a' }}>{s.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{s.description}</p>
              </div>
              <span style={{
                background: eventTheme.bg, color: '#ffffff',
                fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem',
                boxShadow: `0 2px 8px ${eventTheme.border}44`
              }}>
                {s.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
