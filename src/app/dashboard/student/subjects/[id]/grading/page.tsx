'use client'

import { useState, useEffect, use } from 'react'

export default function StudentGradingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gradings, setGradings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  
  const [form, setForm] = useState({
    title: '',
    markingScheme: null as File | null,
    answerScript: null as File | null
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchGradings(),
        checkPaymentStatus()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchGradings = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/grading`)
      if (res.ok) setGradings((await res.json()).gradings)
    } catch (err) {
      console.error(err)
    }
  }

  const checkPaymentStatus = async () => {
    try {
      const profileRes = await fetch('/api/student/profile') 
      if (profileRes.ok) {
        const data = await profileRes.json()
        setIsPaid(data.profile.paymentStatus === 'Paid')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPaid) return
    if (!form.markingScheme || !form.answerScript) return
    
    setIsUploading(true)
    setMsg('')
    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('markingScheme', form.markingScheme)
    formData.append('answerScript', form.answerScript)

    try {
      const res = await fetch(`/api/subjects/${id}/grading`, {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        setMsg('Paper graded successfully by AI!')
        setForm({ title: '', markingScheme: null, answerScript: null })
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

  if (!isPaid) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>💎</div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Premium Feature: AI Paper Marking</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          AI-powered grading is only available for students with an active <strong>Paid</strong> subscription. 
          Contact your administrator to upgrade your account and unlock instant feedback.
        </p>
        <div className="card" style={{ background: 'rgba(5, 150, 105, 0.05)', border: '1px dashed var(--accent-primary)' }}>
          <p style={{ fontWeight: 600 }}>Why upgrade?</p>
          <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '1rem', color: 'var(--text-secondary)' }}>
            <li>✅ Instant grading for any practice paper</li>
            <li>✅ Detailed question-by-question AI feedback</li>
            <li>✅ Auto-sync with your performance graphs</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>My AI Gradings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Upload your practice papers and get instant grading from our AI engine.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Submit New Paper</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Exam Title</label>
              <input className="input-field" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Physics Past Paper 2023" />
            </div>
            <div>
              <label className="label">Marking Scheme (PDF)</label>
              <input type="file" accept=".pdf" className="input-field" required onChange={e => setForm({...form, markingScheme: e.target.files?.[0] || null})} />
            </div>
            <div>
              <label className="label">Your Answer Script (PDF)</label>
              <input type="file" accept=".pdf" className="input-field" required onChange={e => setForm({...form, answerScript: e.target.files?.[0] || null})} />
            </div>
            <button type="submit" className="btn-primary" disabled={isUploading}>
              {isUploading ? '🤖 AI is Grading...' : '🚀 Submit for AI Grading'}
            </button>
            {msg && <p style={{ color: msg.includes('Error') || msg.includes('fail') ? 'var(--error)' : 'var(--success)', fontSize: '0.875rem', textAlign: 'center' }}>{msg}</p>}
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>My Results</h3>
          {gradings.map((g, idx) => (
            <div key={g.id} className={`card stagger-${(idx % 5) + 1}`} style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{g.title}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(g.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-dark)' }}>{g.totalMarks}/{g.maxMarks}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{g.aiSummary}</p>
              </div>
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)', cursor: 'pointer' }}>Detailed AI Feedback</summary>
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{g.feedback}</div>
              </details>
            </div>
          ))}
          {gradings.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No papers submitted yet.</div>}
        </div>
      </div>
    </div>
  )
}
