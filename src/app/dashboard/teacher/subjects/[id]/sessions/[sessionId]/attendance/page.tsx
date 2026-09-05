'use client'

import { useState, useEffect, use } from 'react'

export default function AttendancePage({ params }: { params: Promise<{ id: string, sessionId: string }> }) {
  const { id, sessionId } = use(params)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchAttendance()
  }, [])

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
      }
    } finally {
      setSaving(null)
    }
  }

  // Real PDF AI Upload
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
        alert('AI Attendance Complete: Attendance records updated from PDF.')
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

  if (loading) return <div>Loading attendance list...</div>

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Attendance Tracker</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Mark physical or online presence for this class.</p>
        </div>
        <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          📷 AI PDF Upload (WhatsApp)
          <input type="file" accept=".pdf" onChange={handleOcrUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{s.email}</td>
                <td>
                  <span className={`badge ${
                    s.attendanceStatus === 'PHYSICAL' ? 'badge-paid' : 
                    s.attendanceStatus === 'ONLINE' ? 'badge-pending' : 
                    s.attendanceStatus === 'ABSENT' ? 'badge-level' : 'badge-level'
                  }`} style={{ opacity: s.attendanceStatus === 'ABSENT_PENDING' ? 0.5 : 1 }}>
                    {s.attendanceStatus === 'ABSENT_PENDING' ? 'NOT MARKED' : s.attendanceStatus}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#059669' }} 
                      disabled={saving === s.id}
                      onClick={() => markAttendance(s.id, 'PHYSICAL')}
                    >
                      Physical
                    </button>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#2563eb' }} 
                      disabled={saving === s.id}
                      onClick={() => markAttendance(s.id, 'ONLINE')}
                    >
                      Online
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--error)' }} 
                      disabled={saving === s.id}
                      onClick={() => markAttendance(s.id, 'ABSENT')}
                    >
                      Absent
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No students enrolled in this subject.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
