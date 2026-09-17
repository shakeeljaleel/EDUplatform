'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/components/ToastContainer'

export default function PendingEnrolmentsSection() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [rejectState, setRejectState] = useState<Record<string, { open: boolean; reason: string; loading: boolean }>>({})

  useEffect(() => {
    fetchPendingEnrollments()
  }, [])

  const fetchPendingEnrollments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/student-enrollments?status=pending')
      if (res.ok) {
        const data = await res.json()
        setEnrollments(data.enrollments || [])
      }
    } catch {
      showToast('Failed to load pending enrolments', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'ADMIN_APPROVE' })
      })

      if (res.ok) {
        const data = await res.json()
        const studentName = data.studentName || 'Student'
        const subjectName = data.subjectName || 'Subject'
        const branchName = data.branchName || 'Branch'
        const teacherName = data.teacherName || 'Assigned Teacher'

        showToast(`Enrolment approved for ${studentName} — ${subjectName} at ${branchName}. Teacher ${teacherName} has been notified.`, 'success')
        fetchPendingEnrollments()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to approve enrolment', 'error')
      }
    } catch {
      showToast('Network error while approving enrolment', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleConfirmReject = async (id: string) => {
    const reason = rejectState[id]?.reason || ''
    setRejectState(prev => ({ ...prev, [id]: { ...prev[id], loading: true } }))

    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'REJECT', rejectionReason: reason })
      })

      if (res.ok) {
        showToast('Enrolment request rejected.', 'success')
        setRejectState(prev => ({ ...prev, [id]: { open: false, reason: '', loading: false } }))
        fetchPendingEnrollments()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to reject enrolment', 'error')
      }
    } catch {
      showToast('Network error rejecting enrolment', 'error')
    } finally {
      setRejectState(prev => ({ ...prev, [id]: { ...prev[id], loading: false } }))
    }
  }

  if (loading) return null
  if (enrollments.length === 0) return null

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          Pending Enrolment Requests
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 900,
            background: '#f50057',
            color: '#ffffff',
            padding: '0.2rem 0.65rem',
            borderRadius: '50px',
            border: '2px solid #1a1a2e',
            boxShadow: '2px 2px 0px #1a1a2e'
          }}>
            {enrollments.length}
          </span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {enrollments.map(e => {
          const isApproving = actionLoading[e.id]
          const rej = rejectState[e.id] || { open: false, reason: '', loading: false }
          const subName = e.subject?.name ? e.subject.name.charAt(0).toUpperCase() + e.subject.name.slice(1) : 'Subject'

          return (
            <div
              key={e.id}
              className="card"
              style={{
                background: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e',
                padding: '1.25rem',
                borderLeft: '8px solid #ffab00'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {e.student?.name || 'Student'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {e.student?.email}
                  </div>
                </div>

                <span style={{
                  background: '#ffab00',
                  color: '#ffffff',
                  border: '2px solid #1a1a2e',
                  boxShadow: '2px 2px 0px #1a1a2e',
                  borderRadius: '50px',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.725rem',
                  fontWeight: 900
                }}>
                  Awaiting approval
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '1rem' }}>
                <div>📚 Subject: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{subName}</strong></div>
                <div>🎓 Batch: <span style={{ color: '#0f172a' }}>{e.batch?.name}</span></div>
                <div>📍 Branch: <span style={{ color: '#0f172a' }}>{e.branch?.name}</span></div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Requested on {new Date(e.requestedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {!rej.open ? (
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => handleApprove(e.id)}
                    disabled={isApproving}
                    style={{
                      flex: 1,
                      background: '#00c853',
                      color: '#ffffff',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      boxShadow: '3px 3px 0px #1a1a2e',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectState(prev => ({ ...prev, [e.id]: { open: true, reason: '', loading: false } }))}
                    style={{
                      flex: 1,
                      background: '#f50057',
                      color: '#ffffff',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      boxShadow: '3px 3px 0px #1a1a2e',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Reason for rejection (optional)"
                    value={rej.reason}
                    onChange={ev => {
                      const val = ev.target.value
                      setRejectState(prev => ({ ...prev, [e.id]: { ...prev[e.id], reason: val } }))
                    }}
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.825rem',
                      border: '2px solid #1a1a2e',
                      borderRadius: '8px',
                      width: '100%',
                      background: '#ffffff',
                      fontWeight: 600
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleConfirmReject(e.id)}
                      disabled={rej.loading}
                      style={{
                        flex: 1,
                        background: '#f50057',
                        color: '#ffffff',
                        border: '2px solid #1a1a2e',
                        borderRadius: '50px',
                        boxShadow: '2px 2px 0px #1a1a2e',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        cursor: 'pointer'
                      }}
                    >
                      {rej.loading ? 'Rejecting...' : 'Confirm rejection'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectState(prev => ({ ...prev, [e.id]: { open: false, reason: '', loading: false } }))}
                      style={{
                        background: '#ffffff',
                        color: '#1a1a2e',
                        border: '2px solid #1a1a2e',
                        borderRadius: '50px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
