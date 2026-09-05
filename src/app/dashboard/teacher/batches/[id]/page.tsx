'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { RoughFilter } from '@/components/HandDrawnIcons'

export default function TeacherBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [subjects, setSubjects] = useState<any[]>([])
  const [activeSubject, setActiveSubject] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [batch, setBatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [newSubjectName, setNewSubjectName] = useState('')
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [chapter, setChapter] = useState('')
  const [topic, setTopic] = useState('')
  const [subtopic, setSubtopic] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')

  useEffect(() => {
    fetchBatch()
    fetchSubjects()
  }, [])

  const fetchBatch = async () => {
    try {
      const res = await fetch(`/api/batches/${id}`)
      if (res.ok) {
        const data = await res.json()
        setBatch(data.batch)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    const res = await fetch(`/api/batches/${id}/subjects`)
    if (res.ok) {
      const data = await res.json()
      setSubjects(data.subjects)
      if (data.subjects.length > 0 && activeSubject === null) {
        setActiveSubject(data.subjects[0].id)
      }
    }
  }

  useEffect(() => {
    fetchQuizzes()
  }, [activeSubject])

  const fetchQuizzes = async () => {
    const url = activeSubject
      ? `/api/quizzes?batchId=${id}&subjectId=${activeSubject}`
      : `/api/quizzes?batchId=${id}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setQuizzes(data.quizzes)
    }
  }

  const togglePublish = async (quizId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    const res = await fetch(`/api/quizzes/${quizId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) fetchQuizzes()
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return
    const res = await fetch(`/api/batches/${id}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubjectName }),
    })
    if (res.ok) {
      setNewSubjectName('')
      setShowAddSubject(false)
      fetchSubjects()
    }
  }

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        batchId: id, 
        subjectId: activeSubject, 
        title, 
        chapter,
        topic, 
        subtopic,
        scheduledDate: scheduledDate || null 
      }),
    })
    if (res.ok) {
      setShowCreate(false)
      setTitle(''); setChapter(''); setTopic(''); setSubtopic(''); setScheduledDate('')
      fetchQuizzes()
    }
  }

  if (loading) return (
    <div className="content-wrapper pulse" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <h2 style={{ fontWeight: 900 }}>Synchronizing Batch Assessments...</h2>
    </div>
  )

  return (
    <div className="content-wrapper fade-in">
      <RoughFilter />
      <div style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>{batch?.name}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>Curriculum alignment and granular assessment management.</p>
      </div>

      {/* Subject Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap', padding: '1.5rem', background: 'var(--bg-accent)', borderRadius: '24px', border: '3px solid var(--text-primary)', boxShadow: '8px 8px 0 var(--text-primary)' }}>
        <button
          onClick={() => { setActiveSubject(null); setShowCreate(false) }}
          style={{
            padding: '12px 24px', borderRadius: '14px', fontWeight: 900, fontSize: '0.9rem',
            border: '2px solid var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s',
            backgroundColor: activeSubject === null ? 'var(--text-primary)' : 'white',
            color: activeSubject === null ? 'white' : 'var(--text-primary)',
            boxShadow: activeSubject === null ? 'none' : '4px 4px 0 var(--text-primary)',
            textTransform: 'uppercase'
          }}
        >
          All Subjects
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => { setActiveSubject(s.id); setShowCreate(false) }}
            style={{
              padding: '12px 24px', borderRadius: '14px', fontWeight: 900, fontSize: '0.9rem',
              border: '2px solid var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: activeSubject === s.id ? 'var(--text-primary)' : 'white',
              color: activeSubject === s.id ? 'white' : 'var(--text-primary)',
              boxShadow: activeSubject === s.id ? 'none' : '4px 4px 0 var(--text-primary)',
              textTransform: 'uppercase'
            }}
          >
            {s.name}
          </button>
        ))}
        <button onClick={() => setShowAddSubject(true)} className="sketch-button-v2" style={{ background: 'var(--dna-blue)', padding: '10px 20px', fontSize: '0.8rem' }}>+ Add Subject</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>{activeSubject ? 'Subject Assessments' : 'Global Batch Quizzes'}</h2>
        <button className="sketch-button-v2" onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : '+ Create Assessment'}</button>
      </div>

      {showAddSubject && (
        <div className="premium-card-v2" style={{ marginBottom: '3rem' }}>
           <h3 style={{ marginBottom: '1.5rem' }}>Initialize New Subject</h3>
           <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '1rem' }}>
             <input className="input-field" required value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Molecular Biology" style={{ border: '2px solid var(--text-primary)', borderRadius: '12px', fontWeight: 700 }} />
             <button type="submit" className="sketch-button-v2">Create</button>
             <button type="button" className="sketch-button-v2" style={{ background: 'var(--text-secondary)' }} onClick={() => setShowAddSubject(false)}>Abort</button>
           </form>
        </div>
      )}

      {showCreate && (
        <div className="premium-card-v2" style={{ marginBottom: '3rem' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.75rem' }}>Draft New Assessment</h3>
          <form onSubmit={handleCreateQuiz} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>Quiz Title</label>
              <input className="input-field" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. End of Term Practical" style={{ border: '2px solid var(--text-primary)', borderRadius: '12px', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>Chapter / Unit</label>
              <input className="input-field" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="e.g. Cell Division" style={{ border: '2px solid var(--text-primary)', borderRadius: '12px', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>Learning Topic</label>
              <input className="input-field" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Mitosis Phases" style={{ border: '2px solid var(--text-primary)', borderRadius: '12px', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>Scheduled Date</label>
              <input type="datetime-local" className="input-field" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} style={{ border: '2px solid var(--text-primary)', borderRadius: '12px', fontWeight: 700 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="sketch-button-v2" style={{ width: '100%' }}>Initialize Quiz Helix</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="premium-card-v2" style={{ borderTop: '12px solid var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  {quiz.subject?.name || 'General Batch'}
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1.2 }}>{quiz.title}</h3>
              </div>
              <button 
                onClick={() => togglePublish(quiz.id, quiz.status)}
                className="sketch-badge"
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: quiz.status === 'PUBLISHED' ? 'var(--accent-primary)' : 'white',
                  color: quiz.status === 'PUBLISHED' ? 'white' : 'var(--text-primary)',
                  boxShadow: quiz.status === 'PUBLISHED' ? 'none' : '3px 3px 0 var(--text-primary)'
                }}
              >
                {quiz.status}
              </button>
            </div>
            <div style={{ background: 'var(--bg-accent)', padding: '1rem', borderRadius: '12px', border: '2px solid var(--text-primary)', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Chapter: {quiz.chapter || 'Uncategorized'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>Topic: {quiz.topic || 'General'}</div>
            </div>
            <Link href={`/dashboard/teacher/batches/${id}/quizzes/${quiz.id}`} className="sketch-button-v2" style={{ width: '100%', display: 'block', textAlign: 'center', background: 'white', color: 'var(--text-primary)' }}>
              Configure Questions
            </Link>
          </div>
        ))}
        {quizzes.length === 0 && !showCreate && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '6rem' }}>
            <div style={{ fontSize: '4rem' }}>🧬</div>
            <h3 style={{ fontWeight: 900, color: 'var(--text-secondary)', marginTop: '1.5rem' }}>No assessments in the current sequence.</h3>
          </div>
        )}
      </div>
    </div>
  )
}
