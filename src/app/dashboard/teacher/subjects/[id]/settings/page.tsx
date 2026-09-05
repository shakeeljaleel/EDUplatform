'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function SubjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [batch, setBatch] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [objectives, setObjectives] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  // Form states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [newDay, setNewDay] = useState('1')
  const [newTime, setNewTime] = useState('10:00')
  const [bulkSyllabus, setBulkSyllabus] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const subRes = await fetch(`/api/subjects/${id}`)
      if (subRes.ok) {
        const subData = await subRes.json()
        const b = subData.subject.batch
        setBatch(b)
        if (b.startDate) setStartDate(new Date(b.startDate).toISOString().split('T')[0])
        if (b.endDate) setEndDate(new Date(b.endDate).toISOString().split('T')[0])
      }
      
      const schedRes = await fetch(`/api/subjects/${id}/schedule`)
      if (schedRes.ok) setSchedules((await schedRes.json()).schedules)

      const sylRes = await fetch(`/api/subjects/${id}/syllabus`)
      if (sylRes.ok) setObjectives(await sylRes.json())

    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/subjects/${id}/syllabus`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        alert('AI successfully analyzed the syllabus and extracted objectives!')
        fetchData()
      } else {
        const d = await res.json()
        alert(d.error || 'AI analysis failed')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const saveBatchDates = async () => {
    if (!batch) return
    const res = await fetch(`/api/batches/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate })
    })
    if (res.ok) alert('Batch timeline updated!')
  }

  const addSchedule = async () => {
    const res = await fetch(`/api/subjects/${id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek: parseInt(newDay), startTime: newTime })
    })
    if (res.ok) fetchData()
  }

  const deleteSchedule = async (sid: string) => {
    const res = await fetch(`/api/subjects/${id}/schedule?id=${sid}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  const handleBulkUpload = async () => {
    const res = await fetch(`/api/subjects/${id}/syllabus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulkText: bulkSyllabus })
    })
    if (res.ok) {
      alert('Syllabus objectives uploaded!')
      setBulkSyllabus('')
      fetchData()
    } else {
      const d = await res.json()
      alert(d.error || 'Upload failed')
    }
  }

  const deleteObjective = async (oid: string) => {
    const res = await fetch(`/api/subjects/${id}/syllabus?id=${oid}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  if (loading) return <div className="pulse">Loading academic settings...</div>

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/dashboard/teacher/subjects/${id}`} style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}>← Back to Subject</Link>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem' }}>Master Academic Settings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Advanced academic management with AI-powered syllabus analysis.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* AI SYLLABUS UPLOAD */}
          <div className="card" style={{ border: '2px dashed var(--accent-primary)', background: 'rgba(124, 58, 237, 0.02)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🤖 AI Master Syllabus Upload
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Upload a PDF of your curriculum. Gemini AI will extract all learning objectives to build your tracker.
            </p>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload} 
                disabled={analyzing}
                style={{ 
                  width: '100%', padding: '2rem', border: '1px dashed var(--bg-tertiary)', 
                  borderRadius: 'var(--radius-md)', cursor: analyzing ? 'not-allowed' : 'pointer',
                  textAlign: 'center'
                }} 
              />
              {analyzing && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}>
                  <div className="pulse" style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>AI is analyzing full syllabus...</div>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Or Bulk Paste (CODE: Description)</h4>
              <textarea 
                className="input-field" 
                style={{ minHeight: '100px', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
                placeholder="BIO-1.1: Cell Structure..."
                value={bulkSyllabus}
                onChange={e => setBulkSyllabus(e.target.value)}
              />
              <button className="btn-secondary" style={{ width: '100%' }} onClick={handleBulkUpload}>Import Text Syllabus</button>
            </div>

            {/* LIST OF OBJECTIVES */}
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Master Objectives ({objectives.length})</h4>
              <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {objectives.map(obj => (
                  <div key={obj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)', marginRight: '0.5rem' }}>{obj.code}</span>
                      {obj.description}
                    </div>
                    <button onClick={() => deleteObjective(obj.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* BATCH TIMELINE */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>📅 Batch Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Batch Start Date</label>
                <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Batch End Date</label>
                <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <button className="btn-primary" style={{ width: '100%' }} onClick={saveBatchDates}>Save Batch Timeline</button>
            </div>
          </div>

          {/* RECURRING SCHEDULE */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>⏰ Weekly Class Schedule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {schedules.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: 600 }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.dayOfWeek]} at {s.startTime}
                  </span>
                  <button onClick={() => deleteSchedule(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Remove</button>
                </div>
              ))}

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <select className="input-field" value={newDay} onChange={e => setNewDay(e.target.value)}>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                    <option value="0">Sunday</option>
                  </select>
                  <input type="time" className="input-field" value={newTime} onChange={e => setNewTime(e.target.value)} />
                </div>
                <button className="btn-secondary" style={{ width: '100%', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }} onClick={addSchedule}>+ Add To Weekly Schedule</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
