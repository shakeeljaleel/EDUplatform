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

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    syllabusCodes: '',
    description: '',
    scheduledDate: '',
    durationOption: '60', // 30, 45, 60, 90, 120, 150, 180, CUSTOM
    customDuration: 60,
    classType: 'PHYSICAL', // PHYSICAL, ONLINE, HYBRID
    meetingLink: '',
    recordingAvailable: true,
    isRecurring: false,
    recurrenceFrequency: 'Weekly', // Weekly, Fortnightly, Monthly
    recurrenceDays: [1], // 0-6 (Sun-Sat), default Mon
    recurrenceEndDate: '',
    sendNotification: true,
    customNotificationMessage: '',
    alsoNotifyParents: true,
    resourcesList: [] as { title: string; url: string }[]
  })

  // Resource draft inputs
  const [newResTitle, setNewResTitle] = useState('')
  const [newResUrl, setNewResUrl] = useState('')

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

  // Update notification text when date/title/duration change if user hasn't edited manually
  useEffect(() => {
    if (!formData.title && !formData.scheduledDate) return
    const durMins = formData.durationOption === 'CUSTOM' ? formData.customDuration : parseInt(formData.durationOption)
    const durLabel = durMins >= 60 ? `${durMins / 60} hour${durMins / 60 > 1 ? 's' : ''}` : `${durMins} mins`
    let dateStr = '[Date]'
    if (formData.scheduledDate) {
      try {
        dateStr = new Date(formData.scheduledDate).toLocaleString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        })
      } catch (e) {}
    }
    const autoMsg = `New class scheduled: ${formData.title || '[Topic]'} on ${dateStr}. Duration: ${durLabel}.`
    setFormData(prev => ({ ...prev, customNotificationMessage: autoMsg }))
  }, [formData.title, formData.scheduledDate, formData.durationOption, formData.customDuration])

  const openEdit = (session: any) => {
    setEditingSession(session)
    let resList = []
    try {
      if (session.resourcesList) resList = JSON.parse(session.resourcesList)
    } catch (e) {}

    let recRule: any = {}
    try {
      if (session.recurrenceRule) recRule = JSON.parse(session.recurrenceRule)
    } catch (e) {}

    const durMins = session.durationMins || 60
    const standardDurations = [30, 45, 60, 90, 120, 150, 180]
    const isStandard = standardDurations.includes(durMins)

    setFormData({
      title: session.title,
      syllabusCodes: session.syllabusObjectives?.map((o: any) => o.code).join(', ') || session.syllabusCodes || '',
      description: session.description || '',
      scheduledDate: session.scheduledDate ? new Date(session.scheduledDate).toISOString().slice(0, 16) : '',
      durationOption: isStandard ? String(durMins) : 'CUSTOM',
      customDuration: durMins,
      classType: session.classType || 'PHYSICAL',
      meetingLink: session.meetingLink || '',
      recordingAvailable: session.recordingAvailable ?? true,
      isRecurring: session.isRecurring || false,
      recurrenceFrequency: recRule.frequency || 'Weekly',
      recurrenceDays: recRule.days || [1],
      recurrenceEndDate: recRule.endDate || '',
      sendNotification: true,
      customNotificationMessage: '',
      alsoNotifyParents: true,
      resourcesList: resList
    })
    setError('')
    setShowModal(true)
  }

  const openCreate = () => {
    setEditingSession(null)
    setFormData({
      title: '',
      syllabusCodes: '',
      description: '',
      scheduledDate: '',
      durationOption: '60',
      customDuration: 60,
      classType: 'PHYSICAL',
      meetingLink: '',
      recordingAvailable: true,
      isRecurring: false,
      recurrenceFrequency: 'Weekly',
      recurrenceDays: [1],
      recurrenceEndDate: '',
      sendNotification: true,
      customNotificationMessage: '',
      alsoNotifyParents: true,
      resourcesList: []
    })
    setNewResTitle('')
    setNewResUrl('')
    setError('')
    setShowModal(true)
  }

  const handleAddResource = () => {
    if (!newResTitle || !newResUrl) return
    setFormData(prev => ({
      ...prev,
      resourcesList: [...prev.resourcesList, { title: newResTitle, url: newResUrl }]
    }))
    setNewResTitle('')
    setNewResUrl('')
  }

  const handleRemoveResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      resourcesList: prev.resourcesList.filter((_, i) => i !== index)
    }))
  }

  const toggleDay = (dayNum: number) => {
    setFormData(prev => {
      const exists = prev.recurrenceDays.includes(dayNum)
      if (exists) {
        return { ...prev, recurrenceDays: prev.recurrenceDays.filter(d => d !== dayNum) }
      } else {
        return { ...prev, recurrenceDays: [...prev.recurrenceDays, dayNum].sort() }
      }
    })
  }

  const getRecurrencePreview = () => {
    if (!formData.isRecurring || !formData.scheduledDate || !formData.recurrenceEndDate) return null
    try {
      const start = new Date(formData.scheduledDate)
      const end = new Date(formData.recurrenceEndDate)
      if (end < start) return 'End date must be after scheduled date.'

      const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const selDaysStr = formData.recurrenceDays.map(d => daysMap[d]).join(', ') || 'selected days'
      
      let approxCount = 0
      let curr = new Date(start)
      while (curr <= end && approxCount < 52) {
        if (formData.recurrenceDays.includes(curr.getDay())) approxCount++
        curr.setDate(curr.getDate() + (formData.recurrenceFrequency === 'Weekly' ? 1 : formData.recurrenceFrequency === 'Fortnightly' ? 14 : 30))
      }
      const endFormatted = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      return `This will create ${Math.max(1, approxCount)} class sessions every ${selDaysStr} until ${endFormatted}`
    } catch (e) {
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const durationMins = formData.durationOption === 'CUSTOM' ? formData.customDuration : parseInt(formData.durationOption)

    const payload = {
      title: formData.title,
      syllabusCodes: formData.syllabusCodes,
      description: formData.description,
      scheduledDate: formData.scheduledDate,
      durationMins,
      classType: formData.classType,
      meetingLink: formData.meetingLink,
      recordingAvailable: formData.recordingAvailable,
      isRecurring: formData.isRecurring,
      recurrenceRule: formData.isRecurring ? {
        frequency: formData.recurrenceFrequency,
        days: formData.recurrenceDays,
        endDate: formData.recurrenceEndDate
      } : null,
      sendNotification: formData.sendNotification,
      customNotificationMessage: formData.customNotificationMessage,
      alsoNotifyParents: formData.alsoNotifyParents,
      resourcesList: formData.resourcesList
    }

    try {
      const url = editingSession ? `/api/sessions/${editingSession.id}` : `/api/subjects/${id}/sessions`
      const method = editingSession ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        setShowModal(false)
        setEditingSession(null)
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
      {/* Header */}
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
            padding: '0.75rem 1.8rem',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          onClick={openCreate}
        >
          + Schedule class
        </button>
      </div>

      {/* Class Sessions List */}
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
            {sessions.map(s => {
              const linkedQuiz = s.quizzes?.[0]
              return (
                <tr key={s.id} style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <td style={{ padding: '1.25rem', fontWeight: 800, color: '#1a1a2e', fontSize: '0.95rem', verticalAlign: 'top', width: '220px' }}>
                    {new Date(s.scheduledDate).toLocaleString('en-GB', { 
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                    })}
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0284c7', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.1rem 0.5rem', fontWeight: 800 }}>
                        ⏱️ {s.durationMins} mins
                      </span>
                      {s.classType && (
                        <span style={{
                          fontSize: '0.75rem',
                          background: s.classType === 'ONLINE' ? '#f3e8ff' : s.classType === 'HYBRID' ? '#fef3c7' : '#dcfce7',
                          color: s.classType === 'ONLINE' ? '#7e22ce' : s.classType === 'HYBRID' ? '#b45309' : '#15803d',
                          border: '1.5px solid #1a1a2e',
                          borderRadius: '50px',
                          padding: '0.1rem 0.5rem',
                          fontWeight: 800
                        }}>
                          {s.classType === 'ONLINE' ? '💻 Online' : s.classType === 'HYBRID' ? '🔀 Hybrid' : '🏫 Physical'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '0.35rem', color: '#1a1a2e' }}>{s.title}</div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, marginBottom: '0.75rem' }}>{s.description}</div>
                    
                    {s.syllabusObjectives?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        {s.syllabusObjectives.map((o: any) => (
                          <span key={o.id} title={o.description} style={{ fontSize: '0.75rem', background: '#f3e8ff', color: '#7e22ce', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.65rem', fontWeight: 800, boxShadow: '2px 2px 0px #1a1a2e' }}>
                            🎯 {o.code}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Lesson Planner Linked Quiz Pill */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      {linkedQuiz ? (
                        <Link
                          href={`/dashboard/teacher/subjects/${id}/quizzes`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: '#00c853',
                            color: '#ffffff',
                            border: '2px solid #1a1a2e',
                            borderRadius: '50px',
                            boxShadow: '2px 2px 0px #1a1a2e',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          ✓ Quiz linked: {linkedQuiz.title}
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/teacher/subjects/${id}/quizzes/builder?linkedSessionId=${s.id}&topic=${encodeURIComponent(s.title)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: '#ffffff',
                            color: '#2979ff',
                            border: '2px dashed #2979ff',
                            borderRadius: '50px',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          + Create quiz for this lesson
                        </Link>
                      )}
                    </div>

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
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Redesigned Schedule New Class Modal */}
      {showModal && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem'
        }}>
          <div style={{
            maxWidth: '720px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '2rem',
            background: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '20px',
            boxShadow: '8px 8px 0px #1a1a2e',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', top: '1.5rem', right: '1.5rem',
                background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50%',
                width: '36px', height: '36px', fontWeight: 900, fontSize: '1.2rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '2px 2px 0px #1a1a2e'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem', color: '#1a1a2e' }}>
              {editingSession ? 'Edit class session' : 'Schedule new class'}
            </h3>
            
            {error && (
              <div style={{ padding: '1rem', background: '#ffebee', color: '#d32f2f', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 800, border: '2px solid #1a1a2e' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* SECTION 1: CLASS DETAILS */}
              <div>
                <div style={{ borderLeft: '4px solid #2979ff', paddingLeft: '8px', fontSize: '0.85rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                  Section 1 — Class details
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                      Class title / topic <span style={{ color: '#f50057' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Intro to Genetics"
                      style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                      Syllabus objectives / codes
                    </label>
                    <input
                      type="text"
                      value={formData.syllabusCodes}
                      onChange={e => setFormData({ ...formData, syllabusCodes: e.target.value })}
                      placeholder="e.g. BIO-1.1, BIO-1.2 separated by commas"
                      style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 600 }}>
                      These will be cross-checked with the subject syllabus.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                      Description / what will be covered
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Outline subtopics, key concepts or required preparation..."
                      rows={3}
                      style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '2px dashed #cbd5e1', margin: 0 }} />

              {/* SECTION 2: SCHEDULE */}
              <div>
                <div style={{ borderLeft: '4px solid #00c853', paddingLeft: '8px', fontSize: '0.85rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                  Section 2 — Schedule
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                        Date & time <span style={{ color: '#f50057' }}>*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.scheduledDate}
                        onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                        Duration
                      </label>
                      <select
                        value={formData.durationOption}
                        onChange={e => setFormData({ ...formData, durationOption: e.target.value })}
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
                      >
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour (Default)</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="150">2.5 hours</option>
                        <option value="180">3 hours</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>
                  </div>

                  {formData.durationOption === 'CUSTOM' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                        Custom duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="600"
                        value={formData.customDuration}
                        onChange={e => setFormData({ ...formData, customDuration: parseInt(e.target.value) || 60 })}
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>
                  )}

                  {/* Class Type Pills */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                      Class type
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { type: 'PHYSICAL', label: '🏫 Physical', desc: 'In person at branch' },
                        { type: 'ONLINE', label: '💻 Online', desc: 'Zoom / Meet link' },
                        { type: 'HYBRID', label: '🔀 Hybrid', desc: 'Physical & Online' }
                      ].map(t => {
                        const active = formData.classType === t.type
                        return (
                          <button
                            key={t.type}
                            type="button"
                            onClick={() => setFormData({ ...formData, classType: t.type })}
                            style={{
                              flex: 1,
                              padding: '0.65rem 0.5rem',
                              background: active ? '#2979ff' : '#ffffff',
                              color: active ? '#ffffff' : '#1a1a2e',
                              border: '2px solid #1a1a2e',
                              borderRadius: '50px',
                              boxShadow: active ? '3px 3px 0px #1a1a2e' : 'none',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {(formData.classType === 'ONLINE' || formData.classType === 'HYBRID') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                          Meeting link (Zoom / Google Meet URL)
                        </label>
                        <input
                          type="url"
                          placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                          value={formData.meetingLink}
                          onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                          style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>Recording will be available</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Allows uploading recording for students after class</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.recordingAvailable}
                          onChange={e => setFormData({ ...formData, recordingAvailable: e.target.checked })}
                          style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#00c853' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '2px dashed #cbd5e1', margin: 0 }} />

              {/* SECTION 3: RECURRENCE */}
              <div>
                <div style={{ borderLeft: '4px solid #aa00ff', paddingLeft: '8px', fontSize: '0.85rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                  Section 3 — Recurrence
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>Repeat this class</div>
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#aa00ff' }}
                  />
                </div>

                {formData.isRecurring && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#faf5ff', padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e' }}>
                        Repeat frequency
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['Weekly', 'Fortnightly', 'Monthly'].map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFormData({ ...formData, recurrenceFrequency: f })}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              background: formData.recurrenceFrequency === f ? '#aa00ff' : '#ffffff',
                              color: formData.recurrenceFrequency === f ? '#ffffff' : '#1a1a2e',
                              border: '2px solid #1a1a2e',
                              borderRadius: '50px',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e' }}>
                        Repeat on days
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {[
                          { num: 1, label: 'Mon' },
                          { num: 2, label: 'Tue' },
                          { num: 3, label: 'Wed' },
                          { num: 4, label: 'Thu' },
                          { num: 5, label: 'Fri' },
                          { num: 6, label: 'Sat' },
                          { num: 0, label: 'Sun' }
                        ].map(d => {
                          const isSel = formData.recurrenceDays.includes(d.num)
                          return (
                            <button
                              key={d.num}
                              type="button"
                              onClick={() => toggleDay(d.num)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                background: isSel ? '#1a1a2e' : '#ffffff',
                                color: isSel ? '#ffffff' : '#1a1a2e',
                                border: '2px solid #1a1a2e',
                                borderRadius: '50px',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {d.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e' }}>
                        End date
                      </label>
                      <input
                        type="date"
                        value={formData.recurrenceEndDate}
                        onChange={e => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '10px', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>

                    {getRecurrencePreview() && (
                      <div style={{ fontSize: '0.8rem', color: '#6b21a8', fontWeight: 800, background: '#ffffff', padding: '0.65rem 1rem', borderRadius: '8px', border: '1.5px solid #aa00ff' }}>
                        ℹ️ {getRecurrencePreview()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '2px dashed #cbd5e1', margin: 0 }} />

              {/* SECTION 4: NOTIFICATIONS */}
              <div>
                <div style={{ borderLeft: '4px solid #ff6d00', paddingLeft: '8px', fontSize: '0.85rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                  Section 4 — Notifications
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>Send notification to students</div>
                    <input
                      type="checkbox"
                      checked={formData.sendNotification}
                      onChange={e => setFormData({ ...formData, sendNotification: e.target.checked })}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#ff6d00' }}
                    />
                  </div>

                  {formData.sendNotification && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#fff7ed', padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e' }}>
                          Notification message (pre-filled, editable)
                        </label>
                        <textarea
                          rows={2}
                          value={formData.customNotificationMessage}
                          onChange={e => setFormData({ ...formData, customNotificationMessage: e.target.value })}
                          style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '10px', color: '#1a1a2e', fontWeight: 700 }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e' }}>Also notify parents</div>
                        <input
                          type="checkbox"
                          checked={formData.alsoNotifyParents}
                          onChange={e => setFormData({ ...formData, alsoNotifyParents: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ff6d00' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '2px dashed #cbd5e1', margin: 0 }} />

              {/* SECTION 5: RESOURCES */}
              <div>
                <div style={{ borderLeft: '4px solid #f50057', paddingLeft: '8px', fontSize: '0.85rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                  Section 5 — Resources
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>
                  Attach pre-class resources — students receive these before class to prepare.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {formData.resourcesList.map((res, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.65rem 1rem', border: '2px solid #1a1a2e', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>📎 {res.title}</div>
                        <a href={res.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2979ff', textDecoration: 'none', fontWeight: 600 }}>{res.url}</a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(i)}
                        style={{ background: '#ffebee', color: '#d32f2f', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.6rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                    <div>
                      <input
                        type="text"
                        placeholder="Resource title (e.g. Pre-read PDF)"
                        value={newResTitle}
                        onChange={e => setNewResTitle(e.target.value)}
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '8px 12px', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <input
                        type="url"
                        placeholder="Resource URL (https://...)"
                        value={newResUrl}
                        onChange={e => setNewResUrl(e.target.value)}
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '8px 12px', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddResource}
                      style={{
                        background: '#ffffff',
                        color: '#1a1a2e',
                        border: '2px solid #1a1a2e',
                        borderRadius: '10px',
                        boxShadow: '2px 2px 0px #1a1a2e',
                        padding: '8px 14px',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      + Add resource
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#00c853',
                    color: '#ffffff',
                    border: '3px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    padding: '0.85rem 1.5rem',
                    fontWeight: 900,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Saving...' : 'Save class session'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    background: '#ffffff',
                    color: '#1a1a2e',
                    border: '3px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    padding: '0.85rem 1.5rem',
                    fontWeight: 900,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
