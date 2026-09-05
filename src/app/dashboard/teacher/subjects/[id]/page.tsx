'use client'

import { useState, useEffect, use } from 'react'

export default function SubjectEnrollmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchEnrollments() }, [])

  const fetchEnrollments = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/enrollments`)
      if (res.ok) setEnrollments((await res.json()).enrollments)
    } finally { setLoading(false) }
  }

  const handleDecision = async (enrollmentId: string, status: 'APPROVED' | 'REJECTED') => {
    const res = await fetch(`/api/subjects/${id}/enrollments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId, status }),
    })
    if (res.ok) fetchEnrollments()
  }

  const pending = enrollments.filter(e => e.status === 'PENDING')
  const approved = enrollments.filter(e => e.status === 'APPROVED')
  const rejected = enrollments.filter(e => e.status === 'REJECTED')

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ maxWidth: '700px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Student Enrollment Requests</h2>

      {pending.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--warning)' }}>⏳ Pending ({pending.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map(e => (
              <div key={e.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.user.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{e.user.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => handleDecision(e.id, 'APPROVED')}>✓ Approve</button>
                  <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => handleDecision(e.id, 'REJECTED')}>✕ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>✓ Approved ({approved.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {approved.map(e => (
              <div key={e.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{e.user.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{e.user.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--error)' }}>✕ Rejected ({rejected.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rejected.map(e => (
              <div key={e.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{e.user.name}</span>
                <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDecision(e.id, 'APPROVED')}>Re-approve</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>No enrollment requests yet.</p>
      )}
    </div>
  )
}
