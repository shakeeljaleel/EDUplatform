'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/components/ToastContainer'

interface PendingEnrolmentsSectionProps {
  hideIfEmpty?: boolean
}

export default function PendingEnrolmentsSection({ hideIfEmpty = false }: PendingEnrolmentsSectionProps) {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
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

  // Toggle single row checkbox
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all or deselect all
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(enrollments.map(item => item.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Optimistic UI individual approval: remove row immediately, show toast "Approved", no page reload
  const handleApprove = async (id: string) => {
    const itemToApprove = enrollments.find(e => e.id === id)
    if (!itemToApprove) return

    // 1. Optimistic removal from state
    setEnrollments(prev => prev.filter(e => e.id !== id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

    // 2. Immediate toast notification
    showToast('Approved', 'success')

    // 3. API request in background
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'ADMIN_APPROVE' })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        // Rollback state on error
        setEnrollments(prev => [itemToApprove, ...prev])
        showToast(errData.error || 'Failed to approve enrolment', 'error')
      }
    } catch {
      // Rollback on network failure
      setEnrollments(prev => [itemToApprove, ...prev])
      showToast('Network error while approving enrolment', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // Bulk Approve Selected: single API endpoint in one database transaction
  const handleBulkApprove = async () => {
    const idsToApprove = Array.from(selectedIds)
    if (idsToApprove.length === 0) return

    const previousEnrollments = [...enrollments]

    // 1. Optimistically remove all selected items from state (refresh only the list, no full page reload)
    setEnrollments(prev => prev.filter(item => !selectedIds.has(item.id)))
    setSelectedIds(new Set())
    setBulkLoading(true)

    // 2. Immediate toast notification
    showToast('Approved', 'success')

    // 3. Call single bulk approve API endpoint
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_APPROVE',
          selectedIds: idsToApprove
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Rollback on failure
        setEnrollments(previousEnrollments)
        setSelectedIds(new Set(idsToApprove))
        showToast(err.error || 'Failed to bulk approve enrolments', 'error')
      }
    } catch {
      // Rollback on network failure
      setEnrollments(previousEnrollments)
      setSelectedIds(new Set(idsToApprove))
      showToast('Network error while bulk approving enrolments', 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleConfirmReject = async (id: string) => {
    const reason = rejectState[id]?.reason || ''
    const itemToReject = enrollments.find(e => e.id === id)

    // Optimistic removal
    setEnrollments(prev => prev.filter(e => e.id !== id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setRejectState(prev => ({ ...prev, [id]: { open: false, reason: '', loading: false } }))
    showToast('Enrolment request rejected.', 'success')

    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'REJECT', rejectionReason: reason })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (itemToReject) {
          setEnrollments(prev => [itemToReject, ...prev])
        }
        showToast(data.error || 'Failed to reject enrolment', 'error')
      }
    } catch {
      if (itemToReject) {
        setEnrollments(prev => [itemToReject, ...prev])
      }
      showToast('Network error rejecting enrolment', 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ marginBottom: '2.5rem', padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
        Loading pending enrolments...
      </div>
    )
  }

  if (enrollments.length === 0) {
    if (hideIfEmpty) return null

    return (
      <div style={{
        marginBottom: '2.5rem',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '16px',
        border: '3px solid #1a1a2e',
        boxShadow: '4px 4px 0px #1a1a2e'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
          No Pending Enrolment Requests
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.35rem' }}>
          All student enrolment requests have been reviewed and approved.
        </p>
      </div>
    )
  }

  const allSelected = enrollments.length > 0 && selectedIds.size === enrollments.length

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Header with Title, Count, Select All, and Bulk Approve Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Select All Checkbox in Header */}
          <label
            htmlFor="select-all-enrolments"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#0f172a',
              cursor: 'pointer',
              userSelect: 'none',
              background: '#ffffff',
              padding: '0.45rem 0.85rem',
              borderRadius: '50px',
              border: '2px solid #1a1a2e',
              boxShadow: '2px 2px 0px #1a1a2e',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              id="select-all-enrolments"
              checked={allSelected}
              onChange={handleSelectAll}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#00c853'
              }}
            />
            <span>Select All</span>
          </label>

          {/* Bulk Approve Selected Button (appears when at least 1 checkbox is ticked) */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              id="bulk-approve-selected-btn"
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              style={{
                background: '#00c853',
                color: '#ffffff',
                border: '2px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: '3px 3px 0px #1a1a2e',
                padding: '0.45rem 1.15rem',
                fontSize: '0.85rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'transform 0.1s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)' }}
            >
              {bulkLoading ? 'Approving...' : `Bulk Approve Selected (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Rows of Pending Enrolments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
        {enrollments.map(e => {
          const isApproving = actionLoading[e.id]
          const isSelected = selectedIds.has(e.id)
          const rej = rejectState[e.id] || { open: false, reason: '', loading: false }
          const subName = e.subject?.name ? e.subject.name.charAt(0).toUpperCase() + e.subject.name.slice(1) : 'Subject'

          return (
            <div
              key={e.id}
              className="card enrolment-request-row"
              style={{
                background: isSelected ? '#f0fdf4' : '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: isSelected ? '5px 5px 0px #00c853' : '5px 5px 0px #1a1a2e',
                padding: '1.25rem',
                borderLeft: isSelected ? '8px solid #00c853' : '8px solid #ffab00',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Checkbox to the left of each pending enrolment request row */}
              <div style={{ paddingTop: '0.2rem' }}>
                <input
                  type="checkbox"
                  id={`checkbox-${e.id}`}
                  aria-label={`Select enrolment for ${e.student?.name || 'Student'}`}
                  checked={isSelected}
                  onChange={() => toggleSelect(e.id)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: '#00c853'
                  }}
                />
              </div>

              {/* Row Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0, wordBreak: 'break-word' }}>
                      {e.student?.name || 'Student'}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, wordBreak: 'break-all' }}>
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
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
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
                      id={`approve-btn-${e.id}`}
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
                      id={`reject-btn-${e.id}`}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
