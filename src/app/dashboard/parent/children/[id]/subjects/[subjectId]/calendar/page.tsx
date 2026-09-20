import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft, Calendar, AlertCircle } from 'lucide-react'

export default async function ParentSubjectCalendarPage({ params }: { params: Promise<{ id: string; subjectId: string }> }) {
  const session = await getSession()
  if (!session) return null

  const { id, subjectId } = await params

  // Verify child profile and parent access
  const childProfile = await prisma.studentProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: {
      user: true,
      parent: true
    }
  })

  if (!childProfile || (childProfile.parent && childProfile.parent.userId !== session.user.id)) {
    return (
      <div className="content-wrapper" style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>You do not have permission to view this child&apos;s lesson plan.</p>
          <Link href="/dashboard/parent" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to Parent Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Fetch subject details
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      batch: true,
      branchTeachers: { include: { teacher: { select: { name: true, email: true } } } }
    }
  })

  if (!subject) {
    return (
      <div className="content-wrapper" style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Subject Not Found</h2>
          <Link href={`/dashboard/parent/children/${childProfile.userId}`} className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to {childProfile.user.name}&apos;s Profile
          </Link>
        </div>
      </div>
    )
  }

  // Fetch class sessions for this subject
  const sessions = await prisma.classSession.findMany({
    where: { subjectId },
    include: {
      syllabusObjectives: true,
      quizzes: { select: { id: true, title: true, status: true } }
    },
    orderBy: { scheduledDate: 'asc' }
  })

  const now = new Date()
  const taughtCount = sessions.filter(s => s.status === 'TAUGHT').length
  const scheduledCount = sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'RESCHEDULED').length
  const cancelledCount = sessions.filter(s => s.status === 'CANCELLED').length

  // Find next upcoming session index
  const nextUpcomingIndex = sessions.findIndex(s => new Date(s.scheduledDate) >= now && s.status !== 'CANCELLED')

  return (
    <div className="content-wrapper fade-in" style={{ maxWidth: '950px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
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
          <ArrowLeft size={16} /> Back to {childProfile.user.name}&apos;s Report
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-level" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
              {subject.batch?.name || 'Academic Subject'}
            </span>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              {subject.name} Lesson Plan & Roadmap
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.25rem', fontWeight: 600 }}>
              Curriculum progress & upcoming sessions for {childProfile.user.name}
            </p>
          </div>
          {subject.branchTeachers[0]?.teacher && (
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Teacher</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{subject.branchTeachers[0].teacher.name}</div>
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Sessions</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{sessions.length}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderColor: '#00c853' }}>
          <div style={{ fontSize: '0.8rem', color: '#00c853', fontWeight: 700, textTransform: 'uppercase' }}>Completed</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00c853', marginTop: '0.25rem' }}>{taughtCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderColor: 'var(--accent-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase' }}>Upcoming</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '0.25rem' }}>{scheduledCount}</div>
        </div>
        {cancelledCount > 0 && (
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderColor: '#ff1744' }}>
            <div style={{ fontSize: '0.8rem', color: '#ff1744', fontWeight: 700, textTransform: 'uppercase' }}>Cancelled</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ff1744', marginTop: '0.25rem' }}>{cancelledCount}</div>
          </div>
        )}
      </div>

      {/* SESSIONS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
        {sessions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Calendar size={40} color="var(--text-secondary)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>No Sessions Scheduled</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              No class sessions have been scheduled for {subject.name} yet.
            </p>
          </div>
        )}

        {sessions.map((s, idx) => {
          const isNext = idx === nextUpcomingIndex
          const isTaught = s.status === 'TAUGHT'
          const isCancelled = s.status === 'CANCELLED'

          let borderColor = 'var(--border-color)'
          let badgeBg = 'var(--bg-tertiary)'
          let badgeColor = 'var(--text-secondary)'

          if (isTaught) {
            borderColor = '#00c853'
            badgeBg = 'rgba(0, 200, 83, 0.15)'
            badgeColor = '#00c853'
          } else if (isCancelled) {
            borderColor = '#ff1744'
            badgeBg = 'rgba(255, 23, 68, 0.15)'
            badgeColor = '#ff1744'
          } else if (isNext) {
            borderColor = 'var(--accent-primary)'
            badgeBg = 'var(--accent-primary)'
            badgeColor = '#ffffff'
          }

          return (
            <div
              key={s.id}
              className="card"
              style={{
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'center',
                borderLeft: `6px solid ${borderColor}`,
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                position: 'relative',
                boxShadow: isNext ? '0 6px 20px rgba(41, 121, 255, 0.2)' : undefined,
                opacity: isCancelled ? 0.65 : 1
              }}
            >
              {isNext && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '1.5rem',
                    background: 'var(--accent-primary)',
                    color: '#ffffff',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em'
                  }}
                >
                  UPCOMING NEXT
                </span>
              )}

              {/* DATE COLUMN */}
              <div
                style={{
                  minWidth: '90px',
                  textAlign: 'center',
                  paddingRight: '1.25rem',
                  borderRight: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: borderColor, textTransform: 'uppercase' }}>
                  {new Date(s.scheduledDate).toLocaleString('en-GB', { month: 'short' })}
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, margin: '2px 0' }}>
                  {new Date(s.scheduledDate).getDate()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {new Date(s.scheduledDate).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* DETAILS COLUMN */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {s.title}
                  </h3>
                  <span
                    style={{
                      background: badgeBg,
                      color: badgeColor,
                      fontWeight: 800,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem'
                    }}
                  >
                    {s.status}
                  </span>
                </div>

                {s.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                    {s.description}
                  </p>
                )}

                {/* Syllabus Objectives if any */}
                {s.syllabusObjectives && s.syllabusObjectives.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                    {s.syllabusObjectives.map((obj: any) => (
                      <span
                        key={obj.id}
                        style={{
                          fontSize: '0.7rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          fontWeight: 600
                        }}
                      >
                        📌 {obj.code}: {obj.description}
                      </span>
                    ))}
                  </div>
                )}

                {isCancelled && s.cancelReason && (
                  <div style={{ color: '#ff1744', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} /> Cancelled: {s.cancelReason}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
