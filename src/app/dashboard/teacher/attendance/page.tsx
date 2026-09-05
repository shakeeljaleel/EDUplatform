import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

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

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Global Attendance Overview</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Track attendance and view breakdowns across all your classes.</p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Subject / Topic</th>
              <th>Attendance Breakdown</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classSessions.map(s => {
              const totalStudents = s.subject._count.enrollments
              const physical = s.attendance.filter(a => a.status === 'PHYSICAL').length
              const online = s.attendance.filter(a => a.status === 'ONLINE').length
              const absent = s.attendance.filter(a => a.status === 'ABSENT').length
              const markedCount = physical + online + absent
              const unmarked = Math.max(0, totalStudents - markedCount)

              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>
                    {s.scheduledDate.toLocaleDateString('en-GB', { 
                      weekday: 'short', day: 'numeric', month: 'short' 
                    })}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      {s.scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.subject.batch.branch?.name} → {s.subject.name}
                    </div>
                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                  </td>
                  <td>
                    {totalStudents === 0 ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No students enrolled</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-paid" title="Physical">P: {physical}</span>
                        <span className="badge badge-pending" title="Online" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>O: {online}</span>
                        <span className="badge badge-level" title="Absent" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>A: {absent}</span>
                        {unmarked > 0 && (
                          <span className="badge badge-level" title="Unmarked" style={{ opacity: 0.7 }}>Unmarked: {unmarked}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <Link 
                      href={`/dashboard/teacher/subjects/${s.subjectId}/sessions/${s.id}/attendance`} 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-tertiary)' }}
                    >
                      {unmarked > 0 ? 'Mark Attendance' : 'View Attendance'}
                    </Link>
                  </td>
                </tr>
              )
            })}
            {classSessions.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No active class sessions found across your subjects.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
