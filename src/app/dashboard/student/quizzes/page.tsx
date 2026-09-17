'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'UPCOMING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE'>('ACTIVE')

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes')
      if (res.ok) {
        const data = await res.json()
        setQuizzes(data.quizzes || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()

  // Categorize Quizzes
  const activeQuizzes = quizzes.filter(q => {
    const isCompleted = q.attempts && q.attempts.length > 0
    const isOverdue = q.dueDate && new Date(q.dueDate) < now && !isCompleted
    return q.status === 'PUBLISHED' && !isCompleted && !isOverdue
  })

  const upcomingQuizzes = quizzes.filter(q => q.status === 'DRAFT' || (q.scheduledDate && new Date(q.scheduledDate) > now))

  const submittedQuizzes = quizzes.filter(q => {
    const attempt = q.attempts?.[0]
    return attempt && attempt.status !== 'GRADED'
  })

  const gradedQuizzes = quizzes.filter(q => {
    const attempt = q.attempts?.[0]
    return attempt && attempt.status === 'GRADED'
  })

  const overdueQuizzes = quizzes.filter(q => {
    const isCompleted = q.attempts && q.attempts.length > 0
    return q.dueDate && new Date(q.dueDate) < now && !isCompleted
  })

  const tabQuizzes = activeTab === 'ACTIVE' ? activeQuizzes
    : activeTab === 'UPCOMING' ? upcomingQuizzes
    : activeTab === 'SUBMITTED' ? submittedQuizzes
    : activeTab === 'GRADED' ? gradedQuizzes
    : overdueQuizzes

  if (loading) return <div className="pulse">Loading quizzes...</div>

  return (
    <div className="content-wrapper fade-in" style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1a1a2e' }}>Quizzes & Assessments</h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', fontWeight: 600 }}>
          Test your mastery, earn HELIX points, stars, and climb the leaderboard!
        </p>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'ACTIVE', label: 'Active', count: activeQuizzes.length, color: '#00c853' },
          { key: 'UPCOMING', label: 'Upcoming', count: upcomingQuizzes.length, color: '#2979ff' },
          { key: 'SUBMITTED', label: 'Submitted', count: submittedQuizzes.length, color: '#ffab00' },
          { key: 'GRADED', label: 'Graded', count: gradedQuizzes.length, color: '#aa00ff' },
          { key: 'OVERDUE', label: 'Overdue', count: overdueQuizzes.length, color: '#f50057' }
        ].map(t => {
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: '0.6rem 1.4rem',
                background: isActive ? t.color : '#ffffff',
                color: isActive ? '#ffffff' : '#1a1a2e',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: isActive ? `3px 3px 0px #1a1a2e` : '2px 2px 0px #1a1a2e',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{t.label}</span>
              <span style={{ background: isActive ? 'rgba(255,255,255,0.3)' : '#f8fafc', color: isActive ? '#ffffff' : '#1a1a2e', padding: '0.1rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid #1a1a2e' }}>
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Quizzes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '2rem' }}>
        {tabQuizzes.map((quiz) => {
          const attempt = quiz.attempts && quiz.attempts.length > 0 ? quiz.attempts[0] : null
          const isCompleted = !!attempt
          const isOverdue = quiz.dueDate && new Date(quiz.dueDate) < now && !isCompleted

          const maxScore = quiz.questions?.reduce((acc: number, q: any) => acc + (q.maxMarks || q.points || 10), 0) || 10
          const pct = isCompleted && maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : null

          let stars = 0
          if (pct !== null) {
            if (pct >= 90) stars = 5
            else if (pct >= 75) stars = 4
            else if (pct >= 60) stars = 3
            else if (pct >= 40) stars = 2
            else stars = 1
          }

          const subjectColor = quiz.subject?.colour || '#2979ff'

          return (
            <div
              key={quiz.id}
              style={{
                background: isOverdue ? '#fff5f5' : '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'transform 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{
                    background: subjectColor,
                    color: '#ffffff',
                    border: '1.5px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}>
                    {quiz.subject?.name || 'General'}
                  </span>

                  {quiz.linkedSession && (
                    <span style={{
                      background: '#2979ff',
                      color: '#ffffff',
                      border: '1.5px solid #1a1a2e',
                      borderRadius: '50px',
                      padding: '0.15rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}>
                      Based on: {quiz.linkedSession.title}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>{quiz.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>
                  Topic: {quiz.topic || 'General Sequence'}
                </p>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#1a1a2e', fontWeight: 800, marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>❓ {quiz.questions?.length || 0} Questions</div>
                  <div>🎯 {maxScore} Marks Total</div>
                </div>

                {quiz.dueDate && (
                  <div style={{ marginBottom: '1rem' }}>
                    {isOverdue ? (
                      <span style={{ background: '#f50057', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 900 }}>
                        ⚠️ Overdue — Due {new Date(quiz.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                        ⏰ Due {new Date(quiz.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isCompleted ? (
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#00c853' }}>
                      Result: {pct}% ({attempt.score}/{maxScore})
                    </div>
                    <div style={{ color: '#ffd700', fontSize: '0.85rem' }}>{'★'.repeat(stars)}</div>
                  </div>
                ) : (
                  <span style={{
                    background: quiz.status === 'CLOSED' ? '#1a1a2e' : '#ffab00',
                    color: '#ffffff',
                    border: '1.5px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}>
                    {quiz.status === 'CLOSED' ? 'Closed' : 'Not started'}
                  </span>
                )}

                <Link
                  href={`/dashboard/student/quizzes/${quiz.id}`}
                  style={{
                    background: isCompleted ? '#ffffff' : '#00c853',
                    color: isCompleted ? '#1a1a2e' : '#ffffff',
                    border: '2.5px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '3px 3px 0px #1a1a2e',
                    padding: '0.5rem 1.3rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    textDecoration: 'none'
                  }}
                >
                  {isCompleted ? 'View results' : quiz.status === 'CLOSED' ? 'View quiz' : 'Start quiz →'}
                </Link>
              </div>
            </div>
          )
        })}

        {tabQuizzes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '6px 6px 0px #1a1a2e' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🧪</div>
            <h3 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1a1a2e' }}>No {activeTab.toLowerCase()} quizzes</h3>
            <p style={{ color: '#64748b', fontWeight: 600 }}>There are currently no quizzes in this view category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
