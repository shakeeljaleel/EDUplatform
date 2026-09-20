import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react'

export default async function ChildCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return null
  const { id } = await params

  // 1. Fetch parent profile and all linked children
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          user: true
        }
      }
    }
  })

  // 2. Find child profile matching id (by profile ID or user ID)
  let childProfile = parentProfile?.children.find(
    c => c.id === id || c.userId === id
  )

  // 3. Fallback: check if id matches a direct student profile or enrollment
  if (!childProfile) {
    const directStudent = await prisma.studentProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: { user: true }
    })
    if (directStudent) {
      childProfile = directStudent
    } else if (parentProfile?.children && parentProfile.children.length > 0) {
      childProfile = parentProfile.children[0]
    }
  }

  if (!childProfile) {
    return (
      <div className="content-wrapper" style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>No child profile found for this parent account.</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Please connect with administration to link your student account to your parent portal.
          </p>
          <Link href="/dashboard/parent" className="btn-primary" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
            Back to Parent Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // 4. Fetch active enrollments with subject, batch, teacher, and class sessions
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      studentId: childProfile.userId,
      status: { in: ['active', 'ACTIVE', 'admin_approved'] }
    },
    include: {
      batch: true,
      subject: {
        include: {
          branchTeachers: {
            include: {
              teacher: { select: { name: true, email: true } }
            }
          },
          classSessions: {
            where: {
              status: { in: ['SCHEDULED', 'RESCHEDULED', 'TAUGHT', 'CANCELLED'] }
            },
            orderBy: { scheduledDate: 'asc' }
          }
        }
      }
    }
  })

  // Flatten and format sessions with subject & teacher details
  const allSessions = enrollments.flatMap(e =>
    e.subject.classSessions.map(s => ({
      ...s,
      subjectName: e.subject.name,
      batchName: e.batch?.name || 'Standard Batch',
      teacherName: e.subject.branchTeachers[0]?.teacher?.name || 'Assigned Instructor'
    }))
  ).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())

  return (
    <div className="content-wrapper fade-in" style={{ maxWidth: '950px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href={`/dashboard/parent/children/${childProfile.userId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--accent-primary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
            marginBottom: '1rem'
          }}
        >
          <ArrowLeft size={16} /> Back to Academic Report
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Schedule for {childProfile.user.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 600, marginTop: '0.35rem' }}>
              Weekly class timetable & upcoming academic sessions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {enrollments.map(e => (
              <span key={e.id} className="badge badge-level" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700 }}>
                📚 {e.subject.name} ({e.batch.name})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SESSIONS TIMETABLE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
        {allSessions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>No Classes Scheduled</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
              There are currently no active class sessions scheduled for {childProfile.user.name}.
            </p>
          </div>
        )}

        {allSessions.map((s) => {
          const statusLower = (s.status || '').toLowerCase()
          const titleLower = (s.title || '').toLowerCase()

          let eventTheme = { bg: '#2979ff', border: '#2979ff', label: 'Regular Class', badgeBg: 'rgba(41, 121, 255, 0.15)', badgeText: '#2979ff' }
          if (statusLower.includes('cancel') || titleLower.includes('cancel')) {
            eventTheme = { bg: '#ff1744', border: '#ff1744', label: 'Cancelled Class', badgeBg: 'rgba(255, 23, 68, 0.15)', badgeText: '#ff1744' }
          } else if (s.status === 'TAUGHT') {
            eventTheme = { bg: '#00c853', border: '#00c853', label: 'Completed Session', badgeBg: 'rgba(0, 200, 83, 0.15)', badgeText: '#00c853' }
          } else if (titleLower.includes('exam') || titleLower.includes('test') || titleLower.includes('mock')) {
            eventTheme = { bg: '#ff6d00', border: '#ff6d00', label: 'Formal Assessment', badgeBg: 'rgba(255, 109, 0, 0.15)', badgeText: '#ff6d00' }
          }

          const dateStr = s.scheduledDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          const timeStr = s.scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

          return (
            <div
              key={s.id}
              className="card"
              style={{
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'center',
                borderLeft: `6px solid ${eventTheme.border}`,
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                boxShadow: `0 4px 14px ${eventTheme.border}15`
              }}
            >
              {/* DATE BLOCK */}
              <div style={{ minWidth: '100px', textAlign: 'center', paddingRight: '1.25rem', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: eventTheme.border, textTransform: 'uppercase' }}>
                  {dateStr}
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, margin: '2px 0' }}>
                  {s.scheduledDate.getDate()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {timeStr}
                </div>
              </div>

              {/* CONTENT BLOCK */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: eventTheme.border, fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {s.subjectName} • {eventTheme.label}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  {s.title}
                </h3>
                {s.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                    {s.description}
                  </p>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={13} /> Instructor: <strong>{s.teacherName}</strong>
                </div>
              </div>

              {/* STATUS BADGE */}
              <span
                style={{
                  background: eventTheme.badgeBg,
                  color: eventTheme.badgeText,
                  fontWeight: 800,
                  padding: '0.4rem 0.9rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {s.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
