'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function BatchStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [students, setStudents] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [batchName, setBatchName] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestStatus, setRequestStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [studentRes, batchRes] = await Promise.all([
        fetch(`/api/batches/${id}/students`),
        fetch(`/api/batches`)
      ])
      if (studentRes.ok) {
        const data = await studentRes.json()
        setStudents(data.students)
        if (data.students.length > 0) setBatchName(data.students[0].batch.name)
      }
      if (batchRes.ok) {
        setBatches((await batchRes.json()).batches || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = async (studentId: string, type: 'REMOVE' | 'SWITCH', newBatchId?: string) => {
    const res = await fetch('/api/teacher/student-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, studentId, batchId: id, newBatchId })
    })
    if (res.ok) {
      setRequestStatus(prev => ({ ...prev, [studentId + type]: 'PENDING_APPROVAL' }))
      alert(`Request submitted for Super Admin approval.`)
    }
  }

  if (loading) return <div className="pulse">Loading student list...</div>

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href={`/dashboard/teacher/batches/${id}`} style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}>← Back to Batch</Link>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>Student List: {batchName}</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Manage your batch students. Actions require Admin approval.</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem' }}>Student Name</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem' }}>Stats</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((enrollment, idx) => (
              <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--bg-tertiary)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.3)' }}>
                <td style={{ padding: '1rem', fontWeight: 700 }}>{enrollment.user.name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{enrollment.user.email}</td>
                <td style={{ padding: '1rem' }}>
                  ⭐ {enrollment.user.profile?.stars || 0} | 🏅 {enrollment.user.profile?.medals || 0}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {requestStatus[enrollment.userId + 'REMOVE'] ? (
                      <span className="badge badge-pending">Removing...</span>
                    ) : (
                      <button 
                        onClick={() => handleRequest(enrollment.userId, 'REMOVE')}
                        className="btn-secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}
                      >
                        Remove
                      </button>
                    )}

                    <div style={{ position: 'relative' }}>
                      <select 
                        onChange={(e) => {
                          if (e.target.value) handleRequest(enrollment.userId, 'SWITCH', e.target.value)
                        }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}
                        value=""
                      >
                        <option value="" disabled>Switch Batch...</option>
                        {batches.filter(b => b.id !== id).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
