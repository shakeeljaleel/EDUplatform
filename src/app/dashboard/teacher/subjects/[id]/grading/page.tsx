'use client'

import { useState, useEffect, use } from 'react'

export default function TeacherGradingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gradings, setGradings] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [msg, setMsg] = useState('')
  
  const [form, setForm] = useState({
    title: '',
    studentId: '',
    markingScheme: null as File | null,
    answerScript: null as File | null
  })

  useEffect(() => {
    fetchGradings()
    fetchStudents()
  }, [])

  const fetchGradings = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/grading`)
      if (res.ok) setGradings((await res.json()).gradings)
    } finally { setLoading(false) }
  }

  const fetchStudents = async () => {
    const res = await fetch('/api/users?role=STUDENT')
    if (res.ok) setStudents((await res.json()).users)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.markingScheme || !form.answerScript) return
    
    setIsUploading(true)
    setMsg('')
    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('studentId', form.studentId)
    formData.append('markingScheme', form.markingScheme)
    formData.append('answerScript', form.answerScript)

    try {
      const res = await fetch(`/api/subjects/${id}/grading`, {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        setMsg('Paper graded successfully by AI!')
        setForm({ title: '', studentId: '', markingScheme: null, answerScript: null })
        fetchGradings()
      } else {
        const d = await res.json()
        setMsg(d.error || 'Grading failed')
      }
    } catch (err) {
      setMsg('Error processing request')
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) return <div className="pulse">Loading Paper Marking...</div>

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>AI Paper Marking</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Upload a marking scheme and an answer script. Our AI will grade it question by question.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Upload Form */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Upload Paper for Grading</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Exam Title</label>
              <input className="input-field" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Midterm Physics Paper 1" />
            </div>
            <div>
              <label className="label">Select Student</label>
              <select className="input-field" required value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})}>
                <option value="">Choose a student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Marking Scheme (PDF)</label>
              <input type="file" accept=".pdf" className="input-field" required onChange={e => setForm({...form, markingScheme: e.target.files?.[0] || null})} />
            </div>
            <div>
              <label className="label">Answer Script (PDF)</label>
              <input type="file" accept=".pdf" className="input-field" required onChange={e => setForm({...form, answerScript: e.target.files?.[0] || null})} />
            </div>
            <button type="submit" className="btn-primary" disabled={isUploading}>
              {isUploading ? '🤖 AI is Grading...' : '🚀 Start AI Grading'}
            </button>
            {msg && <p style={{ color: msg.includes('Error') || msg.includes('fail') ? 'var(--error)' : 'var(--success)', fontSize: '0.875rem', textAlign: 'center' }}>{msg}</p>}
          </form>
        </div>

        {/* History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Grading History</h3>
          {gradings.map((g, idx) => (
            <div key={g.id} className={`card stagger-${(idx % 5) + 1}`} style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{g.title}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Student: {g.student.name} • {new Date(g.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-dark)' }}>{g.totalMarks}/{g.maxMarks}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score: {Math.round((g.totalMarks/g.maxMarks)*100)}%</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>AI Summary:</strong>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{g.aiSummary}</p>
              </div>
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)', cursor: 'pointer' }}>View Detailed Feedback</summary>
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{g.feedback}</div>
              </details>
            </div>
          ))}
          {gradings.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No papers graded yet.</div>}
        </div>
      </div>
    </div>
  )
}
