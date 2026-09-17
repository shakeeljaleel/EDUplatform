'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TeacherQuizzesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = React.use(params)

  const [quizzes, setQuizzes] = useState<any[]>([])
  const [subjectInfo, setSubjectInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Analytics Modal
  const [analyticsQuiz, setAnalyticsQuiz] = useState<any>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Teacher Marking Modal
  const [markingQuiz, setMarkingQuiz] = useState<any>(null)
  const [markingSubmissions, setMarkingSubmissions] = useState<any[]>([])
  const [currentSubIdx, setCurrentSubIdx] = useState(0)
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [showMarkSchemePanel, setShowMarkSchemePanel] = useState(true)
  const [editMarks, setEditMarks] = useState<number>(0)
  const [editFeedback, setEditFeedback] = useState('')
  const [isOverriding, setIsOverriding] = useState(false)
  const [savingGrade, setSavingGrade] = useState(false)

  // Extend due date modal
  const [dueDateModalQuiz, setDueDateModalQuiz] = useState<any>(null)
  const [newDueDate, setNewDueDate] = useState('')
  const [warningMsg, setWarningMsg] = useState('')

  useEffect(() => {
    fetchQuizzes()
    fetchSubjectInfo()
  }, [])

  const fetchSubjectInfo = async () => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}`)
      if (res.ok) {
        const data = await res.json()
        setSubjectInfo(data.subject)
      }
    } catch (e) {
      console.error(e)
    }
  }

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

  const openMarkingModal = async (quiz: any) => {
    setMarkingQuiz(quiz)
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/analytics`)
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
        // Fetch full attempts with answers for grading
        const attemptsRes = await fetch(`/api/quizzes/${quiz.id}`)
        if (attemptsRes.ok) {
          const fullQuiz = (await attemptsRes.json()).quiz
          setMarkingSubmissions(fullQuiz.attempts || [])
          setCurrentSubIdx(0)
          setCurrentQIdx(0)
        }
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

  const handlePublishToggle = async (quiz: any) => {
    const newStatus = quiz.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
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

  const saveQuestionGrade = async (moveNext: 'question' | 'student' = 'question') => {
    if (!markingQuiz || !markingSubmissions.length) return
    const currentSub = markingSubmissions[currentSubIdx]
    const questions = markingQuiz.questions || []
    const currentQ = questions[currentQIdx]
    const currentAns = currentSub?.answers?.find((a: any) => a.questionId === currentQ?.id)

    if (!currentSub || !currentAns) return

    setSavingGrade(true)
    try {
      const res = await fetch(`/api/quizzes/attempts/${currentSub.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grades: [
            {
              answerId: currentAns.id,
              marksAwarded: editMarks,
              teacherFeedback: editFeedback
            }
          ]
        })
      })

      if (res.ok) {
        setIsOverriding(false)
        if (moveNext === 'question') {
          if (currentQIdx < questions.length - 1) {
            setCurrentQIdx(prev => prev + 1)
          } else if (currentSubIdx < markingSubmissions.length - 1) {
            setCurrentSubIdx(prev => prev + 1)
            setCurrentQIdx(0)
          }
        } else if (moveNext === 'student') {
          if (currentSubIdx < markingSubmissions.length - 1) {
            setCurrentSubIdx(prev => prev + 1)
            setCurrentQIdx(0)
          }
        }
      }
    } finally {
      setSavingGrade(false)
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

  // Summary stats across all quizzes
  const totalQuizzes = quizzes.length
  const publishedQuizzes = quizzes.filter(q => q.status === 'PUBLISHED').length
  const totalSubmissions = quizzes.reduce((sum, q) => sum + (q._count?.attempts || q.attempts?.length || 0), 0)

  // Fix 2: Calculate real average score percentage or show '--' if 0 submissions
  let totalPctSum = 0
  let totalAttemptsCount = 0
  quizzes.forEach(q => {
    const qAttempts = q.attempts || []
    const qMax = q.questions?.reduce((acc: number, qu: any) => acc + (qu.maxMarks || qu.points || 10), 0) || 1
    qAttempts.forEach((att: any) => {
      if (att.status === 'GRADED') {
        const pct = (att.score / (att.maxPossibleScore || qMax)) * 100
        totalPctSum += pct
        totalAttemptsCount++
      }
    })
  })
  const avgClassScoreStr = totalAttemptsCount > 0 ? `${Math.round(totalPctSum / totalAttemptsCount)}%` : '--'

  // Fix 3: Capitalize subject name
  const formattedSubjectName = subjectInfo?.name
    ? (subjectInfo.name.charAt(0).toUpperCase() + subjectInfo.name.slice(1))
    : 'Subject'

  if (loading) return <div className="pulse">Loading quizzes...</div>

  return (
    <div className="content-wrapper" style={{ maxWidth: '1150px' }}>
      
      {/* Header: Subject Name + Batch Name + Branch Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ background: '#2979ff', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.25rem 0.85rem', fontWeight: 900, fontSize: '0.8rem' }}>
              📚 {formattedSubjectName}
            </span>
            <span style={{ background: '#aa00ff', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.25rem 0.85rem', fontWeight: 900, fontSize: '0.8rem' }}>
              🎓 {subjectInfo?.batch?.name || 'Batch'}
            </span>
            <span style={{ background: '#00c853', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.25rem 0.85rem', fontWeight: 900, fontSize: '0.8rem', boxShadow: '2px 2px 0px #1a1a2e' }}>
              📍 Kohuwala Branch
            </span>
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a2e' }}>Quizzes & Assessments</h2>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Create topic assessments, evaluate student performance, and view mark analytics.</p>
        </div>

        {/* Fix 7: '+ Create quiz' button with comic treatment and btn-bob */}
        <Link
          href={`/dashboard/teacher/subjects/${subjectId}/quizzes/builder`}
          className="btn-bob"
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
          + Create quiz
        </Link>
      </div>

      {/* Stats Row — Fix 1: Sentence case & Fix 4: Comic treatment */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total quizzes', val: totalQuizzes, bg: '#2979ff', icon: '📝' },
          { label: 'Published quizzes', val: publishedQuizzes, bg: '#00c853', icon: '🚀' },
          { label: 'Total submissions', val: totalSubmissions, bg: '#aa00ff', icon: '📥' },
          { label: 'Avg class score', val: avgClassScoreStr, bg: '#ff6d00', icon: '📊' }
        ].map((st, idx) => (
          <div key={idx} style={{ background: st.bg, color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>{st.label}</span>
              <span style={{ fontSize: '1.25rem' }}>{st.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{st.val}</div>
          </div>
        ))}
      </div>

      {warningMsg && (
        <div style={{ padding: '1rem 1.5rem', background: '#fff3cd', color: '#856404', borderRadius: '14px', marginBottom: '1.5rem', fontWeight: 800, border: '3px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e' }}>
          ⚠️ {warningMsg}
        </div>
      )}

      {/* Quizzes List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {quizzes.map(q => {
          const now = new Date()
          const isOverdue = q.dueDate && new Date(q.dueDate) < now
          const statusBg = q.status === 'PUBLISHED' ? '#00c853' : q.status === 'DRAFT' ? '#ffab00' : isOverdue ? '#f50057' : '#1a1a2e'
          const statusText = q.status === 'PUBLISHED' ? 'Published' : q.status === 'DRAFT' ? 'Draft' : isOverdue ? 'Overdue' : 'Closed'
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
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

                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>{q.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>
                  Topic: {q.topic || 'General Sequence'}
                </p>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#1a1a2e', fontWeight: 800, marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>❓ {q._count?.questions || q.questions?.length || 0} Questions</div>
                  <div>📝 {attemptCount} Submissions</div>
                </div>

                {q.dueDate && (
                  <div style={{ fontSize: '0.75rem', color: isOverdue ? '#f50057' : '#64748b', fontWeight: 800, marginBottom: '1rem' }}>
                    ⏰ Due: {new Date(q.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '2px dashed #cbd5e1', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => openAnalytics(q)}
                    style={{
                      flex: 1,
                      background: '#2979ff',
                      color: '#ffffff',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      boxShadow: '3px 3px 0px #1a1a2e',
                      padding: '0.5rem',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    📊 Analytics
                  </button>
                  <button
                    onClick={() => openMarkingModal(q)}
                    style={{
                      flex: 1,
                      background: '#00c853',
                      color: '#ffffff',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      boxShadow: '3px 3px 0px #1a1a2e',
                      padding: '0.5rem',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Mark now
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEditAttempt(q)}
                    style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.35rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePublishToggle(q)}
                    style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.35rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    {q.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  {q.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleCloseQuiz(q.id)}
                      style={{ flex: 1, background: '#ffffff', color: '#d32f2f', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.35rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  )}
                  <button
                    onClick={() => { setDueDateModalQuiz(q); setNewDueDate(q.dueDate ? new Date(q.dueDate).toISOString().slice(0, 16) : ''); }}
                    style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.35rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Extend
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Fix 6: Empty state container comic treatment & Fix 7: '+ Create your first quiz' button */}
        {quizzes.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '4rem',
            background: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '16px',
            boxShadow: '5px 5px 0px #1a1a2e'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧬</div>
            <h3 style={{ fontWeight: 900, fontSize: '1.6rem', color: '#1a1a2e', marginBottom: '0.5rem' }}>No quizzes created yet</h3>
            <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>Create your first quiz for this subject and branch.</p>
            <Link
              href={`/dashboard/teacher/subjects/${subjectId}/quizzes/builder`}
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
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              + Create your first quiz
            </Link>
          </div>
        )}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Submission Rate', val: `${analyticsData.stats.submissionRate}% (${analyticsData.stats.submittedCount}/${analyticsData.stats.totalEnrolled})`, bg: '#e0f2fe', color: '#0284c7' },
                    { label: 'Average Score', val: `${analyticsData.stats.avgScore} / ${analyticsData.stats.maxPossibleScore}`, bg: '#fef3c7', color: '#b45309' },
                    { label: 'Highest Score', val: `${analyticsData.stats.highestScore} / ${analyticsData.stats.maxPossibleScore}`, bg: '#dcfce7', color: '#15803d' },
                    { label: 'Lowest Score', val: `${analyticsData.stats.lowestScore} / ${analyticsData.stats.maxPossibleScore}`, bg: '#ffebee', color: '#d32f2f' }
                  ].map((st, i) => (
                    <div key={i} style={{ background: st.bg, border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1rem', textAlign: 'center', boxShadow: '3px 3px 0px #1a1a2e' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.2rem' }}>{st.label}</div>
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

      {/* Teacher Manual Marking Modal */}
      {markingQuiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ maxWidth: '950px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setMarkingQuiz(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50%', width: '36px', height: '36px', fontWeight: 900, cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ background: '#00c853', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 900 }}>
                  Teacher Marking Mode
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e', marginTop: '0.2rem' }}>
                  {markingQuiz.title}
                </h3>
              </div>

              {markingSubmissions.length > 0 && (
                <div style={{ background: '#1a1a2e', color: '#ffffff', padding: '0.4rem 1rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.85rem' }}>
                  Student {currentSubIdx + 1} of {markingSubmissions.length} — Question {currentQIdx + 1} of {markingQuiz.questions?.length || 1}
                </div>
              )}
            </div>

            {markingSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontWeight: 700 }}>
                No student submissions found for this quiz yet.
              </div>
            ) : (() => {
              const currentSub = markingSubmissions[currentSubIdx]
              const questions = markingQuiz.questions || []
              const currentQ = questions[currentQIdx]
              const currentAns = currentSub?.answers?.find((a: any) => a.questionId === currentQ?.id) || {}
              const maxMarks = currentQ?.maxMarks || 10

              return (
                <div style={{ display: 'grid', gridTemplateColumns: showMarkSchemePanel ? '1fr 320px' : '1fr', gap: '1.5rem' }}>
                  <div style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 900, color: '#1a1a2e', fontSize: '1rem' }}>
                        Q{currentQIdx + 1}. {currentQ?.text}
                      </span>
                      <span style={{ background: '#2979ff', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 900 }}>
                        {currentQ?.type} ({maxMarks} marks)
                      </span>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      {currentAns.overrideByTeacher ? (
                        <span style={{ background: '#aa00ff', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 900 }}>
                          🔮 Teacher reviewed & overridden
                        </span>
                      ) : currentAns.gradingMethod === 'teacher' ? (
                        <span style={{ background: '#00c853', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 900 }}>
                          👤 Teacher marked
                        </span>
                      ) : currentAns.gradingMethod === 'ai' ? (
                        <span style={{ background: '#2979ff', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 900 }}>
                          🤖 AI graded ({currentAns.marksAwarded} / {maxMarks})
                        </span>
                      ) : (
                        <span style={{ background: '#cbd5e1', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 900 }}>
                          Auto-marked
                        </span>
                      )}
                    </div>

                    <div style={{ background: '#f8fafc', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginBottom: '0.4rem' }}>
                        Student Answer ({currentSub.user?.name || 'Student'})
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a2e', whiteSpace: 'pre-wrap' }}>
                        {currentAns.shortAnswerText || currentAns.answerText || currentAns.selectedOption !== null ? `Selected Option: ${currentAns.selectedOption}` : 'No answer submitted.'}
                      </div>
                    </div>

                    {currentAns.aiFeedback && (
                      <div style={{ background: '#f0fdf4', border: '1.5px solid #00c853', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#15803d', fontWeight: 700 }}>
                        🤖 <strong>AI Initial Suggestion:</strong> {currentAns.aiFeedback}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.25rem' }}>Marks Awarded:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={editMarks}
                            onChange={e => setEditMarks(Number(e.target.value))}
                            style={{ width: '80px', textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, border: '3px solid #1a1a2e', borderRadius: '12px', padding: '0.4rem', color: '#1a1a2e' }}
                          />
                          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1a1a2e' }}>/ {maxMarks}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsOverriding(!isOverriding)}
                        style={{ background: '#ff6d00', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.5rem 1rem', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        ⚡ Override AI Mark
                      </button>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.4rem' }}>Teacher Feedback for Student:</label>
                      <textarea
                        rows={3}
                        value={editFeedback}
                        onChange={e => setEditFeedback(e.target.value)}
                        placeholder="Write constructive teacher feedback..."
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '10px', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => saveQuestionGrade('question')}
                        disabled={savingGrade}
                        style={{ flex: 1, background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '50px', boxShadow: '4px 4px 0px #1a1a2e', padding: '0.75rem', fontWeight: 900, cursor: 'pointer' }}
                      >
                        {savingGrade ? 'Saving...' : '✓ Save & next question'}
                      </button>
                      <button
                        onClick={() => saveQuestionGrade('student')}
                        disabled={savingGrade}
                        style={{ flex: 1, background: '#2979ff', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '50px', boxShadow: '4px 4px 0px #1a1a2e', padding: '0.75rem', fontWeight: 900, cursor: 'pointer' }}
                      >
                        👤 Save & next student
                      </button>
                    </div>

                  </div>

                  {showMarkSchemePanel && (
                    <div style={{ background: '#f0fdf4', border: '3px solid #1a1a2e', borderLeft: '6px solid #00c853', borderRadius: '16px', boxShadow: '4px 4px 0px #1a1a2e', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#15803d' }}>📖 Model Mark Scheme</h4>
                        <button onClick={() => setShowMarkSchemePanel(false)} style={{ background: 'none', border: 'none', fontWeight: 900, cursor: 'pointer' }}>✕</button>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {currentQ?.markScheme || currentQ?.markingCriteria || 'Evaluate based on clear conceptual accuracy and logical presentation.'}
                      </div>
                    </div>
                  )}

                </div>
              )
            })()}

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
