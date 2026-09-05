'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowLeft, FileText } from 'lucide-react'
import { CardSkeleton } from '@/components/SkeletonLoader'
import EmptyState from '@/components/EmptyState'

export default function AttendancePage({ params }: { params: Promise<{ id: string, sessionId: string }> }) {
  const { id, sessionId } = use(params)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchAttendance()
  }, [])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students)
      }
    } finally {
      setLoading(false)
    }
  }

  const markAttendance = async (studentId: string, status: string) => {
    setSaving(studentId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId, status })
      })
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, attendanceStatus: status } : s))
        const student = students.find(s => s.id === studentId)
        triggerToast(`Marked ${student?.name || 'Student'} as ${status}`)
      }
    } finally {
      setSaving(null)
    }
  }

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sessionId', sessionId)

    try {
      const res = await fetch('/api/attendance/parse-pdf', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        triggerToast('AI Attendance Complete: Updated from PDF document.')
        fetchAttendance()
      } else {
        const error = await res.json()
        alert('Error parsing PDF: ' + error.error)
      }
    } catch (err) {
      alert('Failed to upload/parse PDF.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Attendance Tracker</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Loading enrolled students...</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  const physicalCount = students.filter(s => s.attendanceStatus === 'PHYSICAL').length
  const onlineCount = students.filter(s => s.attendanceStatus === 'ONLINE').length
  const absentCount = students.filter(s => s.attendanceStatus === 'ABSENT').length
  const unmarkedCount = students.filter(s => !s.attendanceStatus || s.attendanceStatus === 'ABSENT_PENDING').length

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'var(--primary)',
          color: '#ffffff',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem',
          fontWeight: 700,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle size={20} />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <Link href="/dashboard/teacher/attendance" className="btn-secondary" style={{ padding: '0.4rem 0.75rem', borderRadius: '10px' }}>
              <ArrowLeft size={16} />
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Class Roll Call & Attendance</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginLeft: '3rem' }}>
            Mark physical or online presence for enrolled students or upload a WhatsApp PDF roster.
          </p>
        </div>

        <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.65rem 1.1rem', borderRadius: '12px' }}>
          <FileText size={18} /> AI PDF Upload (WhatsApp)
          <input type="file" accept=".pdf" onChange={handleOcrUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Realtime Attendance Count Chips */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>PHYSICAL</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>{physicalCount}</div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>ONLINE</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563eb' }}>{onlineCount}</div>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--error)' }}>ABSENT</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--error)' }}>{absentCount}</div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning-amber)' }}>UNMARKED</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--warning-amber)' }}>{unmarkedCount}</div>
        </div>
      </div>

      {/* Student Attendance Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {students.map(s => {
          const isPhysical = s.attendanceStatus === 'PHYSICAL'
          const isOnline = s.attendanceStatus === 'ONLINE'
          const isAbsent = s.attendanceStatus === 'ABSENT'
          const isUnmarked = !s.attendanceStatus || s.attendanceStatus === 'ABSENT_PENDING'

          const initials = s.name ? s.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'ST'

          return (
            <div 
              key={s.id} 
              className="card"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: 'var(--bg-secondary)',
                border: isPhysical ? '2px solid rgba(16, 185, 129, 0.4)' :
                        isOnline ? '2px solid rgba(59, 130, 246, 0.4)' :
                        isAbsent ? '2px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isPhysical ? 'var(--primary)' : isOnline ? '#2563eb' : isAbsent ? 'var(--error)' : 'var(--accent-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  flexShrink: 0
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.email}
                  </div>
                </div>

                {/* Status Pill Badge */}
                <div style={{ flexShrink: 0 }}>
                  {isPhysical && (
                    <span style={{ padding: '0.3rem 0.65rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem' }}>
                      PHYSICAL
                    </span>
                  )}
                  {isOnline && (
                    <span style={{ padding: '0.3rem 0.65rem', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem' }}>
                      ONLINE
                    </span>
                  )}
                  {isAbsent && (
                    <span style={{ padding: '0.3rem 0.65rem', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', fontWeight: 800, fontSize: '0.75rem' }}>
                      ABSENT
                    </span>
                  )}
                  {isUnmarked && (
                    <span style={{ padding: '0.3rem 0.65rem', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning-amber)', fontWeight: 800, fontSize: '0.75rem' }}>
                      UNMARKED
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <button 
                  style={{
                    padding: '0.55rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: isPhysical ? 'var(--primary)' : 'rgba(16, 185, 129, 0.12)',
                    color: isPhysical ? '#ffffff' : 'var(--primary)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  disabled={saving === s.id}
                  onClick={() => markAttendance(s.id, 'PHYSICAL')}
                >
                  Physical
                </button>
                <button 
                  style={{
                    padding: '0.55rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: isOnline ? '#2563eb' : 'rgba(59, 130, 246, 0.12)',
                    color: isOnline ? '#ffffff' : '#2563eb',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  disabled={saving === s.id}
                  onClick={() => markAttendance(s.id, 'ONLINE')}
                >
                  Online
                </button>
                <button 
                  style={{
                    padding: '0.55rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: isAbsent ? 'var(--error)' : 'rgba(239, 68, 68, 0.12)',
                    color: isAbsent ? '#ffffff' : 'var(--error)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  disabled={saving === s.id}
                  onClick={() => markAttendance(s.id, 'ABSENT')}
                >
                  Absent
                </button>
              </div>
            </div>
          )
        })}

        {students.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No Enrolled Students"
              description="There are currently no students enrolled in this course batch."
              actionLabel="Back to Attendance Overview"
              actionHref="/dashboard/teacher/attendance"
            />
          </div>
        )}
      </div>
    </div>
  )
}

