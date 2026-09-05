import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return null
  const { id: studentUserId } = await params

  // Verify this student belongs to this parent
  const childProfile = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
    include: {
      user: true,
      parent: true
    }
  })

  if (!childProfile || childProfile.parent?.userId !== session.user.id) {
    return <div>Access Denied or Child Not Found</div>
  }

  const [exams, quizzes, attendance, enrollments, notifications] = await Promise.all([
    prisma.examRecord.findMany({ where: { userId: studentUserId }, include: { subject: true }, orderBy: { date: 'desc' } }),
    prisma.quizAttempt.findMany({ 
      where: { userId: studentUserId, status: 'GRADED' }, 
      include: { quiz: { include: { subject: true } }, answers: true },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.attendanceRecord.findMany({ 
      where: { userId: studentUserId }, 
      include: { classSession: true },
      orderBy: { classSession: { scheduledDate: 'desc' } }
    }),
    prisma.subjectEnrollment.findMany({
      where: { userId: studentUserId, status: 'APPROVED' },
      include: { subject: { include: { batch: true } } }
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  const subjectIds = enrollments.map(e => e.subjectId)
  const announcements = await prisma.announcement.findMany({
    where: { subjectId: { in: subjectIds } },
    include: { subject: true, author: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  // Calculate comparative analytics for Exams
  const examStats = await Promise.all(exams.map(async (e) => {
    const allRecords = await prisma.examRecord.findMany({
      where: { subjectId: e.subjectId, title: e.title },
      select: { marks: true, maxMarks: true }
    })
    const avg = allRecords.length > 0 
      ? allRecords.reduce((sum, r) => sum + (r.marks / (r.maxMarks || 1)) * 100, 0) / allRecords.length 
      : 0
    return {
      id: `exam_${e.id}`,
      title: e.title,
      subject: e.subject.name,
      type: 'Physical Exam',
      date: e.date,
      pct: (e.marks / (e.maxMarks || 1)) * 100,
      classAvg: avg
    }
  }))

  // Calculate comparative analytics for Quizzes
  const quizStats = await Promise.all(quizzes.map(async (q) => {
    const allAttempts = await prisma.quizAttempt.findMany({
      where: { quizId: q.quizId, status: 'GRADED' },
      select: { score: true, answers: { select: { pointsAwarded: true } } }
    })
    const avg = allAttempts.length > 0
      ? allAttempts.reduce((sum, a) => {
          const score = a.score > 0 ? a.score : a.answers.reduce((s, ans) => s + ans.pointsAwarded, 0)
          return sum + score
        }, 0) / allAttempts.length
      : 0
    
    const myScore = q.score > 0 ? q.score : q.answers.reduce((s, ans) => s + ans.pointsAwarded, 0)
    return {
      id: `quiz_${q.id}`,
      title: q.quiz.title,
      subject: q.quiz.subject?.name || 'General',
      type: 'Online Quiz',
      date: q.updatedAt,
      pct: myScore,
      classAvg: avg
    }
  }))

  const combinedMarks = [...examStats, ...quizStats].sort((a, b) => b.date.getTime() - a.date.getTime())
  
  const examData = examStats.slice().reverse().slice(-10)
  const quizData = quizStats.slice().reverse().slice(-10)

  // Calculate attendance stats
  const totalClasses = attendance.length
  const presentCount = attendance.filter(a => a.status !== 'ABSENT').length
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard/parent" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>← Back to Overview</Link>
        <h1 style={{ fontSize: '2rem', marginTop: '1rem' }}>{childProfile.user.name}'s Academic Report</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card stagger-1">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Overall Attendance</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: attendanceRate < 75 ? 'var(--error)' : 'var(--success)' }}>
            {attendanceRate}%
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{presentCount} sessions attended out of {totalClasses}</p>
        </div>

        <div className="card stagger-2">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Enrolled Subjects & Lesson Plans</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {enrollments.map(e => (
              <Link key={e.id} href={`/dashboard/parent/children/${studentUserId}/subjects/${e.subjectId}/calendar`} className="badge badge-level" style={{ textDecoration: 'none', cursor: 'pointer', padding: '0.5rem', border: '1px solid var(--accent-primary)' }}>
                📅 View {e.subject.name} Plan
              </Link>
            ))}
            {enrollments.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>Not enrolled in any subjects.</span>}
          </div>
        </div>

        <div className="card stagger-3">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Teacher Announcements</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
            {announcements.map(a => (
              <div key={a.id} style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--bg-tertiary)' }}>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{a.title}</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{a.content}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginTop: '4px' }}>— {a.author.name} ({a.subject.name})</div>
              </div>
            ))}
            {announcements.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No recent announcements.</span>}
          </div>
        </div>

        <div className="card stagger-3">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Recent Notifications</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
            {notifications.map(n => (
              <div key={n.id} style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '6px' }}>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{n.title}</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{n.message}</span>
              </div>
            ))}
            {notifications.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No recent notifications.</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Formal Exam Tracker */}
        <div className="card stagger-4" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(240,253,244,0.9))' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Formal Exam Tracker</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Compare child's physical and formal mock exam scores against the class average.</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '2rem 1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '16px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)', position: 'relative' }}>
            {examData.map((e) => {
              const pct = Math.min(100, Math.max(0, e.pct || 0))
              const avgPct = Math.min(100, Math.max(0, e.classAvg || 0))
              return (
                <div key={e.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', height: '100%' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${avgPct}%`, borderTop: '2px dashed var(--warning)', zIndex: 1, opacity: 0.5 }}>
                    <div style={{ position: 'absolute', top: '-16px', right: '-10px', fontSize: '0.6rem', color: 'var(--warning)', fontWeight: 700 }}>Avg {Math.round(avgPct)}</div>
                  </div>
                  <div style={{ width: '80%', height: `${pct}%`, background: 'linear-gradient(to top, var(--accent-primary), #34d399)', borderRadius: '6px 6px 0 0', position: 'absolute', bottom: '0', minHeight: '10px', transition: 'all 0.3s ease', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 2 }}>
                    <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Math.round(pct)}%</div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', fontWeight: 500, position: 'absolute', bottom: '-20px' }} title={e.title}>
                    {e.title}
                  </div>
                </div>
              )
            })}
            {examData.length === 0 && <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-secondary)' }}>No exams recorded yet.</div>}
          </div>
          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: 'var(--accent-primary)', borderRadius: '3px' }}></div> Child's Score</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', borderTop: '2px dashed var(--warning)' }}></div> Class Average</span>
          </div>
        </div>

        {/* Quiz Analytics */}
        <div className="card stagger-4" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(239,246,255,0.9))' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Continuous Quiz Analytics</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Track continuous practice quiz performance vs peers.</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '2rem 1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '16px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)', position: 'relative' }}>
            {quizData.map((q) => {
              const pct = Math.min(100, Math.max(0, q.pct || 0))
              const avgPct = Math.min(100, Math.max(0, q.classAvg || 0))
              return (
                <div key={q.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', height: '100%' }}>
                  <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${avgPct}%`, borderTop: '2px dashed var(--dna-purple)', zIndex: 1, opacity: 0.5 }}>
                    <div style={{ position: 'absolute', top: '-16px', right: '-10px', fontSize: '0.6rem', color: 'var(--dna-purple)', fontWeight: 700 }}>Avg {Math.round(avgPct)}</div>
                  </div>
                  <div style={{ width: '80%', height: `${pct}%`, background: 'linear-gradient(to top, var(--dna-blue), #60a5fa)', borderRadius: '6px 6px 0 0', position: 'absolute', bottom: '0', minHeight: '10px', transition: 'all 0.3s ease', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 2 }}>
                    <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Math.round(pct)}%</div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', fontWeight: 500, position: 'absolute', bottom: '-20px' }} title={q.title}>
                    {q.title}
                  </div>
                </div>
              )
            })}
            {quizData.length === 0 && <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-secondary)' }}>No quizzes completed yet.</div>}
          </div>
          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: 'var(--dna-blue)', borderRadius: '3px' }}></div> Child's Score</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', borderTop: '2px dashed var(--dna-purple)' }}></div> Class Average</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div className="card stagger-5">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Chronological Marks List</h2>
          <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Assessment</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {combinedMarks.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.85rem' }}>{m.date.toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.subject} • {m.type}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>{Math.round(m.pct)}%</td>
                  </tr>
                ))}
                {combinedMarks.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>No assessments completed.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card stagger-5">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Detailed Attendance Log</h2>
          <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Topic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(a.classSession.scheduledDate).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.85rem' }}>{a.classSession.title}</td>
                    <td>
                      <span className={`badge ${a.status === 'PHYSICAL' ? 'badge-paid' : a.status === 'ONLINE' ? 'badge-pending' : 'badge-level'}`} style={{ fontSize: '0.7rem' }}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {attendance.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>No attendance records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
