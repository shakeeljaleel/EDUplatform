'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TeacherQuizzesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = React.use(params)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyticsQuiz, setAnalyticsQuiz] = useState<any>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [dueDateModalQuiz, setDueDateModalQuiz] = useState<any>(null)
  const [newDueDate, setNewDueDate] = useState('')
  const [warningMsg, setWarningMsg] = useState('')

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`/api/quizzes?subjectId=${subjectId}`)
      if (res.ok) {
        const data = await res.json()
        setQuizzes(data.quizzes || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const openAnalytics = async (quiz: any) => {
    setAnalyticsQuiz(quiz)
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/analytics`)
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
      }
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleCloseQuiz = async (quizId: string) => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' })
      })
      if (res.ok) fetchQuizzes()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateDueDate = async (quizId: string) => {
    if (!newDueDate) return
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDueDate })
      })
      if (res.ok) {
        setDueDateModalQuiz(null)
        fetchQuizzes()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleEditAttempt = (quiz: any) => {
    if (quiz._count?.attempts > 0 || quiz.attempts?.length > 0) {
      setWarningMsg(`Cannot edit "${quiz.title}" because student submissions exist. Locked to ensure assessment fairness.`)
      setTimeout(() => setWarningMsg(''), 5000)
    } else {
      window.location.href = `/dashboard/teacher/subjects/${subjectId}/quizzes/builder?quizId=${quiz.id}`
    }
  }

  const exportCSV = () => {
    if (!analyticsData || !analyticsData.students) return
    const headers = ['Student Name', 'Email', 'Score', 'Max Score', 'Percentage (%)', 'Stars', 'Submitted At', 'Flagged (<50% Consecutive)']
    const rows = analyticsData.students.map((s: any) => [
      `"${s.studentName}"`,
      `"${s.studentEmail}"`,
      s.score,
      s.maxScore,
      `${s.percentage}%`,
      s.stars,
      `"${new Date(s.submittedAt).toLocaleString()}"`,
      s.isFlagged ? 'YES' : 'NO'
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${analyticsQuiz.title.replace(/\s+/g, '_')}_Analytics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="pulse">Loading quizzes...</div>

  return (
    <div className="content-wrapper" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a2e' }}>Quizzes & Assessments</h2>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Create topic assessments, evaluate student performance, and view mark analytics.</p>
        </div>
        <Link
          href={`/dashboard/teacher/subjects/${subjectId}/quizzes/builder`}
          style={{
            background: '#00c853',
            color: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '50px',
            boxShadow: '4px 4px 0px #1a1a2e',
            padding: '0.75rem 1.8rem',
            fontWeight: 900,
            fontSize: '1rem',
            textDecoration: 'none'
          }}
        >
          + New quiz
        </Link>
      </div>

      {warningMsg && (
        <div style={{ padding: '1rem 1.5rem', background: '#fff3cd', color: '#856404', borderRadius: '14px', marginBottom: '1.5rem', fontWeight: 800, border: '3px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e' }}>
          ⚠️ {warningMsg}
        </div>
      )}

      {/* Quizzes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {quizzes.map(q => {
          const statusBg = q.status === 'PUBLISHED' ? '#00c853' : q.status === 'DRAFT' ? '#ffab00' : '#1a1a2e'
          const statusText = q.status === 'PUBLISHED' ? 'Published' : q.status === 'DRAFT' ? 'Draft' : 'Closed'
          const attemptCount = q._count?.attempts || q.attempts?.length || 0

          return (
            <div
              key={q.id}
              style={{
                background: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{
                    background: statusBg,
                    color: '#ffffff',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '0.2rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}>
                    {statusText}
                  </span>
                  {q.linkedSession && (
                    <span style={{ background: '#2979ff', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 800 }}>
                      Based on lesson
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>{q.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>
                  Topic: {q.topic || 'General'}
                </p>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#1a1a2e', fontWeight: 700, marginBottom: '1.25rem' }}>
                  <div>❓ {q._count?.questions || 0} Questions</div>
                  <div>📝 {attemptCount} Submissions</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '2px dashed #cbd5e1', paddingTop: '1rem' }}>
                <button
                  onClick={() => openAnalytics(q)}
                  style={{
                    width: '100%',
                    background: '#2979ff',
                    color: '#ffffff',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '3px 3px 0px #1a1a2e',
                    padding: '0.5rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  📊 Mark Analytics
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEditAttempt(q)}
                    style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.4rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  {q.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleCloseQuiz(q.id)}
                      style={{ flex: 1, background: '#ffffff', color: '#d32f2f', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.4rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  )}
                  <button
                    onClick={() => { setDueDateModalQuiz(q); setNewDueDate(q.dueDate ? new Date(q.dueDate).toISOString().slice(0, 16) : ''); }}
                    style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.4rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Extend
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mark Analytics Modal */}
      {analyticsQuiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ maxWidth: '850px', width: '100%', maxHeight: '85vh', overflowY: 'auto', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setAnalyticsQuiz(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50%', width: '36px', height: '36px', fontWeight: 900, cursor: 'pointer' }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>
              Mark Analytics — {analyticsQuiz.title}
            </h3>
            <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>
              Student submission breakdown and performance trends.
            </p>

            {analyticsLoading ? (
              <div className="pulse">Loading analytics...</div>
            ) : analyticsData ? (
              <div>
                {/* Stats Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Submission Rate', val: `${analyticsData.stats.submissionRate}% (${analyticsData.stats.submittedCount}/${analyticsData.stats.totalEnrolled})`, bg: '#e0f2fe', color: '#0284c7' },
                    { label: 'Average Score', val: `${analyticsData.stats.avgScore} / ${analyticsData.stats.maxPossibleScore}`, bg: '#fef3c7', color: '#b45309' },
                    { label: 'Highest Score', val: `${analyticsData.stats.highestScore} / ${analyticsData.stats.maxPossibleScore}`, bg: '#dcfce7', color: '#15803d' },
                    { label: 'Lowest Score', val: `${analyticsData.stats.lowestScore} / ${analyticsData.stats.maxPossibleScore}`, bg: '#ffebee', color: '#d32f2f' }
                  ].map((st, i) => (
                    <div key={i} style={{ background: st.bg, border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1rem', textAlign: 'center', boxShadow: '3px 3px 0px #1a1a2e' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{st.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: st.color }}>{st.val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e' }}>Student Results ({analyticsData.students.length})</h4>
                  <button
                    onClick={exportCSV}
                    style={{
                      background: '#00c853',
                      color: '#ffffff',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      boxShadow: '3px 3px 0px #1a1a2e',
                      padding: '0.4rem 1.2rem',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    📥 Export CSV
                  </button>
                </div>

                {/* Table */}
                <div style={{ border: '2px solid #1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #1a1a2e' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, color: '#1a1a2e', fontSize: '0.8rem' }}>Student Name</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, color: '#1a1a2e', fontSize: '0.8rem' }}>Score</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, color: '#1a1a2e', fontSize: '0.8rem' }}>Percentage</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, color: '#1a1a2e', fontSize: '0.8rem' }}>Stars</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, color: '#1a1a2e', fontSize: '0.8rem' }}>Alert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.students.map((st: any) => (
                        <tr key={st.attemptId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#1a1a2e' }}>
                            {st.studentName}
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{st.studentEmail}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 900, color: '#1a1a2e' }}>
                            {st.score} / {st.maxScore}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 900, color: st.percentage >= 60 ? '#15803d' : '#d32f2f' }}>
                            {st.percentage}%
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 900, color: '#ffd700' }}>
                            {'★'.repeat(st.stars)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {st.isFlagged ? (
                              <span style={{ background: '#ffebee', color: '#d32f2f', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 900 }}>
                                ⚠️ Low score &lt;50%
                              </span>
                            ) : (
                              <span style={{ color: '#00c853', fontWeight: 800, fontSize: '0.8rem' }}>✓ On track</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Extend Due Date Modal */}
      {dueDateModalQuiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ maxWidth: '400px', width: '100%', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '6px 6px 0px #1a1a2e', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1rem' }}>Extend due date</h4>
            <input
              type="datetime-local"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '10px', fontWeight: 700, marginBottom: '1.25rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleUpdateDueDate(dueDateModalQuiz.id)} style={{ flex: 1, background: '#00c853', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.6rem', fontWeight: 900 }}>Save</button>
              <button onClick={() => setDueDateModalQuiz(null)} style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.6rem', fontWeight: 800 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
