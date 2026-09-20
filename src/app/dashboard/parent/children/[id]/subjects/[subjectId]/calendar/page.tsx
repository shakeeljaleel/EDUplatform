import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft, Calendar, BookOpen, Clock, User, AlertCircle } from 'lucide-react'

export default async function ParentSubjectCalendarPage({ params }: { params: Promise<{ id: string; subjectId: string }> }) {
  const session = await getSession()
  if (!session) return null

  const { id: childId, subjectId: rawSubjectId } = await params

  // 1. Fetch parent profile and children
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

  // Match child by profile id or user id
  let childProfile = parentProfile?.children.find(
    c => c.id === childId || c.userId === childId
  )

  if (!childProfile) {
    childProfile = await prisma.studentProfile.findFirst({
      where: { OR: [{ id: childId }, { userId: childId }] },
      include: { user: true }
    }) || undefined
  }

  if (!childProfile && parentProfile?.children && parentProfile.children.length > 0) {
    childProfile = parentProfile.children[0]
  }

  if (!childProfile) {
    return (
      <div className="content-wrapper" style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2>Access Denied or Child Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No child profile found matching your parent account.
          </p>
          <Link href="/dashboard/parent" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to Parent Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // 2. Handle Step 4 Edge Case: if subjectId is missing or undefined, find enrolled subject automatically
  let subjectId = rawSubjectId
  if (!subjectId || subjectId === 'undefined') {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: childProfile.userId,
        status: { in: ['active', 'ACTIVE', 'admin_approved'] }
      },
      include: { subject: true }
    })
    if (enrollment) {
      subjectId = enrollment.subjectId
    }
  }

  // 3. Fetch Subject info
  const subject = subjectId ? await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      batch: true,
      branchTeachers: {
        include: { teacher: { select: { name: true, email: true } } }
      }
    }
  }) : null

  if (!subject) {
    return (
      <div className="content-wrapper" style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2>Subject Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No subject matching this ID was found for {childProfile.user.name}.
          </p>
          <Link href={`/dashboard/parent/children/${childProfile.userId}`} className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to {childProfile.user.name}&apos;s Report
          </Link>
        </div>
      </div>
    )
  }

  // 4. Fetch Class Sessions & Lesson Plans for Subject
  const [sessions, lessonPlans] = await Promise.all([
    prisma.classSession.findMany({
      where: { subjectId: subject.id },
      include: {
        syllabusObjectives: true,
        lessonPlan: true
      },
      orderBy: { scheduledDate: 'asc' }
    }),
    prisma.lessonPlan.findMany({
      where: { subjectId: subject.id },
      include: { subject: true },
      orderBy: { createdAt: 'asc' }
    })
  ])

  const teacherName = subject.branchTeachers[0]?.teacher?.name || 'Assigned Instructor'

  // Date formatting helper for "Friday, Aug 29"
  const formatDateString = (d: Date) => {
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
    const monthName = d.toLocaleDateString('en-US', { month: 'short' })
    const dayNum = d.getDate()
    return `${dayName}, ${monthName} ${dayNum}`
  }

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
          <ArrowLeft size={16} /> Back to {childProfile.user.name}&apos;s Report
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-level" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
              {subject.batch?.name || 'Academic Subject'}
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {subject.name} — Lesson Plan
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.35rem', fontWeight: 600 }}>
              Read-only curriculum roadmap for {childProfile.user.name} • Instructor: {teacherName}
            </p>
          </div>
        </div>
      </div>

      {/* LESSON PLAN SESSIONS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
        {sessions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>No Lesson Plans Available</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
              No class sessions or lesson plans scheduled for {subject.name} yet.
            </p>
          </div>
        )}

        {sessions.map((s) => {
          const formattedDate = formatDateString(s.scheduledDate)
          const timeStr = s.scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          const isTaught = s.status === 'TAUGHT'
          const isCancelled = s.status === 'CANCELLED'

          let badgeBg = '#2979ff' // UPCOMING / SCHEDULED in blue
          let badgeText = '#UPCOMING'
          let badgeLabel = 'UPCOMING'

          if (isTaught) {
            badgeBg = '#00c853' // TAUGHT in green
            badgeLabel = 'TAUGHT'
          } else if (isCancelled) {
            badgeBg = '#ff1744'
            badgeLabel = 'CANCELLED'
          } else {
            badgeLabel = 'UPCOMING'
          }

          return (
            <div
              key={s.id}
              className="card"
              style={{
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'center',
                borderLeft: `6px solid ${badgeBg}`,
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                boxShadow: `0 4px 14px ${badgeBg}18`
              }}
            >
              {/* DATE COLUMN */}
              <div
                style={{
                  minWidth: '130px',
                  textAlign: 'center',
                  paddingRight: '1.25rem',
                  borderRight: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: badgeBg }}>
                  {formattedDate}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
                  {timeStr} ({s.durationMins} mins)
                </div>
              </div>

              {/* DETAILS COLUMN */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {s.title}
                  </h3>
                  <span
                    style={{
                      background: badgeBg,
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.3rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {badgeLabel}
                  </span>
                </div>

                {s.description && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.45 }}>
                    {s.description}
                  </p>
                )}

                {s.lessonPlan?.content && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginTop: '0.35rem' }}>
                    <strong>Content:</strong> {s.lessonPlan.content}
                  </div>
                )}

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
