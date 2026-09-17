'use client'

import { useState, useEffect } from 'react'
import { Bell } from './Icons'
import { showToast } from './ToastContainer'

function getLeftBorderColor(type: string = '', title: string = '', message: string = ''): string {
  const norm = (type + ' ' + title + ' ' + message).toLowerCase()
  if (norm.includes('enroll') || norm.includes('enrol')) return '#00c853' // green
  if (norm.includes('assign')) return '#2979ff' // blue
  if (norm.includes('pending') || norm.includes('reminder')) return '#ffab00' // amber
  if (norm.includes('warn') || norm.includes('alert') || norm.includes('reject')) return '#f50057' // red
  return '#00c853'
}

function formatNotificationMessage(msg?: string): string {
  if (!msg) return ''
  // Capitalize subject names like 'in biology' -> 'in Biology'
  return msg.replace(/\bin ([a-z])/g, (_, letter) => `in ${letter.toUpperCase()}`)
}

interface NotificationBellProps {
  userRole?: string
}

export default function NotificationBell({ userRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Track action outcome per notification card (APPROVED | REJECTED)
  const [actionStatus, setActionStatus] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({})
  const [rejectState, setRejectState] = useState<Record<string, { open: boolean; reason: string; loading: boolean }>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

  useEffect(() => {
    fetchNotifications()
    if (isAdmin) fetchPendingEnrollments()
    const interval = setInterval(() => {
      fetchNotifications()
      if (isAdmin) fetchPendingEnrollments()
    }, 30000)
    return () => clearInterval(interval)
  }, [userRole])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount((data.notifications || []).filter((n: any) => !n.read).length)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchPendingEnrollments = async () => {
    try {
      const res = await fetch('/api/student-enrollments?status=pending')
      if (res.ok) {
        const data = await res.json()
        setPendingEnrollments(data.enrollments || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const findEnrollmentIdForNotification = (n: any): string | null => {
    if (n.link && n.link.includes('enrollmentId=')) {
      try {
        const urlObj = new URL(n.link, 'http://localhost')
        const idParam = urlObj.searchParams.get('enrollmentId')
        if (idParam) return idParam
      } catch {}
    }

    if (pendingEnrollments.length > 0 && n.message) {
      const msgLower = n.message.toLowerCase()
      const match = pendingEnrollments.find(e => {
        const studentMatch = e.student?.name && msgLower.includes(e.student.name.toLowerCase())
        const subjectMatch = e.subject?.name && msgLower.includes(e.subject.name.toLowerCase())
        return studentMatch || subjectMatch
      })
      if (match) return match.id
    }

    if (pendingEnrollments.length > 0) return pendingEnrollments[0].id

    return null
  }

  const handleApprove = async (n: any) => {
    const enrollmentId = findEnrollmentIdForNotification(n)
    if (!enrollmentId) return

    setActionLoading(prev => ({ ...prev, [n.id]: true }))
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: enrollmentId, action: 'ADMIN_APPROVE' })
      })

      if (res.ok) {
        const data = await res.json()
        setActionStatus(prev => ({ ...prev, [n.id]: 'APPROVED' }))
        
        const studentName = data.studentName || 'Student'
        const subjectName = data.subjectName || 'Subject'
        const branchName = data.branchName || 'Branch'
        const teacherName = data.teacherName || 'Assigned Teacher'

        showToast(`Enrolment approved for ${studentName} — ${subjectName} at ${branchName}. Teacher ${teacherName} has been notified.`, 'success')

        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: n.id })
        })
        fetchNotifications()
        fetchPendingEnrollments()
      } else {
        const errData = await res.json()
        showToast(errData.error || 'Failed to approve enrolment', 'error')
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [n.id]: false }))
    }
  }

  const handleConfirmReject = async (n: any) => {
    const enrollmentId = findEnrollmentIdForNotification(n)
    if (!enrollmentId) return

    const reason = rejectState[n.id]?.reason || ''
    setRejectState(prev => ({ ...prev, [n.id]: { ...prev[n.id], loading: true } }))

    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: enrollmentId, action: 'REJECT', rejectionReason: reason })
      })

      if (res.ok) {
        setActionStatus(prev => ({ ...prev, [n.id]: 'REJECTED' }))
        showToast('Enrolment request rejected', 'success')
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: n.id })
        })
        setRejectState(prev => ({ ...prev, [n.id]: { open: false, reason: '', loading: false } }))
        fetchNotifications()
        fetchPendingEnrollments()
      } else {
        const errData = await res.json()
        showToast(errData.error || 'Failed to reject enrolment', 'error')
      }
    } finally {
      setRejectState(prev => ({ ...prev, [n.id]: { ...prev[n.id], loading: false } }))
    }
  }

  const markRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const handleClearAll = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' })
      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleDropdown = () => {
    setShow(!show)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={toggleDropdown}
        className="notification-bell-btn" 
        aria-label="Notifications"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: '#ffffff',
          color: '#1a1a2e',
          border: '2px solid #1a1a2e',
          boxShadow: '3px 3px 0px #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <Bell size={20} color="#1a1a2e" />
        {unreadCount > 0 && (
          <span className="pulse-red-badge" style={{ 
            position: 'absolute', top: '-4px', right: '-4px', 
            background: '#f50057', color: 'white', 
            fontSize: '0.65rem', fontWeight: 900, 
            width: '20px', height: '20px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #ffffff',
            boxShadow: '0 0 6px rgba(245, 0, 87, 0.8)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {show && (
        <>
          <div style={{ 
            position: 'absolute', top: '56px', right: 0, 
            width: '380px', background: '#ffffff', 
            boxShadow: '8px 8px 0px #1a1a2e', borderRadius: '16px', 
            border: '3px solid #1a1a2e', zIndex: 1000,
            padding: '1.25rem', maxHeight: '520px', overflowY: 'auto'
          }}>
            {/* Header: Fix 2 (Roadmap alerts) and Fix 3 (Mark all as read button styling) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>Roadmap alerts</h4>
                {unreadCount > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#f50057', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '50px', border: '1.5px solid #1a1a2e' }}>
                    {unreadCount} New
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={markRead}
                style={{
                  background: '#ffffff',
                  border: '2px solid #1a1a2e',
                  borderRadius: '50px',
                  boxShadow: '3px 3px 0px #1a1a2e',
                  color: '#1a1a2e',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.85rem',
                  cursor: 'pointer'
                }}
              >
                Mark all as read
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map(n => {
                const borderColor = getLeftBorderColor(n.type, n.title, n.message)
                const isEnrollmentReq = (n.type === 'STUDENT_ENROLLMENT_REQUESTED' || (n.title && n.title.toLowerCase().includes('enrolment request')) || (n.title && n.title.toLowerCase().includes('enrollment request')))
                const status = actionStatus[n.id]
                const rej = rejectState[n.id] || { open: false, reason: '', loading: false }
                const isApproving = actionLoading[n.id]
                const isActionDone = Boolean(status)

                return (
                  <div key={n.id} style={{ 
                    padding: '0.85rem 1rem', borderRadius: '12px', 
                    backgroundColor: n.read || isActionDone ? '#f8fafc' : '#ffffff',
                    opacity: isActionDone ? 0.75 : 1,
                    border: '2px solid #1a1a2e',
                    borderLeft: `6px solid ${borderColor}`,
                    boxShadow: '3px 3px 0px #1a1a2e',
                    position: 'relative'
                  }}>
                    {!n.read && !isActionDone && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: '#2979ff', borderRadius: '50%' }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1a1a2e' }}>{n.title}</div>
                      
                      {status === 'APPROVED' && (
                        <span style={{ background: '#00c853', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.55rem', fontSize: '0.7rem', fontWeight: 900 }}>
                          Approved ✓
                        </span>
                      )}
                      {status === 'REJECTED' && (
                        <span style={{ background: '#f50057', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.55rem', fontSize: '0.7rem', fontWeight: 900 }}>
                          Rejected
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.4, fontWeight: 600, textTransform: 'capitalize' }}>
                      {formatNotificationMessage(n.message)}
                    </div>
                    
                    {/* Fix 1 — Inline Action Buttons for Admins on Enrolment Request Notifications */}
                    {isAdmin && isEnrollmentReq && !isActionDone && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed #cbd5e1' }}>
                        {!rej.open ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleApprove(n)}
                              disabled={isApproving}
                              style={{
                                background: '#00c853',
                                color: '#ffffff',
                                border: '2px solid #1a1a2e',
                                borderRadius: '50px',
                                boxShadow: '3px 3px 0px #1a1a2e',
                                padding: '0.3rem 0.85rem',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              {isApproving ? 'Approving...' : 'Approve'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setRejectState(prev => ({ ...prev, [n.id]: { open: true, reason: '', loading: false } }))}
                              style={{
                                background: '#f50057',
                                color: '#ffffff',
                                border: '2px solid #1a1a2e',
                                borderRadius: '50px',
                                boxShadow: '3px 3px 0px #1a1a2e',
                                padding: '0.3rem 0.85rem',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <input
                              type="text"
                              placeholder="Reason (optional)"
                              value={rej.reason}
                              onChange={e => {
                                const val = e.target.value
                                setRejectState(prev => ({ ...prev, [n.id]: { ...prev[n.id], reason: val } }))
                              }}
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                border: '2px solid #1a1a2e',
                                borderRadius: '8px',
                                width: '100%',
                                background: '#ffffff',
                                fontWeight: 600
                              }}
                            />
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => handleConfirmReject(n)}
                                disabled={rej.loading}
                                style={{
                                  background: '#f50057',
                                  color: '#ffffff',
                                  border: '2px solid #1a1a2e',
                                  borderRadius: '50px',
                                  boxShadow: '2px 2px 0px #1a1a2e',
                                  padding: '0.25rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 900,
                                  cursor: 'pointer'
                                }}
                              >
                                {rej.loading ? 'Confirming...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectState(prev => ({ ...prev, [n.id]: { open: false, reason: '', loading: false } }))}
                                style={{
                                  background: '#ffffff',
                                  color: '#1a1a2e',
                                  border: '2px solid #1a1a2e',
                                  borderRadius: '50px',
                                  padding: '0.25rem 0.65rem',
                                  fontSize: '0.75rem',
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
                    )}

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', fontWeight: 800 }}>
                      {new Date(n.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}

              {notifications.length === 0 && (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌿</div>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                    Clear horizon. No new alerts.
                  </p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: '#ffffff',
                    color: '#dc2626',
                    border: '2px solid #dc2626',
                    boxShadow: '3px 3px 0px #dc2626',
                    borderRadius: '50px',
                    padding: '0.4rem 1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div 
            onClick={() => setShow(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'transparent' }}
          />
        </>
      )}
    </div>
  )
}
