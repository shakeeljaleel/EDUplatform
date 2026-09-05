import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { SyllabusIcon, RoughFilter } from '@/components/HandDrawnIcons'

export default async function StudentDashboard() {
  const session = await getSession()
  if (!session) return null
  const studentUserId = session.user.id

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId }
  })

  const [exams, quizzes, attendance, subjectEnrollments, notifications] = await Promise.all([
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
      where: { userId: studentUserId, status: { in: ['APPROVED', 'ACTIVE'] } },
      include: { subject: { include: { batch: { include: { branch: true } } } } }
    }),
    prisma.notification.findMany({
      where: { userId: studentUserId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  const subjectIds = subjectEnrollments.map(e => e.subjectId)
  
  // Upcoming classes
  const upcomingClasses = await prisma.classSession.findMany({
    where: { 
      subjectId: { in: subjectIds },
      scheduledDate: { gte: new Date() },
      status: { not: 'CANCELLED' }
    },
    include: { 
      subject: true,
      resources: true,
      syllabusObjectives: true
    },
    orderBy: { scheduledDate: 'asc' },
    take: 5
  })

  // Announcements
  const announcements = await prisma.announcement.findMany({
    where: { subjectId: { in: subjectIds } },
    include: { subject: true, author: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  // Fetch syllabus coverage data
  const subjectsWithObjectives = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    include: {
      syllabusObjectives: {
        include: {
          classes: {
            where: { status: 'TAUGHT' },
            select: { id: true }
          }
        }
      }
    }
  })

  // Calculate Ranking logic
  const enrollment = await prisma.batchEnrollment.findFirst({
    where: { userId: studentUserId },
    select: { batchId: true }
  })

  let myRank = 0
  let myPercentile = 0
  let leaderboard: any[] = []

  if (enrollment) {
    const batchStudents = await prisma.batchEnrollment.findMany({
      where: { batchId: enrollment.batchId, role: 'STUDENT' },
      select: { userId: true }
    })

    const studentIds = batchStudents.map(s => s.userId)
    const allStats = await Promise.all(studentIds.map(async (id) => {
      const [u, p, q, e] = await Promise.all([
        prisma.user.findUnique({ where: { id }, select: { name: true } }),
        prisma.studentProfile.findUnique({ where: { userId: id }, select: { stars: true, medals: true } }),
        prisma.quizAttempt.findMany({ 
          where: { userId: id, status: 'GRADED' }, 
          select: { score: true, quiz: { include: { questions: { select: { points: true } } } } } 
        }),
        prisma.examRecord.findMany({ where: { userId: id }, select: { marks: true, maxMarks: true } })
      ])
      
      const qAvg = q.length > 0 ? q.reduce((sum, attempt) => {
        const max = attempt.quiz?.questions?.reduce((s: number, ques: any) => s + (ques.points || 0), 0) || 1
        return sum + (attempt.score / max) * 100
      }, 0) / q.length : 0
      
      const eAvg = e.length > 0 ? e.reduce((s, x) => s + (x.marks / (x.maxMarks || 1)) * 100, 0) / e.length : 0
      
      return { 
        id, 
        name: u?.name || 'Anonymous Student', 
        stars: p?.stars || 0,
        medals: p?.medals || 0,
        score: Math.round((p?.stars || 0) * 10 + qAvg + eAvg) 
      }
    }))

    allStats.sort((a, b) => b.score - a.score)
    myRank = allStats.findIndex(s => s.id === studentUserId) + 1
    myPercentile = Math.round(((allStats.length - myRank) / Math.max(1, allStats.length)) * 100)
    leaderboard = allStats.map((s, idx) => ({ ...s, rank: idx + 1 }))
  }

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
      date: e.date,
      pct: (e.marks / (e.maxMarks || 1)) * 100,
      classAvg: avg
    }
  }))

  // Calculate comparative analytics for Quizzes
  const quizStats = await Promise.all(quizzes.map(async (q) => {
    // Get total possible points for this quiz
    const quizQuestions = await prisma.question.findMany({
      where: { quizId: q.quizId },
      select: { points: true }
    })
    const maxPoints = quizQuestions.reduce((sum, q) => sum + (q.points || 0), 0) || 1

    const allAttempts = await prisma.quizAttempt.findMany({
      where: { quizId: q.quizId, status: 'GRADED' },
      select: { score: true, answers: { select: { pointsAwarded: true } } }
    })

    const calculateScorePct = (attempt: any) => {
      const awarded = attempt.score > 0 ? attempt.score : attempt.answers.reduce((s: number, ans: any) => s + (ans.pointsAwarded || 0), 0)
      return (awarded / maxPoints) * 100
    }

    const avgPct = allAttempts.length > 0
      ? allAttempts.reduce((sum, a) => sum + calculateScorePct(a), 0) / allAttempts.length
      : 0
    
    const myScorePct = calculateScorePct(q)
    
    return {
      id: `quiz_${q.id}`,
      title: q.quiz.title,
      subject: q.quiz.subject?.name || 'General',
      date: q.updatedAt,
      pct: myScorePct,
      classAvg: avgPct
    }
  }))

  const examData = examStats.slice().reverse().slice(-10)
  const quizData = quizStats.slice().reverse().slice(-10)

  // Calculate attendance stats
  const totalClasses = attendance.length
  const presentCount = attendance.filter(a => a.status !== 'ABSENT').length
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100

  // Fetch Batch Insights (Exam Sessions)
  const examSessions = await prisma.examSession.findMany({
    where: { subjectId: { in: subjectIds } },
    include: { subject: true },
    orderBy: { createdAt: 'desc' },
    take: 3
  })

  return (
    <div className="content-wrapper">
      {/* Redundant header removed - global header in layout.tsx is used */}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        <div className="premium-card-v2 stagger-1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Overall Attendance</h3>
            <span style={{ fontSize: '1.5rem' }}>📋</span>
          </div>
          <div style={{ fontSize: '2.75rem', fontWeight: 900, color: attendanceRate < 75 ? 'var(--error)' : 'var(--accent-primary)', lineHeight: 1 }}>
            {attendanceRate}%
          </div>
          <p style={{ fontSize: '0.875rem', marginTop: '1rem', fontWeight: 700 }}>{presentCount} sessions of {totalClasses}</p>
        </div>

        <div className="premium-card-v2 stagger-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Student Status</h3>
            <span style={{ fontSize: '1.5rem' }}>💎</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className={`badge ${profile?.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
              {profile?.paymentStatus || 'Pending'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
              <strong style={{ marginLeft: '0.5rem', fontSize: '1.125rem' }}>{profile?.stars || 0}</strong>
            </div>
            <div>
              <span style={{ fontSize: '1.25rem' }}>🏅</span>
              <strong style={{ marginLeft: '0.5rem', fontSize: '1.125rem' }}>{profile?.medals || 0}</strong>
            </div>
          </div>
        </div>

        <div className="premium-card-v2 stagger-3" style={{ borderTop: '12px solid var(--accent-primary)', boxShadow: '12px 12px 0 var(--accent-glow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Class Rank</h3>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
          </div>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1, textShadow: '0 4px 12px var(--accent-glow)' }}>
            #{myRank || '--'}
          </div>
          <p style={{ fontSize: '1rem', marginTop: '1.5rem', fontWeight: 900 }}>Top {Math.max(1, 100 - (myPercentile || 0))}% of batch</p>
        </div>
      </div>

      {/* BATCH INSIGHTS SECTION */}
      {examSessions.length > 0 && (
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🧬</span> Exam Session Insights
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {examSessions.map(s => (
              <div key={s.id} className="premium-card-v2" style={{ borderLeft: '10px solid var(--accent-primary)' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{s.title}</h4>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <span>{s.subject.name}</span>
                    <span>•</span>
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.9rem', padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)' }}>
                    <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.25rem' }}>Class Highlights:</strong>
                    {s.highlights || 'No highlights recorded for this session.'}
                  </div>
                  <div style={{ fontSize: '0.9rem', padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--error)' }}>
                    <strong style={{ color: 'var(--error)', display: 'block', marginBottom: '0.25rem' }}>Common Challenges:</strong>
                    {s.lows || 'No specific challenges noted.'}
                  </div>
                  <div style={{ fontSize: '0.9rem', padding: '1rem', borderRadius: '12px', background: 'var(--bg-accent)', border: '2px dashed var(--dna-blue)' }}>
                    <strong style={{ color: 'var(--dna-blue)', display: 'block', marginBottom: '0.25rem' }}>Examiner\'s Suggestions:</strong>
                    {s.suggestions || 'No suggestions recorded yet.'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SyllabusIcon size={28} color="var(--accent-primary)" />
          Academic Roadmap (Upcoming Classes)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {upcomingClasses.map((c, idx) => (
            <div key={c.id} className="premium-card-v2 stagger-2" style={{ boxShadow: '12px 12px 0 var(--dna-blue)', overflow: 'visible' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--dna-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '8px', border: '2px solid var(--dna-blue)' }}>
                  {new Date(c.scheduledDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {new Date(c.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>{c.title}</h3>
              <div style={{ fontSize: '1rem', color: 'var(--accent-primary)', fontWeight: 900, marginBottom: '1.5rem' }}>{c.subject.name}</div>
              
              {c.syllabusObjectives.length > 0 && (
                <div style={{ background: 'var(--bg-accent)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: 'var(--sketch-border)', boxShadow: '4px 4px 0 var(--text-primary)', filter: 'url(#rough-edge)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Learning Objective</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{c.syllabusObjectives[0].code}: {c.syllabusObjectives[0].description}</div>
                </div>
              )}

              {c.resources.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {c.resources.map(r => (
                    <a key={r.id} href={r.url} target="_blank" rel="noreferrer" style={{ 
                      fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '12px', 
                      background: 'white', border: '2px solid var(--text-primary)', color: 'var(--text-primary)', 
                      textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      fontWeight: 800, boxShadow: '2px 2px 0 var(--text-primary)'
                    }}>
                      {r.type === 'VIDEO' ? '📺' : '📄'} {r.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {upcomingClasses.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No upcoming classes scheduled. Enjoy your break! 🌴
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {/* Performance Charts */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Subject Performance (Avg %)</h3>
          <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '3px solid var(--text-primary)', filter: 'url(#rough-edge)' }}>
            {examData.map((e) => {
              const pct = Math.min(100, Math.max(5, e.pct || 0))
              const avgPct = Math.min(100, Math.max(5, e.classAvg || 0))
              return (
                <div key={e.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative' }}>
                   <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${avgPct}%`, borderTop: '3px dashed #f59e0b', zIndex: 1, opacity: 0.6 }}></div>
                   <div style={{ 
                     width: '80%', height: `${pct}%`, 
                     background: 'var(--accent-primary)', 
                     border: '3px solid var(--text-primary)',
                     borderRadius: '4px 4px 0 0', position: 'absolute', bottom: '0', zIndex: 2, 
                     transition: 'height 1s ease',
                     boxShadow: '4px 4px 0 var(--text-primary)'
                   }}>
                      <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 900 }}>{Math.round(pct)}%</div>
                   </div>
                </div>
              )
            })}
            {examData.length === 0 && <p style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>No data available</p>}
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem', fontWeight: 900 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', background: 'var(--accent-primary)', border: '2px solid var(--text-primary)' }}></div> Your Score</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '3px', background: '#f59e0b' }}></div> Class Avg</span>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Practice Quiz Analytics</h3>
          <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '1.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '3px solid var(--text-primary)', filter: 'url(#rough-edge)' }}>
            {quizData.map((q) => {
              const pct = Math.min(100, Math.max(5, q.pct || 0))
              const avgPct = Math.min(100, Math.max(5, q.classAvg || 0))
              return (
                <div key={q.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative' }}>
                   <div style={{ position: 'absolute', bottom: '0', width: '100%', height: `${avgPct}%`, borderTop: '3px dashed var(--dna-purple)', zIndex: 1, opacity: 0.6 }}></div>
                   <div style={{ 
                     width: '80%', height: `${pct}%`, 
                     background: 'var(--dna-blue)', 
                     border: '3px solid var(--text-primary)',
                     borderRadius: '4px 4px 0 0', position: 'absolute', bottom: '0', zIndex: 2, 
                     transition: 'height 1s ease',
                     boxShadow: '4px 4px 0 var(--text-primary)'
                   }}>
                      <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 900 }}>{Math.round(pct)}%</div>
                   </div>
                </div>
              )
            })}
            {quizData.length === 0 && <p style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>No data available</p>}
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem', fontWeight: 900 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', background: 'var(--dna-blue)', border: '2px solid var(--text-primary)' }}></div> Your Score</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '3px', background: 'var(--dna-purple)' }}></div> Class Avg</span>
          </div>
        </div>
      </div>

      {/* BATCH LEADERBOARD */}
      {leaderboard.length > 0 && (
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '2.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🏆</span> Batch Leaderboard
          </h2>
          <div className="sketch-table-container">
            <table className="sketch-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px', textAlign: 'center' }}>Rank</th>
                  <th style={{ textAlign: 'left' }}>Student Name</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Stars ⭐</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Medals 🏅</th>
                  <th style={{ width: '160px', textAlign: 'center' }}>Helix Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((s) => (
                  <tr key={s.id} style={{ backgroundColor: s.id === studentUserId ? 'rgba(16, 185, 129, 0.04)' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px',
                        borderRadius: '10px', border: '2px solid var(--text-primary)',
                        backgroundColor: s.rank === 1 ? '#eab308' : s.rank === 2 ? '#94a3b8' : s.rank === 3 ? '#b45309' : 'white',
                        color: s.rank <= 3 ? 'white' : 'var(--text-primary)',
                        fontWeight: 900,
                        boxShadow: '2px 2px 0 var(--text-primary)'
                      }}>
                        {s.rank}
                      </div>
                    </td>
                    <td style={{ fontWeight: 900, fontSize: '1.1rem' }}>
                      {s.name} {s.id === studentUserId && <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginLeft: '0.5rem', fontWeight: 900, border: '2px solid var(--accent-primary)', padding: '2px 8px', borderRadius: '8px' }}>YOU</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>{s.stars}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>{s.medals}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{s.score} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: '2.5rem', fontSize: '2.5rem' }}>My Enrolled Subjects</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        {subjectEnrollments.map((e, idx) => {
          const subjectData = subjectsWithObjectives.find(s => s.id === e.subject.id)
          const totalObjectives = subjectData?.syllabusObjectives.length || 0
          const taughtObjectives = subjectData?.syllabusObjectives.filter(obj => obj.classes.length > 0).length || 0
          const syllabusPct = totalObjectives > 0 ? Math.round((taughtObjectives / totalObjectives) * 100) : 0

          return (
            <div key={e.subject.id} className="premium-card-v2" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '12px solid var(--text-primary)' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{e.subject.batch.name}</h4>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{e.subject.name}</h3>
              </div>
              
              <div style={{ background: 'var(--bg-accent)', padding: '1.5rem', borderRadius: '16px', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '6px 6px 0 var(--text-primary)' }}>
                <div style={{ 
                  position: 'relative', 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: `conic-gradient(var(--accent-primary) ${syllabusPct}%, var(--bg-tertiary) 0)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '2px solid var(--text-primary)'
                }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>
                    {syllabusPct}%
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 900 }}>Syllabus</div>
                    <Link href={`/dashboard/student/subjects/${e.subject.id}/syllabus`} style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 900, textDecoration: 'underline' }}>Breakdown</Link>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{taughtObjectives} / {totalObjectives} Objectives</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <Link href={`/dashboard/student/subjects/${e.subject.id}/calendar`} className="btn-secondary" style={{ padding: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '2px solid var(--text-primary)', fontWeight: 900, borderRadius: '12px' }}>📅 Schedule</Link>
                <Link href={`/dashboard/student/subjects/${e.subject.id}/grading`} className="btn-secondary" style={{ padding: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '2px solid var(--dna-pink)', color: 'var(--dna-pink)', fontWeight: 900, borderRadius: '12px' }}>🤖 Marking</Link>
                <Link href={`/dashboard/student/subjects/${e.subject.id}/forum`} className="btn-secondary" style={{ padding: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '2px solid var(--text-primary)', fontWeight: 900, borderRadius: '12px' }}>💬 Forum</Link>
                <Link href={`/dashboard/student/messages`} className="btn-secondary" style={{ padding: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '2px solid var(--text-primary)', fontWeight: 900, borderRadius: '12px' }}>✉️ Inbox</Link>
                <Link href={`/dashboard/student/subjects/${e.subject.id}/adaptive-path`} className="btn-secondary" style={{ padding: '1.25rem', fontSize: '1rem', textAlign: 'center', border: '2px solid var(--accent-primary)', color: 'var(--accent-primary)', gridColumn: 'span 2', fontWeight: 900, borderRadius: '12px', boxShadow: '6px 6px 0 var(--accent-primary)' }}>🪄 AI Study Path</Link>
              </div>
            </div>
          )
        })}
      </div>
      <RoughFilter />
    </div>
  )
}
