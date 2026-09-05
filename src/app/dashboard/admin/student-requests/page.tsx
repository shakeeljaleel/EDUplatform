'use client'

import { useState, useEffect } from 'react'

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/student-requests')
      if (res.ok) setRequests((await res.json()).requests)
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    const res = await fetch('/api/admin/student-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status })
    })
    if (res.ok) fetchRequests()
  }

  if (loading) return <div className="pulse">Loading pending requests...</div>

  return (
    <div className="content-wrapper">
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Student Change Requests</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Review requests from teachers to remove or switch students.</p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {requests.map(req => (
          <div key={req.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className={`badge ${req.type === 'REMOVE' ? 'badge-pending' : 'badge-paid'}`} style={{ fontSize: '0.7rem' }}>
                  {req.type}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{req.student.name}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Requested by: <strong>{req.teacher.name}</strong> on {new Date(req.createdAt).toLocaleDateString()}
              </div>
              {req.type === 'SWITCH' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
                  Target Batch ID: {req.newBatchId}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={() => handleDecision(req.id, 'APPROVED')}>Approve</button>
              <button className="btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleDecision(req.id, 'REJECTED')}>Reject</button>
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No pending requests found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
