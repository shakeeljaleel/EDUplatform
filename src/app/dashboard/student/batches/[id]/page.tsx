'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function StudentBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [subjects, setSubjects] = useState<any[]>([])
  const [activeSubject, setActiveSubject] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInit()
  }, [])

  useEffect(() => {
    if (activeSubject) fetchQuizzes()
  }, [activeSubject])

  const searchParams = useSearchParams()
  const initialSubjectId = searchParams.get('subjectId')

  const fetchInit = async () => {
    try {
      const [subjectRes, leaderRes] = await Promise.all([
        fetch(`/api/batches/${id}/subjects`),
        fetch(`/api/batches/${id}/leaderboard`)
      ])
      if (subjectRes.ok) {
        const data = await subjectRes.json()
        setSubjects(data.subjects)
        
        if (initialSubjectId && data.subjects.some((s: any) => s.id === initialSubjectId)) {
          setActiveSubject(initialSubjectId)
        } else if (data.subjects.length > 0) {
          setActiveSubject(data.subjects[0].id)
        } else {
          // No subjects — fetch all quizzes for this batch
          const qRes = await fetch(`/api/quizzes?batchId=${id}`)
          if (qRes.ok) setQuizzes((await qRes.json()).quizzes)
        }
      }
      if (leaderRes.ok) {
        const data = await leaderRes.json()
        setLeaderboard(data.leaderboard)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchQuizzes = async () => {
    const url = activeSubject
      ? `/api/quizzes?batchId=${id}&subjectId=${activeSubject}`
      : `/api/quizzes?batchId=${id}`
    const res = await fetch(url)
    if (res.ok) setQuizzes((await res.json()).quizzes)
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading classroom...</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
      <div>
        {/* Subject Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveSubject(null)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: '2px solid',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: activeSubject === null ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              borderColor: activeSubject === null ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: activeSubject === null ? 'white' : 'var(--text-secondary)',
            }}
          >
            All Quizzes
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.id)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: '2px solid',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: activeSubject === s.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                borderColor: activeSubject === s.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: activeSubject === s.id ? 'white' : 'var(--text-secondary)',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
            {activeSubject
              ? `${subjects.find(s => s.id === activeSubject)?.name} Quizzes`
              : 'All Available Quizzes'}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {quizzes.map((quiz) => {
            const isCompleted = quiz.attempts && quiz.attempts.length > 0;
            const score = isCompleted ? quiz.attempts[0].score : null;
            
            return (
              <div key={quiz.id} className="card" style={{ opacity: isCompleted ? 0.85 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{quiz.title}</h3>
                  {isCompleted && <span className="badge badge-paid">✓ Completed</span>}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1rem' }}>
                  {quiz.chapter && <div><span style={{ fontWeight: 600 }}>Ch:</span> {quiz.chapter}</div>}
                  {quiz.topic && <div><span style={{ fontWeight: 600 }}>Topic:</span> {quiz.topic}</div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-level">
                    {isCompleted ? `Score: ${score}%` : `${quiz._count?.questions || 0} Questions`}
                  </span>
                  {isCompleted ? (
                    <button className="btn-secondary" disabled style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'not-allowed' }}>
                      Already Taken
                    </button>
                  ) : (
                    <Link href={`/dashboard/student/quizzes/${quiz.id}`} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      Take Quiz
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {quizzes.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No quizzes available{subjects.length > 0 ? ' in this subject' : ''} yet.</p>
          )}
        </div>
      </div>

      {/* Leaderboard Sidebar */}
      <div>
        <div className="card" style={{ position: 'sticky', top: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>🏆 Class Leaderboard</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {leaderboard.map((student, index) => (
              <div key={student.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                backgroundColor: index === 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: index === 0 ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent'
              }}>
                <div style={{ fontWeight: 700, color: index === 0 ? '#d97706' : index === 1 ? '#6b7280' : '#92400e', width: '22px', fontSize: '0.875rem' }}>
                  #{index + 1}
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{student.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>⭐ {student.stars}</div>
                {student.medals > 0 && <div style={{ fontSize: '0.8rem' }}>🏅 {student.medals}</div>}
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No scores yet. Be the first!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
