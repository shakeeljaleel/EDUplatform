import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { CheckSquare, Calendar, Clock, TrendingUp, ArrowLeft, AlertCircle } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default async function GlobalAttendancePage() {
  const session = await getSession()
  if (!session || session.user.role !== 'TEACHER') return null

  const classSessions = await prisma.classSession.findMany({
    where: {
      subject: {
        branchTeachers: {
          some: {
            teacherId: session.user.id
          }
        }
      },
      status: {
        not: 'CANCELLED'
      }
    },
    include: {
      subject: {
        include: {
          batch: true,
          _count: {
            select: {
              studentEnrollments: { where: { status: { in: ['active', 'admin_approved', 'ACTIVE', 'APPROVED'] } } }
            }
          }
        }
      },
      attendance: true
    },
    orderBy: {
      scheduledDate: 'desc'
    }
  })

  // Calculate high-level summary metrics
  const totalSessions = classSessions.length
  let totalMarkedAttendance = 0
  let totalPossibleAttendance = 0
  let pendingSessionsCount = 0

  classSessions.forEach(s => {
    const totalStudents = s.subject._count.studentEnrollments
    const markedCount = s.attendance.length
    if (markedCount < totalStudents && totalStudents > 0) {
      pendingSessionsCount++
    }
    totalMarkedAttendance += s.attendance.filter(a => a.status === 'PHYSICAL' || a.status === 'ONLINE').length
    totalPossibleAttendance += totalStudents
  })

  const overallAttendancePct = totalPossibleAttendance > 0 
    ? Math.round((totalMarkedAttendance / totalPossibleAttendance) * 100) 
    : 100

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#00bcd4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              boxShadow: '3px 3px 0px #1a1a2e'
            }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Attendance Intelligence
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>
                Track class participation, manage student roll calls, and monitor attendance metrics across all your active courses.
              </p>
            </div>
          </div>
        </div>

        <Link 
          href="/dashboard/teacher" 
          style={{
            background: '#1a1a2e',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '50px',
            border: '3px solid #1a1a2e',
            boxShadow: '4px 4px 0px #1a1a2e',
            fontWeight: 900,
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} color="#ffffff" /> Back to dashboard
        </Link>
      </div>

      {/* Summary Stat Boxes — Fix 8: Solid Color Comic Treatment */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        {/* Total Class Sessions — Solid Blue */}
        <div style={{
          background: '#2979ff',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>Total class sessions</span>
            <span style={{ fontSize: '1.5rem' }}>📅</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{totalSessions}</div>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', marginTop: '0.5rem', fontWeight: 700 }}>Active scheduled lectures</div>
        </div>

        {/* Pending Roll Calls — Solid Orange */}
        <div style={{
          background: '#ff6d00',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>Pending roll calls</span>
            <span style={{ fontSize: '1.5rem' }}>⏳</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{pendingSessionsCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', marginTop: '0.5rem', fontWeight: 700 }}>Requires teacher action</div>
        </div>

        {/* Avg Attendance Rate — Solid Green */}
        <div style={{
          background: '#00c853',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>Avg attendance rate</span>
            <span style={{ fontSize: '1.5rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{overallAttendancePct}%</div>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', marginTop: '0.5rem', fontWeight: 700 }}>Physical + Online combined</div>
        </div>
      </div>

      {/* Main Content Cards Grid — Fix 9: Comic Treatment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {classSessions.map(s => {
          const totalStudents = s.subject._count.studentEnrollments
          const physical = s.attendance.filter((a: any) => a.status === 'PHYSICAL').length
          const online = s.attendance.filter((a: any) => a.status === 'ONLINE').length
          const absent = s.attendance.filter((a: any) => a.status === 'ABSENT').length
          const markedCount = physical + online + absent
          const unmarked = Math.max(0, totalStudents - markedCount)
          const markedPct = totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0
          const isFullyMarked = totalStudents > 0 && unmarked === 0

          const sessionDate = s.scheduledDate.toLocaleDateString('en-GB', { 
            weekday: 'short', day: 'numeric', month: 'short' 
          })
          const sessionTime = s.scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

          return (
            <div 
              key={s.id}
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '1.5rem',
                alignItems: 'center',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '3px solid #1a1a2e',
                boxShadow: '5px 5px 0px #1a1a2e',
                borderLeft: isFullyMarked ? '8px solid #00c853' : '8px solid #ff6d00',
                background: '#ffffff'
              }}
            >
              {/* Box 1: Solid Dark Date Block */}
              <div style={{
                background: '#1a1a2e',
                color: '#ffffff',
                border: '2px solid #1a1a2e',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                textAlign: 'center',
                minWidth: '110px',
                boxShadow: '2px 2px 0px #1a1a2e'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: isFullyMarked ? '#00c853' : '#ff6d00', letterSpacing: '0.05em' }}>
                  {sessionDate.split(' ')[0]}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: '0.1rem 0' }}>
                  {sessionDate.split(' ').slice(1).join(' ')}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Clock size={12} color="#ffffff" /> {sessionTime}
                </div>
              </div>

              {/* Box 2: Subject, Branch & Breakdown */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    background: '#2979ff',
                    color: '#ffffff',
                    border: '1.5px solid #1a1a2e'
                  }}>
                    📍 {s.subject?.batch?.name || 'Main Campus'}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    background: '#aa00ff',
                    color: '#ffffff',
                    border: '1.5px solid #1a1a2e'
                  }}>
                    📚 {s.subject.name}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.8rem' }}>
                  {s.title}
                </h3>

                {/* Colored Attendance Metrics Chips */}
                {totalStudents === 0 ? (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '50px', 
                    background: '#fff3e0',
                    color: '#ff6d00',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    border: '2px solid #1a1a2e'
                  }}>
                    <AlertCircle size={14} color="#ff6d00" /> No students enrolled in subject
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '50px',
                        background: '#00c853',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        border: '1.5px solid #1a1a2e'
                      }}>
                        Physical: {physical}
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '50px',
                        background: '#2979ff',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        border: '1.5px solid #1a1a2e'
                      }}>
                        Online: {online}
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '50px',
                        background: '#f50057',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        border: '1.5px solid #1a1a2e'
                      }}>
                        Absent: {absent}
                      </div>

                      {unmarked > 0 && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '50px',
                          background: '#ff6d00',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 900,
                          border: '1.5px solid #1a1a2e'
                        }}>
                          <Clock size={13} color="#ffffff" /> Unmarked: {unmarked}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar Container */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '380px', marginTop: '0.2rem' }}>
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#e2e8f0', border: '1px solid #1a1a2e', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${markedPct}%`, 
                          height: '100%', 
                          background: isFullyMarked ? '#00c853' : '#ff6d00',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', minWidth: '70px' }}>
                        {markedCount} / {totalStudents} ({markedPct}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 3: Primary Action CTA */}
              <div>
                <Link 
                  href={`/dashboard/teacher/subjects/${s.subjectId}/sessions/${s.id}/attendance`} 
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.25rem', 
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    borderRadius: '50px',
                    background: unmarked > 0 ? '#00c853' : '#ffffff',
                    color: unmarked > 0 ? '#ffffff' : '#1a1a2e',
                    border: '2px solid #1a1a2e',
                    boxShadow: '3px 3px 0px #1a1a2e',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <CheckSquare size={16} />
                  {unmarked > 0 ? 'Mark attendance' : 'View breakdown'}
                </Link>
              </div>
            </div>
          )
        })}

        {classSessions.length === 0 && (
          <EmptyState
            title="No Active Class Sessions"
            description="You currently don't have any class sessions scheduled or pending attendance review."
            actionLabel="Back to dashboard"
            actionHref="/dashboard/teacher"
          />
        )}
      </div>
    </div>
  )
}

