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
    <div className="content-wrapper" style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a2e' }}>Lesson Planner & Calendar</h2>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Map your academic year and schedule classes.</p>
        </div>
        <button
          style={{
            background: '#00c853',
            color: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '50px',
            boxShadow: '4px 4px 0px #1a1a2e',
            padding: '0.7rem 1.8rem',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          onClick={() => { setEditingSession(null); setFormData({ title: '', description: '', scheduledDate: '', durationMins: 60, syllabusCodes: '' }); setShowModal(true); }}
        >
          + Schedule class
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '3px solid #1a1a2e' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem 1.25rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#1a1a2e', fontWeight: 800 }}>Date & time</th>
              <th style={{ textAlign: 'left', padding: '1rem 1.25rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#1a1a2e', fontWeight: 800 }}>Topic / title</th>
              <th style={{ textAlign: 'left', padding: '1rem 1.25rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#1a1a2e', fontWeight: 800 }}>Status</th>
              <th style={{ textAlign: 'left', padding: '1rem 1.25rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#1a1a2e', fontWeight: 800 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} style={{ borderBottom: '2px solid #e2e8f0' }}>
                <td style={{ padding: '1.25rem', fontWeight: 800, color: '#1a1a2e', fontSize: '0.95rem', verticalAlign: 'top', width: '220px' }}>
                  {new Date(s.scheduledDate).toLocaleString('en-GB', { 
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                  })}
                </td>
                <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '0.35rem', color: '#1a1a2e' }}>{s.title}</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>{s.description}</div>
                  
                  {s.syllabusObjectives?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                      {s.syllabusObjectives.map((o: any) => (
                        <span key={o.id} title={o.description} style={{ fontSize: '0.75rem', background: '#f3e8ff', color: '#7e22ce', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.65rem', fontWeight: 800, boxShadow: '2px 2px 0px #1a1a2e' }}>
                          🎯 {o.code}
                        </span>
                      ))}
                    </div>
                  )}

                  <SessionResourceBar sessionId={s.id} />
                </td>
                <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.3rem 0.85rem',
                    borderRadius: '50px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    border: '2px solid #1a1a2e',
                    boxShadow: '2px 2px 0px #1a1a2e',
                    background: s.status === 'TAUGHT' ? '#00c853' : s.status === 'SCHEDULED' ? '#ffab00' : '#ff6d00',
                    color: s.status === 'TAUGHT' ? '#ffffff' : '#1a1a2e'
                  }}>
                    {s.status === 'TAUGHT' ? 'Taught' : s.status === 'SCHEDULED' ? 'Scheduled' : s.status === 'RESCHEDULED' ? 'Rescheduled' : s.status}
                  </span>
                </td>
                <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => openEdit(s)}
                      style={{
                        background: '#ffffff',
                        color: '#1a1a2e',
                        border: '2px solid #1a1a2e',
                        borderRadius: '50px',
                        boxShadow: '3px 3px 0px #1a1a2e',
                        padding: '0.4rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    {s.status !== 'TAUGHT' && s.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleStatusUpdate(s.id, 'TAUGHT')}
                        style={{
                          background: '#00c853',
                          color: '#ffffff',
                          border: '2px solid #1a1a2e',
                          borderRadius: '50px',
                          boxShadow: '3px 3px 0px #1a1a2e',
                          padding: '0.4rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Mark Taught
                      </button>
                    )}
                    {s.status !== 'CANCELLED' && (
                      <Link
                        href={`/dashboard/teacher/subjects/${id}/sessions/${s.id}/attendance`}
                        style={{
                          background: '#ffffff',
                          color: '#1a1a2e',
                          border: '2px solid #1a1a2e',
                          borderRadius: '50px',
                          boxShadow: '3px 3px 0px #1a1a2e',
                          padding: '0.4rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        Attendance
                      </Link>
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
