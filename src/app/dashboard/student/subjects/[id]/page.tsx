import React from 'react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Calendar, MessageSquare, Sparkles, Video, FileText, Compass, ChevronRight } from 'lucide-react'

export default async function StudentSubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'STUDENT') {
    redirect('/login')
  }

  const { id: subjectId } = await params

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      batch: true,
      branchTeachers: {
        include: {
          branch: true,
          teacher: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  if (!subject) {
    return (
      <div className="content-wrapper" style={{ maxWidth: '900px', padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Subject Not Found</h2>
        <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '2rem' }}>
          The requested subject does not exist or has been removed.
        </p>
        <Link
          href="/dashboard/student"
          style={{
            background: '#2979ff',
            color: '#ffffff',
            padding: '0.75rem 1.5rem',
            borderRadius: '50px',
            border: '2.5px solid #1a1a2e',
            boxShadow: '3px 3px 0px #1a1a2e',
            fontWeight: 900,
            textDecoration: 'none'
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  // Fetch Class Sessions for this subject
  const sessions = await prisma.classSession.findMany({
    where: { subjectId },
    include: {
      syllabusObjectives: true,
      resources: true,
      quizzes: { select: { id: true, title: true } }
    },
    orderBy: { scheduledDate: 'asc' }
  })

  // Get teacher names
  const teacherNames = subject.branchTeachers
    .map(bt => bt.teacher.name)
    .filter(Boolean)
    .join(', ') || 'Assigned Course Faculty'

  const subjectColor = subject.colour || '#2979ff'

  return (
    <div className="content-wrapper fade-in" style={{ maxWidth: '1100px' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        <ol style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
          <li><Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Dashboard</Link></li>
          <li>/</li>
          <li><span style={{ color: 'var(--text-secondary)' }}>Subjects</span></li>
          <li>/</li>
          <li aria-current="page" style={{ color: 'var(--text-primary)' }}>{subject.name}</li>
        </ol>
      </nav>

      {/* Subject Banner Header */}
      <div
        className="card"
        style={{
          background: subjectColor,
          color: '#ffffff',
          borderRadius: '20px',
          border: '3px solid #1a1a2e',
          boxShadow: '6px 6px 0px #1a1a2e',
          padding: '2rem',
          marginBottom: '2.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{
              background: 'rgba(0,0,0,0.25)',
              color: '#ffffff',
              padding: '0.25rem 0.85rem',
              borderRadius: '50px',
              fontSize: '0.8rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'inline-block',
              marginBottom: '0.75rem'
            }}>
              {subject.batch?.name || 'Batch'}
            </span>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff', lineHeight: 1.1 }}>
              {subject.name}
            </h1>

            {subject.description && (
              <p style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.95, maxWidth: '700px', marginBottom: '1rem' }}>
                {subject.description}
              </p>
            )}

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.875rem', fontWeight: 800 }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.35rem 0.85rem', borderRadius: '50px', border: '1.5px solid rgba(255,255,255,0.3)' }}>
                👨‍🏫 {teacherNames}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.35rem 0.85rem', borderRadius: '50px', border: '1.5px solid rgba(255,255,255,0.3)' }}>
                📚 {sessions.length} Class Sessions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Navigation Grid */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.25rem', color: '#1a1a2e' }}>
        Course Hub & Learning Modules
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        {[
          { title: 'Syllabus Roadmap', desc: 'Curriculum coverage & objectives', href: `/dashboard/student/subjects/${subjectId}/syllabus`, icon: <BookOpen size={24} />, color: '#00c853' },
          { title: 'Class Schedule', desc: 'Live sessions & timetable', href: `/dashboard/student/subjects/${subjectId}/calendar`, icon: <Calendar size={24} />, color: '#ff6d00' },
          { title: 'Video Recordings', desc: 'On-demand lesson archives', href: `/dashboard/student/subjects/${subjectId}/recordings`, icon: <Video size={24} />, color: '#f50057' },
          { title: 'Study Resources', desc: 'Notes, worksheets & files', href: `/dashboard/student/subjects/${subjectId}/resources`, icon: <FileText size={24} />, color: '#2979ff' },
          { title: 'Q&A Discussion Forum', desc: 'Ask questions & discuss topics', href: `/dashboard/student/subjects/${subjectId}/forum`, icon: <MessageSquare size={24} />, color: '#aa00ff' },
          { title: 'AI Graded Scripts', desc: 'View marked papers & feedback', href: `/dashboard/student/subjects/${subjectId}/grading`, icon: <Sparkles size={24} />, color: '#ec4899' },
          { title: 'AI Adaptive Path', desc: 'Personalized study path', href: `/dashboard/student/subjects/${subjectId}/adaptive-path`, icon: <Compass size={24} />, color: '#00bcd4' }
        ].map(mod => (
          <Link
            key={mod.href}
            href={mod.href}
            style={{
              background: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #1a1a2e',
              padding: '1.25rem',
              textDecoration: 'none',
              color: '#1a1a2e',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease'
            }}
          >
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: mod.color,
                color: '#ffffff',
                border: '2px solid #1a1a2e',
                boxShadow: '2px 2px 0px #1a1a2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                {mod.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '0.25rem' }}>{mod.title}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{mod.desc}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: mod.color, fontWeight: 900, fontSize: '0.85rem', marginTop: '1rem' }}>
              <span>Open module</span>
              <ChevronRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {/* Class Sessions Section */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.25rem', color: '#1a1a2e' }}>
        Scheduled Class Sessions ({sessions.length})
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
        {sessions.map(s => {
          const isUpcoming = new Date(s.scheduledDate) >= new Date()
          return (
            <div
              key={s.id}
              className="card"
              style={{
                background: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '4px 4px 0px #1a1a2e',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: isUpcoming ? '#00c853' : '#64748b',
                    color: '#ffffff',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    border: '1.5px solid #1a1a2e'
                  }}>
                    {isUpcoming ? 'UPCOMING' : 'COMPLETED'}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2979ff' }}>
                    {new Date(s.scheduledDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(s.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                    ⏱️ {s.durationMins} mins
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.25rem' }}>
                  {s.title}
                </h3>

                {s.description && (
                  <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, margin: 0 }}>
                    {s.description}
                  </p>
                )}

                {s.syllabusObjectives.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {s.syllabusObjectives.map(obj => (
                      <span key={obj.id} style={{ background: '#f1f5f9', border: '1px solid #1a1a2e', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#aa00ff' }}>
                        🎯 {obj.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {s.meetingLink && isUpcoming && (
                <a
                  href={s.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#00c853',
                    color: '#ffffff',
                    border: '2.5px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '3px 3px 0px #1a1a2e',
                    padding: '0.55rem 1.25rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Join Online Class →
                </a>
              )}
            </div>
          )
        })}

        {sessions.length === 0 && (
          <div style={{
            background: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '16px',
            boxShadow: '4px 4px 0px #1a1a2e',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a2e' }}>No class sessions scheduled yet</h3>
            <p style={{ color: '#64748b', fontWeight: 600 }}>Check back later for updated timetables and live session links.</p>
          </div>
        )}
      </div>
    </div>
  )
}
