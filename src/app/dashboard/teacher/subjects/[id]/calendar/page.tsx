'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SessionResourceBar from '@/components/SessionResourceBar'

export default function TeacherCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [editingSession, setEditingSession] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    durationMins: 60,
    syllabusCodes: '' // New field
  })

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
      }
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (session: any) => {
    setEditingSession(session)
    setFormData({
      title: session.title,
      description: session.description || '',
      scheduledDate: new Date(session.scheduledDate).toISOString().slice(0, 16),
      durationMins: session.durationMins,
      syllabusCodes: session.syllabusObjectives?.map((o: any) => o.code).join(', ') || ''
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const url = editingSession ? `/api/sessions/${editingSession.id}` : `/api/subjects/${id}/sessions`
      const method = editingSession ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        setShowModal(false)
        setEditingSession(null)
        setFormData({ title: '', description: '', scheduledDate: '', durationMins: 60, syllabusCodes: '' })
        fetchSessions()
      } else {
        setError(data.error || 'Failed to save session')
      }
    } catch (err: any) {
      setError('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (sessionId: string, status: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) fetchSessions()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading && sessions.length === 0) return <div className="pulse">Loading calendar...</div>

  return (
    <div className="content-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Lesson Planner & Calendar</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Map your academic year and schedule classes.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingSession(null); setFormData({ title: '', description: '', scheduledDate: '', durationMins: 60, syllabusCodes: '' }); setShowModal(true); }}>
          + Schedule Class
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Date & Time</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Topic / Title</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                <td style={{ padding: '1rem', fontWeight: 700 }}>
                  {new Date(s.scheduledDate).toLocaleString('en-GB', { 
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                  })}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{s.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{s.description}</div>
                  
                  {s.syllabusObjectives?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                      {s.syllabusObjectives.map((o: any) => (
                        <span key={o.id} title={o.description} className="badge" style={{ fontSize: '0.65rem', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                          🎯 {o.code}
                        </span>
                      ))}
                    </div>
                  )}

                  <SessionResourceBar sessionId={s.id} />
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${
                    s.status === 'SCHEDULED' ? 'badge-pending' : 
                    s.status === 'TAUGHT' ? 'badge-paid' : 
                    s.status === 'RESCHEDULED' ? 'badge-pending' : 'badge-level'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEdit(s)}>Edit</button>
                    {s.status !== 'TAUGHT' && s.status !== 'CANCELLED' && (
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--success)', color: 'white', border: 'none' }} onClick={() => handleStatusUpdate(s.id, 'TAUGHT')}>Mark Taught</button>
                    )}
                    {s.status !== 'CANCELLED' && (
                      <Link href={`/dashboard/teacher/subjects/${id}/sessions/${s.id}/attendance`} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-tertiary)' }}>Attendance</Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--text-primary)' }}>{editingSession ? 'Edit Class' : 'Schedule New Class'}</h3>
            
            {error && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Class Title / Topic</label>
                <input type="text" className="input-field" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Intro to Genetics" />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Syllabus Objectives (Copy-Paste Codes)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.syllabusCodes} 
                  onChange={e => setFormData({...formData, syllabusCodes: e.target.value})} 
                  placeholder="e.g. BIO-1.1, BIO-1.2 (Separated by commas)" 
                  style={{ border: '1px solid var(--accent-primary)', background: 'rgba(124, 58, 237, 0.05)' }}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>These will be automatically cross-checked with the subject syllabus.</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Description / Subtopics</label>
                <textarea className="input-field" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What will be covered..." style={{ minHeight: '100px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Date & Time</label>
                  <input type="datetime-local" className="input-field" required value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Duration (mins)</label>
                  <input type="number" className="input-field" required value={formData.durationMins} onChange={e => setFormData({...formData, durationMins: parseInt(e.target.value)})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '1rem' }} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Class Session'}
                </button>
                <button type="button" className="btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
