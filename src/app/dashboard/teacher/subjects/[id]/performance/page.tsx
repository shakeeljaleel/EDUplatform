'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'SESSIONS' | 'INSIGHTS'>('SESSIONS')
  
  // Subject & Student info
  const [subjectInfo, setSubjectInfo] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])

  // Analytics tab state
  const [analyticsData, setAnalyticsData] = useState<{
    performance: any[]
    batchAvg: string
    topPercentileCount: number
    atRiskCount: number
    atRiskStudents: any[]
    maxHelixScore: number
    topics: any[]
    trends: any[]
  }>({
    performance: [],
    batchAvg: 'No data',
    topPercentileCount: 0,
    atRiskCount: 0,
    atRiskStudents: [],
    maxHelixScore: 100,
    topics: [],
    trends: []
  })

  const [filter, setFilter] = useState<'ALL' | 'TOP' | 'STABLE' | 'RISK'>('ALL')
  const [timeFilter, setTimeFilter] = useState<'ALL_TIME' | 'THIS_MONTH' | 'THIS_WEEK'>('ALL_TIME')

  // Log session modal state
  const [showLogModal, setShowLogModal] = useState(false)
  const [examType, setExamType] = useState<'PHYSICAL' | 'ONLINE'>('PHYSICAL')
  const [selectedOnlineQuizId, setSelectedOnlineQuizId] = useState('')
  const [submittingSession, setSubmittingSession] = useState(false)

  const [sessionForm, setSessionForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    maxMarks: '50',
    notes: '',
    studentMarks: [] as { userId: string; name: string; email: string; rawMarks: string; grade: string; isAbsent: boolean }[]
  })

  // Session detail modal / expand
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [sessionRecords, setSessionRecords] = useState<any[]>([])
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [subjRes, studentRes, quizRes, sessionRes, perfRes] = await Promise.all([
        fetch(`/api/subjects/${id}`),
        fetch(`/api/subjects/${id}/students`),
        fetch(`/api/quizzes?subjectId=${id}`),
        fetch(`/api/subjects/${id}/exam-sessions`),
        fetch(`/api/subjects/${id}/performance`)
      ])

      if (subjRes.ok) {
        const sData = await subjRes.json()
        setSubjectInfo(sData.subject)
      }

      let fetchedStudents: any[] = []
      if (studentRes.ok) {
        fetchedStudents = (await studentRes.json()).students || []
        setStudents(fetchedStudents)
      }

      if (quizRes.ok) {
        const qData = await quizRes.json()
        setQuizzes(qData.quizzes || [])
      }

      if (sessionRes.ok) {
        const sessData = await sessionRes.json()
        setSessions(sessData.sessions || [])
      }

      if (perfRes.ok) {
        const pData = await perfRes.json()
        setAnalyticsData(pData)
      }

      // Initialize form student marks
      setSessionForm(prev => ({
        ...prev,
        studentMarks: fetchedStudents.map(s => ({
          userId: s.id,
          name: s.name,
          email: s.email,
          rawMarks: '',
          grade: '',
          isAbsent: false
        }))
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleLogSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionForm.title.trim()) return

    setSubmittingSession(true)
    try {
      const marksPayload = sessionForm.studentMarks.map(sm => ({
        userId: sm.userId,
        rawMarks: sm.isAbsent ? '0' : sm.rawMarks,
        grade: sm.grade,
        isAbsent: sm.isAbsent
      }))

      const res = await fetch(`/api/subjects/${id}/exam-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sessionForm.title.trim(),
          date: sessionForm.date,
          maxMarks: sessionForm.maxMarks,
          highlights: examType === 'ONLINE' ? 'Online HELIX Quiz Evaluation' : sessionForm.notes,
          lows: '',
          suggestions: '',
          marks: marksPayload
        })
      })

      if (res.ok) {
        setShowLogModal(false)
        // Reset form
        setSessionForm({
          title: '',
          date: new Date().toISOString().slice(0, 10),
          maxMarks: '50',
          notes: '',
          studentMarks: students.map(s => ({
            userId: s.id,
            name: s.name,
            email: s.email,
            rawMarks: '',
            grade: '',
            isAbsent: false
          }))
        })
        fetchData()
      }
    } finally {
      setSubmittingSession(false)
    }
  }

  const handleAutoFillFromQuiz = async (quizId: string) => {
    if (!quizId) return
    try {
      const res = await fetch(`/api/quizzes/${quizId}/analytics`)
      if (res.ok) {
        const data = await res.json()
        const quizStudents = data.students || []
        const updatedMarks = sessionForm.studentMarks.map(sm => {
          const match = quizStudents.find((qs: any) => qs.studentEmail === sm.email || qs.studentName.toLowerCase() === sm.name.toLowerCase())
          if (match) {
            return {
              ...sm,
              rawMarks: match.score.toString(),
              isAbsent: false
            }
          }
          return sm
        })
        const selectedQuiz = quizzes.find(q => q.id === quizId)
        setSessionForm(prev => ({
          ...prev,
          title: prev.title || selectedQuiz?.title || 'Online Assessment',
          maxMarks: data.stats?.maxPossibleScore?.toString() || '100',
          studentMarks: updatedMarks
        }))
      }
    } catch (e) {
      console.error('Error auto-filling from quiz:', e)
    }
  }

  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete exam session "${title}"?`)) return
    try {
      const res = await fetch(`/api/subjects/${id}/exam-sessions?id=${sessionId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchData()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchSessionDetails = async (sessionTitle: string) => {
    try {
      const res = await fetch(`/api/subjects/${id}/exams?title=${encodeURIComponent(sessionTitle)}`)
      if (res.ok) {
        const { records } = await res.json()
        setSessionRecords(records || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const exportLeaderboardCSV = () => {
    if (!analyticsData.performance.length) return
    const headers = ['Rank', 'Student Name', 'Email', 'Quiz Avg (%)', 'Exam Avg (%)', 'HELIX Score (pts)', 'At Risk']
    const rows = analyticsData.performance.map(s => [
      s.rank,
      `"${s.name}"`,
      `"${s.email}"`,
      s.quizAvg !== null ? `${s.quizAvg}%` : 'No data',
      s.examAvg !== null ? `${s.examAvg}%` : 'No data',
      `${s.helixScore}pts`,
      s.isAtRisk ? 'YES' : 'NO'
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${subjectInfo?.name || 'Subject'}_Helix_Leaderboard.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredRanking = analyticsData.performance.filter(s => {
    if (filter === 'TOP') return s.rank <= Math.max(1, Math.ceil(analyticsData.performance.length * 0.25))
    if (filter === 'STABLE') return !s.isAtRisk && (s.quizAvg === null || s.quizAvg >= 60)
    if (filter === 'RISK') return s.isAtRisk
    return true
  })

  const subjectColour = subjectInfo?.colour || '#2979ff'
  const branchName = subjectInfo?.branchTeachers?.[0]?.branch?.name || 'Helix Test Campus'
  const batchName = subjectInfo?.batch?.name || 'Batch'

  if (loading && !analyticsData.performance.length) {
    return (
      <div className="content-wrapper pulse" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h2 style={{ fontWeight: 900, color: '#1a1a2e' }}>Synthesizing Performance Analytics...</h2>
      </div>
    )
  }

  return (
    <div className="content-wrapper fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ background: subjectColour, color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.75rem', fontWeight: 900, fontSize: '0.75rem' }}>
              📚 {subjectInfo?.name || 'Subject'}
            </span>
            <span style={{ background: '#aa00ff', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.75rem', fontWeight: 900, fontSize: '0.75rem' }}>
              🎓 {batchName}
            </span>
            <span style={{ background: '#00c853', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.75rem', fontWeight: 900, fontSize: '0.75rem', boxShadow: '2px 2px 0px #1a1a2e' }}>
              📍 {branchName}
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#1a1a2e' }}>Performance Hub</h1>
          <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Cumulative student rankings, exam session logs, and HELIX analytics.</p>
        </div>

        {/* Tab Switcher & Print Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Print Academic Report Button (Item 10) */}
          <button
            onClick={() => window.print()}
            className="btn-bob"
            style={{
              background: '#ffffff',
              color: '#1a1a2e',
              border: '2px solid #1a1a2e',
              borderRadius: '50px',
              boxShadow: '3px 3px 0px #1a1a2e',
              padding: '0.6rem 1.4rem',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            🖨️ Print Academic Report
          </button>

          {/* Tab Toggle Styling (Item 9) */}
          <div style={{
            display: 'flex',
            background: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '50px',
            padding: '6px'
          }}>
            {[
              { id: 'SESSIONS', label: 'Exam sessions' },
              { id: 'INSIGHTS', label: 'Helix analytics' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                style={{
                  background: viewMode === tab.id ? '#1a1a2e' : '#ffffff',
                  color: viewMode === tab.id ? '#ffffff' : '#64748b',
                  borderRadius: '50px',
                  padding: '10px 24px',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EXAM SESSIONS TAB */}
      {viewMode === 'SESSIONS' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1a1a2e' }}>Exam sessions</h3>
            {/* + Log session button (Item 11) */}
            <button
              onClick={() => setShowLogModal(true)}
              className="btn-bob"
              style={{
                background: '#00c853',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: '4px 4px 0px #1a1a2e',
                padding: '0.75rem 1.75rem',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              + Log session
            </button>
          </div>

          {/* Sessions List or Empty State */}
          {sessions.length === 0 ? (
            /* Empty State Container (Item 12) */
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              boxShadow: '5px 5px 0px #1a1a2e',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '4rem' }}>🧬</div>
              <h3 style={{ fontWeight: 900, fontSize: '1.6rem', color: '#1a1a2e' }}>No exam sessions logged yet</h3>
              <p style={{ color: '#64748b', fontWeight: 600, maxWidth: '450px' }}>
                Log physical or online exam results to track student performance over time.
              </p>
              <button
                onClick={() => setShowLogModal(true)}
                className="btn-bob"
                style={{
                  background: '#00c853',
                  color: '#ffffff',
                  border: '3px solid #1a1a2e',
                  borderRadius: '50px',
                  boxShadow: '4px 4px 0px #1a1a2e',
                  padding: '0.75rem 2rem',
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                + Log session
              </button>
            </div>
          ) : (
            /* Exam Session Cards (Item 14) */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {sessions.map(s => (
                <div
                  key={s.id}
                  style={{
                    background: '#ffffff',
                    border: '3px solid #1a1a2e',
                    borderRadius: '16px',
                    boxShadow: '5px 5px 0px #1a1a2e',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  {/* Card Subject Header Bar */}
                  <div style={{ background: subjectColour, padding: '1rem 1.25rem', color: '#ffffff', borderBottom: '3px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ background: '#1a1a2e', color: '#ffffff', padding: '0.15rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800 }}>
                        {s.highlights?.includes('Online') ? 'Online Quiz' : 'Physical Exam'}
                      </span>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.2rem', color: '#ffffff' }}>{s.title}</h4>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setActiveMenuSessionId(activeMenuSessionId === s.id ? null : s.id)}
                        style={{ background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '50%', width: '32px', height: '32px', fontWeight: 900, cursor: 'pointer' }}
                      >
                        ⋮
                      </button>
                      {activeMenuSessionId === s.id && (
                        <div style={{ position: 'absolute', right: 0, top: '40px', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', boxShadow: '4px 4px 0px #1a1a2e', zIndex: 10, width: '120px', overflow: 'hidden' }}>
                          <button
                            onClick={() => {
                              setActiveMenuSessionId(null)
                              handleDeleteSession(s.id, s.title)
                            }}
                            style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', fontWeight: 800, color: '#f50057', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '1rem' }}>
                      📅 Date: {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>

                    {s.highlights && (
                      <p style={{ fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 600, marginBottom: '1rem' }}>
                        {s.highlights}
                      </p>
                    )}

                    <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '1rem' }}>
                      <button
                        onClick={() => {
                          if (expandedSessionId === s.id) {
                            setExpandedSessionId(null)
                          } else {
                            setExpandedSessionId(s.id)
                            fetchSessionDetails(s.title)
                          }
                        }}
                        style={{
                          width: '100%',
                          background: '#2979ff',
                          color: '#ffffff',
                          border: '2px solid #1a1a2e',
                          borderRadius: '50px',
                          boxShadow: '3px 3px 0px #1a1a2e',
                          padding: '0.6rem',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        {expandedSessionId === s.id ? 'Hide results' : 'View results'}
                      </button>

                      {expandedSessionId === s.id && (
                        <div style={{ marginTop: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #1a1a2e' }}>
                              <tr>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#1a1a2e' }}>Student</th>
                                <th style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#1a1a2e' }}>Marks</th>
                                <th style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#1a1a2e' }}>%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessionRecords.map(rec => (
                                <tr key={rec.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e' }}>{rec.user?.name || 'Student'}</td>
                                  <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800 }}>{rec.marks} / {rec.maxMarks}</td>
                                  <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 900, color: (rec.marks / rec.maxMarks) >= 0.6 ? '#15803d' : '#d32f2f' }}>
                                    {Math.round((rec.marks / rec.maxMarks) * 100)}%
                                  </td>
                                </tr>
                              ))}
                              {sessionRecords.length === 0 && (
                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.8rem' }}>Loading records...</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HELIX ANALYTICS TAB */}
      {viewMode === 'INSIGHTS' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* STAT CARDS — Solid Color Fills & Comic Treatment (Item 23) & Sentence Case (Item 22) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Batch average */}
            <div style={{
              background: '#2979ff',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              boxShadow: '5px 5px 0px #1a1a2e',
              padding: '1.5rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'none' }}>Batch average</div>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1 }}>
                {analyticsData.batchAvg}
              </div>
            </div>

            {/* Top percentile */}
            <div style={{
              background: '#00c853',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              boxShadow: '5px 5px 0px #1a1a2e',
              padding: '1.5rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'none' }}>Top percentile</div>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1 }}>
                {analyticsData.topPercentileCount} <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Student(s)</span>
              </div>
            </div>

            {/* At risk */}
            <div style={{
              background: '#f50057',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              boxShadow: '5px 5px 0px #1a1a2e',
              padding: '1.5rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'none' }}>At risk</div>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1 }}>
                {analyticsData.atRiskCount} <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Student(s)</span>
              </div>
            </div>
          </div>

          {/* ACADEMIC RANKING TABLE — Item 25 */}
          <div style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', overflow: 'hidden' }}>
            <div style={{ padding: '1.75rem', borderBottom: '3px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e' }}>Academic ranking</h3>
                {/* Subtitle Change (Item 26) */}
                <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Ranked by combined quiz and exam performance</p>
              </div>

              {/* Filter Pills Comic Treatment (Item 24) */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'TOP', label: 'Top' },
                  { id: 'STABLE', label: 'Stable' },
                  { id: 'RISK', label: 'Risk' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    style={{
                      background: filter === f.id ? '#1a1a2e' : '#ffffff',
                      color: filter === f.id ? '#ffffff' : '#64748b',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      padding: '0.4rem 1.1rem',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: filter === f.id ? '3px 3px 0px #1a1a2e' : 'none'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#ffffff', borderBottom: '2px solid #1a1a2e' }}>
                  <tr>
                    {/* Sentence Case Headers (Item 22) */}
                    <th style={{ padding: '1rem', width: '90px', textAlign: 'center', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Rank</th>
                    <th style={{ padding: '1rem', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Student</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Quiz avg</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Exam avg</th>
                    <th style={{ padding: '1rem', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>HELIX score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRanking.map(s => {
                    const rankBg = s.rank === 1 ? '#ffd700' : s.rank === 2 ? '#c0c0c0' : s.rank === 3 ? '#cd7f32' : '#ffffff'
                    const rankColor = s.rank <= 3 ? '#1a1a2e' : '#1a1a2e'
                    const progressPct = Math.min(100, Math.round((s.helixScore / analyticsData.maxHelixScore) * 100))
                    const barColor = progressPct >= 75 ? '#00c853' : progressPct >= 40 ? '#ffab00' : '#f50057'

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        {/* Rank Badge */}
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: rankBg,
                            color: rankColor,
                            border: '2px solid #1a1a2e',
                            fontWeight: 900,
                            fontSize: '1.1rem',
                            boxShadow: '2px 2px 0px #1a1a2e'
                          }}>
                            {s.rank}
                          </div>
                        </td>

                        {/* Student Name & Email (No UUID - Item 21) */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1a1a2e' }}>
                            {s.name}
                            {s.isAtRisk && <span style={{ marginLeft: '0.5rem', color: '#f50057' }}>⚠️</span>}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{s.email}</div>
                        </td>

                        {/* Quiz Avg */}
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: '#1a1a2e' }}>
                          {s.quizAvg !== null ? `${s.quizAvg}%` : <span style={{ color: '#94a3b8' }}>No data</span>}
                        </td>

                        {/* Exam Avg (Item 19) */}
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: '#1a1a2e' }}>
                          {s.examAvg !== null ? `${s.examAvg}%` : <span style={{ color: '#94a3b8' }}>No data</span>}
                        </td>

                        {/* HELIX Score Display (Points, not %) — Item 20 */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontWeight: 900, color: '#1a1a2e', fontSize: '1.2rem', minWidth: '70px' }}>
                              {s.helixScore}pts
                            </span>
                            <div style={{ flex: 1, height: '14px', background: '#e2e8f0', borderRadius: '50px', border: '2px solid #1a1a2e', overflow: 'hidden' }}>
                              <div style={{
                                width: `${progressPct}%`,
                                height: '100%',
                                background: barColor,
                                borderRadius: '50px'
                              }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredRanking.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontWeight: 700 }}>
                        No student performance records found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION A — CLASS LEADERBOARD (Item 27) */}
          <div style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e' }}>🏆 Class leaderboard</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Student rankings by accumulated HELIX points</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[
                    { id: 'ALL_TIME', label: 'All time' },
                    { id: 'THIS_MONTH', label: 'This month' },
                    { id: 'THIS_WEEK', label: 'This week' }
                  ].map(tf => (
                    <button
                      key={tf.id}
                      onClick={() => setTimeFilter(tf.id as any)}
                      style={{
                        background: timeFilter === tf.id ? '#1a1a2e' : '#ffffff',
                        color: timeFilter === tf.id ? '#ffffff' : '#1a1a2e',
                        border: '1.5px solid #1a1a2e',
                        borderRadius: '50px',
                        padding: '0.35rem 0.85rem',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={exportLeaderboardCSV}
                  style={{
                    background: '#00c853',
                    color: '#ffffff',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '3px 3px 0px #1a1a2e',
                    padding: '0.45rem 1.25rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analyticsData.performance.map(st => {
                const isGold = st.rank === 1
                const isSilver = st.rank === 2
                const isBronze = st.rank === 3

                const rowBg = isGold ? '#fffdf0' : isSilver ? '#f8fafc' : isBronze ? '#fffaf5' : '#ffffff'
                const borderColour = isGold ? '#ffd700' : isSilver ? '#c0c0c0' : isBronze ? '#cd7f32' : '#1a1a2e'

                return (
                  <div
                    key={st.id}
                    style={{
                      background: rowBg,
                      border: `2px solid ${borderColour}`,
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '3px 3px 0px #1a1a2e'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isGold ? '#ffd700' : isSilver ? '#c0c0c0' : isBronze ? '#cd7f32' : '#e2e8f0',
                        color: '#1a1a2e',
                        border: '2px solid #1a1a2e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem'
                      }}>
                        {st.rank}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, color: '#1a1a2e', fontSize: '1rem' }}>{st.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{st.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#aa00ff' }}>{st.helixScore}pts</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Overall: {st.overallScore}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION B — PERFORMANCE TRENDS (Item 27) */}
          <div style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>📈 Performance trends</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>Class average score over time across all quizzes and exam sessions.</p>

            {analyticsData.trends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontWeight: 600 }}>No trend data logged yet.</div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 800 }}>
                  <span style={{ color: '#00c853', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🟢 Class average</span>
                  <span style={{ color: '#ffd700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🟡 Highest score</span>
                  <span style={{ color: '#f50057', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🔴 Lowest score</span>
                </div>

                {/* SVG Trend Graph */}
                <div style={{ border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1.5rem', background: '#f8fafc' }}>
                  <svg viewBox="0 0 500 160" style={{ width: '100%', height: '180px', overflow: 'visible' }}>
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(val => {
                      const y = 140 - (val * 1.2)
                      return (
                        <g key={val}>
                          <line x1="30" y1={y} x2="480" y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                          <text x="5" y={y + 4} fontSize="9" fontWeight="700" fill="#94a3b8">{val}%</text>
                        </g>
                      )
                    })}

                    {/* Lines */}
                    {(() => {
                      const stepX = analyticsData.trends.length > 1 ? 430 / (analyticsData.trends.length - 1) : 0
                      const avgPoints = analyticsData.trends.map((t, i) => `${35 + i * stepX},${140 - (t.avg * 1.2)}`).join(' ')
                      const highPoints = analyticsData.trends.map((t, i) => `${35 + i * stepX},${140 - (t.highest * 1.2)}`).join(' ')
                      const lowPoints = analyticsData.trends.map((t, i) => `${35 + i * stepX},${140 - (t.lowest * 1.2)}`).join(' ')

                      return (
                        <>
                          <polyline points={highPoints} fill="none" stroke="#ffd700" strokeWidth="3" strokeLinecap="round" />
                          <polyline points={lowPoints} fill="none" stroke="#f50057" strokeWidth="3" strokeLinecap="round" />
                          <polyline points={avgPoints} fill="none" stroke="#00c853" strokeWidth="4" strokeLinecap="round" />

                          {analyticsData.trends.map((t, i) => {
                            const x = 35 + i * stepX
                            return (
                              <g key={i}>
                                <circle cx={x} cy={140 - (t.avg * 1.2)} r="5" fill="#00c853" stroke="#1a1a2e" strokeWidth="2" />
                                <text x={x} y="155" fontSize="9" fontWeight="800" fill="#1a1a2e" textAnchor="middle">{t.title.slice(0, 10)}</text>
                              </g>
                            )
                          })}
                        </>
                      )
                    })()}
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C — TOPIC PERFORMANCE BREAKDOWN (Item 27) */}
          <div style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>📊 Topic performance breakdown</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>Average score per topic linked from quiz-lesson connections.</p>

            {analyticsData.topics.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontWeight: 600 }}>No topic breakdown data available.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {analyticsData.topics.map(tp => {
                  const isWeak = tp.avgScore < 60
                  const isStrong = tp.avgScore >= 80
                  const barBg = isWeak ? '#f50057' : isStrong ? '#00c853' : '#2979ff'

                  return (
                    <div key={tp.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 900, color: '#1a1a2e', fontSize: '0.95rem' }}>
                          {tp.name}
                          {isWeak && <span style={{ marginLeft: '0.5rem', background: '#ffebee', color: '#d32f2f', border: '1px solid #1a1a2e', borderRadius: '50px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 900 }}>Weak area (&lt;60%)</span>}
                          {isStrong && <span style={{ marginLeft: '0.5rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #1a1a2e', borderRadius: '50px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 900 }}>Strong area (&gt;80%)</span>}
                        </span>
                        <span style={{ fontWeight: 900, color: barBg, fontSize: '1rem' }}>{tp.avgScore}%</span>
                      </div>
                      <div style={{ width: '100%', height: '14px', background: '#e2e8f0', borderRadius: '50px', border: '2px solid #1a1a2e', overflow: 'hidden' }}>
                        <div style={{ width: `${tp.avgScore}%`, height: '100%', background: barBg, borderRadius: '50px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SECTION D — STUDENT ALERTS (Item 27) */}
          <div style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>🚨 Student alerts</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>Students scoring below 50% on 2 or more consecutive assessments.</p>

            {analyticsData.atRiskStudents.length === 0 ? (
              <div style={{ background: '#f0fdf4', border: '2.5px solid #00c853', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#15803d' }}>All students on track</h4>
                  <p style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>No students currently have 2+ consecutive scores below 50%.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {analyticsData.atRiskStudents.map(st => (
                  <div key={st.id} style={{ background: '#fff0f3', border: '3px solid #1a1a2e', borderRadius: '14px', boxShadow: '4px 4px 0px #1a1a2e', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1a1a2e' }}>{st.name}</h4>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{st.email}</div>
                      </div>
                      <span style={{ background: '#f50057', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>
                        At risk ⚠️
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '1rem' }}>
                      Recent scores: {st.recentScores?.map((sc: number) => `${sc}%`).join(', ') || 'Below 50%'}
                    </div>

                    <Link
                      href={`/dashboard/teacher/messages?recipientId=${st.id}`}
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        background: '#ffffff',
                        color: '#1a1a2e',
                        border: '2px solid #1a1a2e',
                        borderRadius: '50px',
                        boxShadow: '2px 2px 0px #1a1a2e',
                        padding: '0.5rem',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        textDecoration: 'none'
                      }}
                    >
                      💬 Message student
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* LOG SESSION MODAL (Item 13) */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setShowLogModal(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50%', width: '36px', height: '36px', fontWeight: 900, cursor: 'pointer' }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.3rem' }}>
              Log exam session
            </h3>
            <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>
              Record physical paper exam or online quiz results into the gradebook.
            </p>

            <form onSubmit={handleLogSessionSubmit}>
              {/* SECTION A — Exam Details */}
              <div style={{ background: '#f8fafc', border: '2px solid #1a1a2e', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1rem' }}>Section A — Exam details</h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.3rem' }}>Exam title (Required):</label>
                    <input
                      type="text"
                      required
                      value={sessionForm.title}
                      onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })}
                      placeholder="e.g. Cell Biology End of Topic Test"
                      style={{ width: '100%', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.5rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.3rem' }}>Subject:</label>
                    <input
                      type="text"
                      disabled
                      value={subjectInfo?.name || 'Biology'}
                      style={{ width: '100%', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.5rem', fontWeight: 700, background: '#e2e8f0', color: '#1a1a2e' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.3rem' }}>Branch:</label>
                    <input
                      type="text"
                      disabled
                      value={branchName}
                      style={{ width: '100%', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.5rem', fontWeight: 700, background: '#e2e8f0', color: '#1a1a2e' }}
                    />
                  </div>
                </div>

                {/* Exam Type Toggle Pill */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.4rem' }}>Exam type:</label>
                  <div style={{ display: 'inline-flex', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setExamType('PHYSICAL')}
                      style={{
                        background: examType === 'PHYSICAL' ? '#1a1a2e' : '#ffffff',
                        color: examType === 'PHYSICAL' ? '#ffffff' : '#64748b',
                        borderRadius: '50px',
                        padding: '0.4rem 1.25rem',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Physical (paper exam)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExamType('ONLINE')}
                      style={{
                        background: examType === 'ONLINE' ? '#1a1a2e' : '#ffffff',
                        color: examType === 'ONLINE' ? '#ffffff' : '#64748b',
                        borderRadius: '50px',
                        padding: '0.4rem 1.25rem',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Online (HELIX quiz)
                    </button>
                  </div>
                </div>

                {/* Conditional Fields */}
                {examType === 'ONLINE' ? (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.3rem' }}>Select existing online quiz:</label>
                    <select
                      value={selectedOnlineQuizId}
                      onChange={e => {
                        setSelectedOnlineQuizId(e.target.value)
                        handleAutoFillFromQuiz(e.target.value)
                      }}
                      style={{ width: '100%', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.5rem', fontWeight: 700 }}
                    >
                      <option value="">-- Choose a quiz --</option>
                      {quizzes.map(q => (
                        <option key={q.id} value={q.id}>{q.title}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.3rem' }}>Exam date:</label>
                      <input
                        type="date"
                        required
                        value={sessionForm.date}
                        onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })}
                        style={{ width: '100%', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.5rem', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.3rem' }}>Maximum marks:</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={sessionForm.maxMarks}
                        onChange={e => setSessionForm({ ...sessionForm, maxMarks: e.target.value })}
                        style={{ width: '100%', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.5rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.3rem' }}>Notes / Highlights (Optional):</label>
                  <textarea
                    rows={2}
                    value={sessionForm.notes}
                    onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })}
                    placeholder="Batch highlights, common mistakes, or teacher notes..."
                    style={{ width: '100%', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.5rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* SECTION B — Student Results */}
              <div style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e' }}>Section B — Student results</h4>
                  {examType === 'ONLINE' && selectedOnlineQuizId && (
                    <button
                      type="button"
                      onClick={() => handleAutoFillFromQuiz(selectedOnlineQuizId)}
                      style={{ background: '#2979ff', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.35rem 0.85rem', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      ⚡ Auto-fill from quiz
                    </button>
                  )}
                </div>

                <div style={{ border: '2px solid #1a1a2e', borderRadius: '10px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #1a1a2e' }}>
                      <tr>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e' }}>Student</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e' }}>Marks Scored</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e' }}>Percentage</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e' }}>Absent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionForm.studentMarks.map((sm, idx) => {
                        const scored = parseFloat(sm.rawMarks) || 0
                        const maxM = parseFloat(sessionForm.maxMarks) || 100
                        const pct = maxM > 0 ? Math.round((scored / maxM) * 100) : 0

                        return (
                          <tr key={sm.userId} style={{ borderBottom: '1px solid #e2e8f0', background: sm.isAbsent ? '#f1f5f9' : '#ffffff' }}>
                            <td style={{ padding: '0.6rem 0.8rem', fontWeight: 800, color: sm.isAbsent ? '#94a3b8' : '#1a1a2e', fontSize: '0.85rem' }}>
                              {sm.name}
                            </td>
                            <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max={sessionForm.maxMarks}
                                disabled={sm.isAbsent}
                                value={sm.rawMarks}
                                onChange={e => {
                                  const newMarks = [...sessionForm.studentMarks]
                                  newMarks[idx].rawMarks = e.target.value
                                  setSessionForm({ ...sessionForm, studentMarks: newMarks })
                                }}
                                style={{ width: '80px', textAlign: 'center', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '0.3rem', fontWeight: 800 }}
                              />
                            </td>
                            <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: sm.isAbsent ? '#94a3b8' : (pct >= 60 ? '#15803d' : '#d32f2f') }}>
                              {sm.isAbsent ? '--' : `${sm.rawMarks !== '' ? pct : 0}%`}
                            </td>
                            <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={sm.isAbsent}
                                onChange={e => {
                                  const newMarks = [...sessionForm.studentMarks]
                                  newMarks[idx].isAbsent = e.target.checked
                                  if (e.target.checked) newMarks[idx].rawMarks = ''
                                  setSessionForm({ ...sessionForm, studentMarks: newMarks })
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION C — Save (Item 13) */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={submittingSession}
                  style={{
                    flex: 1,
                    background: '#00c853',
                    color: '#ffffff',
                    border: '3px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    padding: '0.85rem',
                    fontWeight: 900,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  {submittingSession ? 'Saving exam session...' : 'Save exam session'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  style={{
                    background: '#ffffff',
                    color: '#1a1a2e',
                    border: '3px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '0.85rem 1.5rem',
                    fontWeight: 900,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
