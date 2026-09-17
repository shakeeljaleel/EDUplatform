import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import EmptyState from '@/components/EmptyState'
import StudentBatchHeaderBanner from '@/components/StudentBatchHeaderBanner'
import { BookOpen, CheckSquare, Star, Award, Clock, TrendingUp, Sparkles, ChevronRight, MessageSquare } from '@/components/Icons'
import { getSubjectColor } from '@/lib/subjectColors'

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
    prisma.studentEnrollment.findMany({
      where: { studentId: studentUserId },
      include: {
        batch: true,
        branch: true,
        subject: {
          include: {
            branchTeachers: {
              include: {
                teacher: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
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

  const activeEnrollment = subjectEnrollments.find(e => e.status === 'active')

  let myRank = 0
  let myPercentile = 0
  let leaderboard: any[] = []

  if (activeEnrollment) {
    const batchStudents = await prisma.studentEnrollment.findMany({
      where: { batchId: activeEnrollment.batchId, status: 'active' },
      select: { studentId: true }
    })

    const studentIds = Array.from(new Set(batchStudents.map(s => s.studentId)))
    const usersData = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        profile: { select: { stars: true, medals: true } },
        quizAttempts: {
          where: { status: 'GRADED' },
          select: { score: true, quiz: { select: { questions: { select: { points: true } } } } }
        },
        examRecords: { select: { marks: true, maxMarks: true } }
      }
    })

    const allStats = usersData.map(u => {
      const qAvg = u.quizAttempts.length > 0 ? u.quizAttempts.reduce((sum, attempt) => {
        const max = attempt.quiz?.questions?.reduce((s: number, ques: any) => s + (ques.points || 0), 0) || 1
        return sum + (attempt.score / max) * 100
      }, 0) / u.quizAttempts.length : 0

      const eAvg = u.examRecords.length > 0 ? u.examRecords.reduce((s, x) => s + (x.marks / (x.maxMarks || 1)) * 100, 0) / u.examRecords.length : 0

      return {
        id: u.id,
        name: u.name || 'Anonymous Student',
        stars: u.profile?.stars || 0,
        medals: u.profile?.medals || 0,
        score: Math.round((u.profile?.stars || 0) * 10 + qAvg + eAvg)
      }
    })

    allStats.sort((a, b) => b.score - a.score)
    myRank = allStats.findIndex(s => s.id === studentUserId) + 1
    myPercentile = Math.round(((allStats.length - myRank) / Math.max(1, allStats.length)) * 100)
    leaderboard = allStats.map((s, idx) => ({ ...s, rank: idx + 1 }))
  }

  // Calculate comparative analytics for Exams using single batch query
  const allExamRecords = await prisma.examRecord.findMany({
    where: { subjectId: { in: subjectIds } },
    select: { subjectId: true, title: true, marks: true, maxMarks: true }
  })
  const examAvgMap = new Map<string, number>()
  const examGroups = new Map<string, { total: number; count: number }>()
  allExamRecords.forEach(r => {
    const key = `${r.subjectId}_${r.title}`
    const curr = examGroups.get(key) || { total: 0, count: 0 }
    curr.total += (r.marks / (r.maxMarks || 1)) * 100
    curr.count += 1
    examGroups.set(key, curr)
  })
  examGroups.forEach((v, k) => {
    examAvgMap.set(k, v.count > 0 ? v.total / v.count : 0)
  })

  const examStats = exams.map(e => ({
    id: `exam_${e.id}`,
    title: e.title,
    subject: e.subject.name,
    date: e.date,
    pct: (e.marks / (e.maxMarks || 1)) * 100,
    classAvg: examAvgMap.get(`${e.subjectId}_${e.title}`) || 0
  }))

  // Calculate comparative analytics for Quizzes using single batch query
  const quizIds = quizzes.map(q => q.quizId)
  const [allQuestions, allAttempts] = await Promise.all([
    prisma.question.findMany({
      where: { quizId: { in: quizIds } },
      select: { quizId: true, points: true }
    }),
    prisma.quizAttempt.findMany({
      where: { quizId: { in: quizIds }, status: 'GRADED' },
      select: { quizId: true, score: true, answers: { select: { pointsAwarded: true } } }
    })
  ])

  const quizMaxPoints = new Map<string, number>()
  allQuestions.forEach(q => {
    quizMaxPoints.set(q.quizId, (quizMaxPoints.get(q.quizId) || 0) + (q.points || 0))
  })

  const quizAvgMap = new Map<string, number>()
  const quizAttemptGroups = new Map<string, { totalPct: number; count: number }>()
  allAttempts.forEach(a => {
    const max = quizMaxPoints.get(a.quizId) || 1
    const score = a.score > 0 ? a.score : a.answers.reduce((s, ans) => s + (ans.pointsAwarded || 0), 0)
    const pct = (score / max) * 100
    const curr = quizAttemptGroups.get(a.quizId) || { totalPct: 0, count: 0 }
    curr.totalPct += pct
    curr.count += 1
    quizAttemptGroups.set(a.quizId, curr)
  })
  quizAttemptGroups.forEach((v, k) => {
    quizAvgMap.set(k, v.count > 0 ? v.totalPct / v.count : 0)
  })

  const quizStats = quizzes.map(q => {
    const max = quizMaxPoints.get(q.quizId) || 1
    const myScore = q.score > 0 ? q.score : q.answers.reduce((s, ans) => s + (ans.pointsAwarded || 0), 0)
    return {
      id: `quiz_${q.id}`,
      title: q.quiz.title,
      subject: q.quiz.subject?.name || 'General',
      date: q.updatedAt,
      pct: (myScore / max) * 100,
      classAvg: quizAvgMap.get(q.quizId) || 0
    }
  })

  // Calculate Syllabus Progress Indicator
  let totalObjCount = 0
  let completedObjCount = 0
  subjectsWithObjectives.forEach(s => {
    s.syllabusObjectives.forEach(obj => {
      totalObjCount++
      if (obj.classes && obj.classes.length > 0) completedObjCount++
    })
  })
  const syllabusProgressPct = totalObjCount > 0 ? Math.round((completedObjCount / totalObjCount) * 100) : 0

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
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        <ol style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
          <li><Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Dashboard</Link></li>
          <li>/</li>
          <li aria-current="page" style={{ color: 'var(--text-primary)' }}>Overview</li>
        </ol>
      </nav>

      {/* Batch Enrollment Header Banner */}
      <StudentBatchHeaderBanner currentBatch={activeEnrollment?.batch || null} />

      {/* Pending Tasks & Quick Resume Panel */}
      <div className="premium-card-v2" style={{ marginBottom: '2.5rem', background: '#ffffff', border: '3px solid #1a1a2e', boxShadow: '5px 5px 0px #1a1a2e', borderLeft: '8px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--accent-primary)' }}>⚡ Active Learning Stream</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '0.25rem' }}>Pending Tasks & Upcoming Lessons</h2>
          </div>
          {upcomingClasses.length > 0 && (
            <Link href={`/dashboard/student/subjects/${upcomingClasses[0].subjectId}`} className="btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}>
              ▶ Resume Lesson: {upcomingClasses[0].title}
            </Link>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.7)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Upcoming Session</span>
            <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '0.25rem' }}>
              {upcomingClasses.length > 0 ? upcomingClasses[0].title : 'No sessions scheduled'}
            </div>
            {upcomingClasses.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                {new Date(upcomingClasses[0].scheduledDate).toLocaleDateString()} at {new Date(upcomingClasses[0].scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.7)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Recent Announcements</span>
            <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '0.25rem' }}>
              {announcements.length > 0 ? announcements[0].title : 'No new announcements'}
            </div>
            {announcements.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {announcements[0].subject.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        {/* Card 1 - Syllabus Completed - Solid Vivid Green */}
        <div className="stat-card" style={{
          background: '#00c853',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 800 }}>Syllabus Completed</h3>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
            {syllabusProgressPct}%
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
            <div style={{ width: `${syllabusProgressPct}%`, height: '100%', background: '#ffffff', transition: 'width 0.5s ease' }}></div>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#ffffff', fontWeight: 700 }}>
            {completedObjCount} of {totalObjCount} objectives mastered
          </p>
        </div>

        {/* Card 2 - Overall Attendance - Solid Teal */}
        <div className="stat-card" style={{
          background: '#00bcd4',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>Overall Attendance</h3>
            <span style={{ fontSize: '1.5rem' }}>📋</span>
          </div>
          <div style={{ fontSize: '2.75rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
            {attendanceRate}%
          </div>
          <p style={{ fontSize: '0.875rem', marginTop: '1rem', fontWeight: 700, color: '#ffffff' }}>{presentCount} sessions of {totalClasses}</p>
        </div>

        {/* Card 3 - Student Status - Solid Electric Blue */}
        <div className="stat-card" style={{
          background: '#2979ff',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>Student Status</h3>
            <span style={{ fontSize: '1.5rem' }}>💎</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{
              background: 'rgba(255,255,255,0.25)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)',
              padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800
            }}>
              💳 {profile?.paymentStatus || 'Pending'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
              <strong style={{ marginLeft: '0.5rem', fontSize: '1.125rem', color: '#ffffff' }}>{profile?.stars || 0}</strong>
            </div>
            <div>
              <span style={{ fontSize: '1.25rem' }}>🏅</span>
              <strong style={{ marginLeft: '0.5rem', fontSize: '1.125rem', color: '#ffffff' }}>{profile?.medals || 0}</strong>
            </div>
          </div>
        </div>

        {/* Card 4 - Class Rank - Solid Vibrant Purple */}
        <div className="stat-card" style={{
          background: '#aa00ff',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>Class Rank</h3>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
          </div>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
            #{myRank || '--'}
          </div>
          <p style={{ fontSize: '1rem', marginTop: '1.5rem', fontWeight: 900, color: '#ffffff' }}>Top {Math.max(1, 100 - (myPercentile || 0))}% of batch</p>
        </div>
      </div>

      {/* BATCH INSIGHTS PANEL */}
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
          <BookOpen size={28} color="#10b981" />
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
            <div style={{ gridColumn: '1/-1' }}>
              <EmptyState 
                icon={<BookOpen size={36} color="var(--accent-primary)" />}
                title="No Upcoming Classes Scheduled" 
                description="You are all caught up! There are no pending live sessions or class deadlines scheduled right now."
                actionLabel="Explore Quizzes & Materials"
                actionHref="/dashboard/student/quizzes"
              />
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
                {leaderboard.slice(0, 5).map((s) => {
                  const rankBg = s.rank === 1 ? 'linear-gradient(135deg, #ffd700, #ffae00)'
                                : s.rank === 2 ? 'linear-gradient(135deg, #e0e0e0, #9e9e9e)'
                                : s.rank === 3 ? 'linear-gradient(135deg, #cd7f32, #8b4513)'
                                : '#ffffff'
                  const rankGlow = s.rank === 1 ? '0 0 14px rgba(255, 215, 0, 0.7)'
                                 : s.rank === 2 ? '0 0 10px rgba(158, 158, 158, 0.5)'
                                 : s.rank === 3 ? '0 0 10px rgba(205, 127, 50, 0.5)'
                                 : 'none'

                  return (
                    <tr key={s.id} style={{ backgroundColor: s.id === studentUserId ? 'rgba(0, 200, 83, 0.08)' : 'transparent' }}>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                          borderRadius: '12px', border: s.rank <= 3 ? 'none' : '2px solid var(--text-primary)',
                          background: rankBg,
                          color: s.rank <= 3 ? '#ffffff' : 'var(--text-primary)',
                          fontWeight: 900,
                          boxShadow: rankGlow
                        }}>
                          {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : s.rank}
                        </div>
                      </td>
                      <td style={{ fontWeight: 900, fontSize: '1.1rem' }}>
                        {s.name} {s.id === studentUserId && <span style={{ color: '#00c853', fontSize: '0.8rem', marginLeft: '0.5rem', fontWeight: 900, border: '2px solid #00c853', padding: '2px 8px', borderRadius: '8px' }}>YOU</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>{s.stars}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>{s.medals}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#00c853' }}>{s.score} pts</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: '2.5rem', fontSize: '2.5rem', fontWeight: 900 }}>My Enrolled Subjects</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.75rem', marginBottom: '4rem' }}>
        {subjectEnrollments.map((e, idx) => {
          const subjectColor = e.subject.colour || getSubjectColor(e.subject.name, idx)
          const teachersAtBranch = e.subject.branchTeachers.filter((bt: any) => bt.branchId === e.branchId)
          const teacherNames = teachersAtBranch.map((bt: any) => bt.teacher.name).join(', ')

          const subjectData = subjectsWithObjectives.find(s => s.id === e.subject.id)
          const totalObjectives = subjectData?.syllabusObjectives.length || 0
          const taughtObjectives = subjectData?.syllabusObjectives.filter(obj => obj.classes.length > 0).length || 0
          const syllabusPct = totalObjectives > 0 ? Math.round((taughtObjectives / totalObjectives) * 100) : 0

          return (
            <div
              key={e.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                background: subjectColor,
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                boxShadow: '5px 5px 0px #1a1a2e',
                borderRadius: '16px',
                padding: '1.75rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 900, opacity: 0.95 }}>
                      {e.batch?.name || 'Batch'}
                    </span>
                    <span style={{
                      background: e.branch?.colour || '#00c853',
                      color: '#ffffff',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '50px',
                      fontSize: '0.725rem',
                      fontWeight: 900,
                      border: '1.5px solid #1a1a2e'
                    }}>
                      📍 {e.branch?.name || 'Branch'}
                    </span>
                  </div>

                  <span style={{
                    background: e.status === 'active' ? '#00c853' : e.status === 'admin_approved' ? '#2979ff' : '#ff6d00',
                    color: '#ffffff',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '50px',
                    fontSize: '0.725rem',
                    fontWeight: 900,
                    border: '1.5px solid #1a1a2e'
                  }}>
                    {e.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', margin: '0.25rem 0' }}>{e.subject.name}</h3>
                
                <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', fontWeight: 800, background: 'rgba(0,0,0,0.25)', padding: '0.4rem 0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                  {teacherNames ? `👨‍🏫 Teacher(s): ${teacherNames}` : '⚠️ No teacher assigned at this branch'}
                </div>
              </div>

              {/* Quick Action Buttons - Solid colors with comic border & hard shadow */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <Link prefetch={true} href={`/dashboard/student/subjects/${e.subject.id}/grading`} style={{ padding: '0.65rem 0.5rem', fontSize: '0.8rem', textAlign: 'center', background: '#ffffff', color: '#1a1a2e', border: '3px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', fontWeight: 900, borderRadius: '50px', textDecoration: 'none' }}>
                  🤖 AI Marking
                </Link>
                <Link prefetch={true} href={`/dashboard/student/subjects/${e.subject.id}/forum`} style={{ padding: '0.65rem 0.5rem', fontSize: '0.8rem', textAlign: 'center', background: '#ffffff', color: '#1a1a2e', border: '3px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', fontWeight: 900, borderRadius: '50px', textDecoration: 'none' }}>
                  💬 Q&A Forum
                </Link>
                <Link prefetch={true} href={`/dashboard/student/subjects/${e.subject.id}/calendar`} style={{ padding: '0.65rem 0.5rem', fontSize: '0.8rem', textAlign: 'center', background: '#ffffff', color: '#1a1a2e', border: '3px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', fontWeight: 900, borderRadius: '50px', textDecoration: 'none' }}>
                  📅 Schedule
                </Link>
                <Link prefetch={true} href={`/dashboard/student/subjects/${e.subject.id}/recordings`} style={{ padding: '0.65rem 0.5rem', fontSize: '0.8rem', textAlign: 'center', background: '#ffffff', color: '#1a1a2e', border: '3px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', fontWeight: 900, borderRadius: '50px', textDecoration: 'none' }}>
                  📹 Recordings
                </Link>
              </div>
            </div>
          )
        })}

        {subjectEnrollments.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
            <BookOpen size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}>No enrolled subjects found</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Explore available batches and enrol in subjects to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
