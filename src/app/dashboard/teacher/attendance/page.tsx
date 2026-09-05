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
        teachers: {
          some: {
            userId: session.user.id
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
          batch: {
            include: { branch: true }
          },
          _count: {
            select: {
              enrollments: { where: { status: 'APPROVED' } }
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
    const totalStudents = s.subject._count.enrollments
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
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Attendance Intelligence
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Track class participation, manage student roll calls, and monitor attendance metrics across all your active courses.
              </p>
            </div>
          </div>
        </div>

        <Link 
          href="/dashboard/teacher" 
          className="btn-secondary" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      {/* Summary Stat Boxes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>Total Class Sessions</span>
            <span style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
              <Calendar size={18} />
            </span>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSessions}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Active scheduled lectures</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--warning-amber)' }}>Pending Roll Calls</span>
            <span style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning-amber)' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pendingSessionsCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Requires teacher action</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2563eb' }}>Avg Attendance Rate</span>
            <span style={{ padding: '6px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb' }}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{overallAttendancePct}%</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Physical + Online combined</div>
        </div>
      </div>

      {/* Main Content Cards Grid / Box List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {classSessions.map(s => {
          const totalStudents = s.subject._count.enrollments
          const physical = s.attendance.filter(a => a.status === 'PHYSICAL').length
          const online = s.attendance.filter(a => a.status === 'ONLINE').length
          const absent = s.attendance.filter(a => a.status === 'ABSENT').length
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
                borderRadius: '18px',
                borderLeft: isFullyMarked ? '6px solid var(--primary)' : '6px solid var(--warning-amber)',
                background: 'var(--bg-secondary)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Box 1: Colored Date & Time Badge */}
              <div style={{
                background: isFullyMarked 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05))' 
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
                border: isFullyMarked ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                textAlign: 'center',
                minWidth: '105px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: isFullyMarked ? 'var(--primary)' : 'var(--warning-amber)', letterSpacing: '0.05em' }}>
                  {sessionDate.split(' ')[0]}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.1rem 0' }}>
                  {sessionDate.split(' ').slice(1).join(' ')}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> {sessionTime}
                </div>
              </div>

              {/* Box 2: Subject, Branch & Detailed Breakdown */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#2563eb',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    📍 {s.subject.batch.branch?.name || 'Main Branch'}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: '#7c3aed',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    📚 {s.subject.name}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.8rem' }}>
                  {s.title}
                </h3>

                {/* Colored Attendance Metrics Chips */}
                {totalStudents === 0 ? (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '8px', 
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}>
                    <AlertCircle size={14} /> No students enrolled in subject
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--primary)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                        Physical: {physical}
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#2563eb',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }}></span>
                        Online: {online}
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: 'var(--error)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)' }}></span>
                        Absent: {absent}
                      </div>

                      {unmarked > 0 && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '10px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--warning-amber)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          <Clock size={13} /> Unmarked: {unmarked}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar Container */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '380px', marginTop: '0.2rem' }}>
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${markedPct}%`, 
                          height: '100%', 
                          background: isFullyMarked 
                            ? 'linear-gradient(90deg, #10b981, #059669)' 
                            : 'linear-gradient(90deg, #f59e0b, #d97706)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '70px' }}>
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
                  className={unmarked > 0 ? "btn-primary" : "btn-secondary"} 
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem', 
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    boxShadow: unmarked > 0 ? '0 4px 14px rgba(16, 185, 129, 0.25)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <CheckSquare size={16} />
                  {unmarked > 0 ? 'Mark Attendance' : 'View Breakdown'}
                </Link>
              </div>
            </div>
          )
        })}

        {classSessions.length === 0 && (
          <EmptyState
            title="No Active Class Sessions"
            description="You currently don't have any class sessions scheduled or pending attendance review."
            actionLabel="Back to Dashboard"
            actionHref="/dashboard/teacher"
          />
        )}
      </div>
    </div>
  )
}

