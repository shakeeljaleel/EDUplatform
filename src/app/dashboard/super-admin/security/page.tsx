'use client'

import { useState, useEffect } from 'react'

interface Alert {
  id: string
  type: string
  message: string
  resolved: boolean
  createdAt: string
  user?: { name: string; email: string }
}

interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  accountDisabled: boolean
  recordingAccessRevoked: boolean
  hasActiveSession: boolean
  lastLoginTime: string | null
  lastIp: string
  lastDevice: string
  loginCount7Days: number
  uniqueIps24hCount: number
  isFlagged: boolean
}

interface Recording {
  id: string
  title: string
  subject?: { name: string; grade?: number }
}

export default function SecurityAuditDashboardPage() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'alerts'>('sessions')
  
  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertFilter, setAlertFilter] = useState<'all' | 'unresolved'>('unresolved')

  // Sessions state
  const [sessions, setSessions] = useState<SessionUser[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Reset Progress Modal state
  const [resetModalUser, setResetModalUser] = useState<SessionUser | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedRecordingId, setSelectedRecordingId] = useState('')
  const [resetReason, setResetReason] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)

  useEffect(() => {
    fetchSessions()
    fetchAlerts()
    fetchRecordings()
  }, [])

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/security-alerts')
      if (res.ok) setAlerts((await res.json()).alerts || [])
    } finally {
      setAlertsLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/session-audit')
      if (res.ok) setSessions((await res.json()).sessions || [])
    } finally {
      setSessionsLoading(false)
    }
  }

  const fetchRecordings = async () => {
    try {
      const res = await fetch('/api/admin/recordings')
      if (res.ok) setRecordings((await res.json()).recordings || [])
    } catch (e) {
      console.error(e)
    }
  }

  const resolveAlert = async (alertId: string) => {
    await fetch('/api/admin/security-alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId })
    })
    fetchAlerts()
  }

  const handleSessionAction = async (userId: string, action: string, warningMessage?: string) => {
    setActionMessage(null)
    try {
      const res = await fetch('/api/admin/session-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, warningMessage })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      setActionMessage({ text: data.message, type: 'success' })
      fetchSessions()
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' })
    }
  }

  const handleResetProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalUser || !selectedRecordingId || !resetReason.trim()) return

    setResetSubmitting(true)
    setActionMessage(null)
    try {
      const res = await fetch('/api/admin/recordings/reset-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetModalUser.id,
          recordingId: selectedRecordingId,
          reason: resetReason.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      setActionMessage({ text: data.message, type: 'success' })
      setResetModalUser(null)
      setResetReason('')
      setSelectedRecordingId('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setResetSubmitting(false)
    }
  }

  const filteredAlerts = alertFilter === 'unresolved' ? alerts.filter(a => !a.resolved) : alerts

  const typeColors: Record<string, { bg: string; color: string; icon: string }> = {
    UNUSUAL_LOCATION: { bg: 'rgba(245,158,11,0.1)', color: '#b45309', icon: '📍' },
    UNKNOWN_DEVICE: { bg: 'rgba(239,68,68,0.1)', color: '#b91c1c', icon: '💻' },
    MULTI_SESSION: { bg: 'rgba(124,58,237,0.1)', color: '#6d28d9', icon: '🔄' },
    SHARE_ATTEMPT: { bg: 'rgba(239,68,68,0.15)', color: '#991b1b', icon: '🔗' },
    ACCOUNT_SHARING_ATTEMPT: { bg: 'rgba(239,68,68,0.15)', color: '#991b1b', icon: '🚫' },
    PROFANITY_VIOLATION: { bg: 'rgba(234,179,8,0.15)', color: '#ca8a04', icon: '🤬' }
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Header & Tabs */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>🛡️ Security & Session Audit</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Enforce single-session authentication, monitor multi-IP access, and manage recording progress overrides.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('sessions')}
            className={activeTab === 'sessions' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem', borderRadius: '8px' }}
          >
            👥 Active Sessions & User Audits ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={activeTab === 'alerts' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem', borderRadius: '8px', position: 'relative' }}
          >
            🚨 Threat Alerts
            {alerts.filter(a => !a.resolved).length > 0 && (
              <span style={{ marginLeft: '0.5rem', background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 800 }}>
                {alerts.filter(a => !a.resolved).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', background: actionMessage.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: actionMessage.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${actionMessage.type === 'success' ? '#10b981' : '#ef4444'}`, fontWeight: 600 }}>
          {actionMessage.text}
        </div>
      )}

      {/* TAB 1: SESSIONS & AUDITS */}
      {activeTab === 'sessions' && (
        <div>
          {sessionsLoading ? (
            <div className="pulse" style={{ padding: '3rem', textAlign: 'center' }}>Loading active sessions and login audits...</div>
          ) : (
            <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>User / Role</th>
                    <th style={{ padding: '1rem' }}>Active Session</th>
                    <th style={{ padding: '1rem' }}>Last Known IP & Device</th>
                    <th style={{ padding: '1rem' }}>24h IPs / 7d Logins</th>
                    <th style={{ padding: '1rem' }}>Security Flags</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Admin Control Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((user, idx) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', background: user.isFlagged ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--accent-primary)', marginTop: '0.25rem', display: 'inline-block' }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {user.hasActiveSession ? (
                          <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span> Active
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Logged Out</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{user.lastIp}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.lastDevice}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div><strong>{user.uniqueIps24hCount}</strong> unique IPs in 24h</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.loginCount7Days} logins in 7 days</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                          {user.isFlagged && (
                            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '99px', textTransform: 'uppercase' }}>
                              ⚠️ &gt;3 IPs in 24h
                            </span>
                          )}
                          {user.accountDisabled && (
                            <span style={{ background: '#b91c1c', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                              🚫 Account Suspended
                            </span>
                          )}
                          {user.recordingAccessRevoked && (
                            <span style={{ background: '#d97706', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                              🔒 Video Access Revoked
                            </span>
                          )}
                          {!user.isFlagged && !user.accountDisabled && !user.recordingAccessRevoked && (
                            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>✅ Normal</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {user.hasActiveSession && (
                            <button
                              onClick={() => handleSessionAction(user.id, 'FORCE_LOGOUT')}
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                              title="Force logout active session"
                            >
                              ⚡ Force Logout
                            </button>
                          )}
                          {!user.recordingAccessRevoked ? (
                            <button
                              onClick={() => handleSessionAction(user.id, 'REVOKE_RECORDINGS')}
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}
                              title="Revoke video recording access"
                            >
                              🔒 Revoke Videos
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSessionAction(user.id, 'RESTORE_ACCESS')}
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                            >
                              ✅ Restore Access
                            </button>
                          )}
                          {!user.accountDisabled ? (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to suspend ${user.name}'s account?`)) {
                                  handleSessionAction(user.id, 'DISABLE_ACCOUNT')
                                }
                              }}
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#b91c1c', borderColor: 'rgba(185,28,28,0.3)' }}
                            >
                              ⛔ Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSessionAction(user.id, 'RESTORE_ACCESS')}
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#10b981' }}
                            >
                              ✅ Unsuspend
                            </button>
                          )}
                          {user.role === 'STUDENT' && (
                            <button
                              onClick={() => {
                                setResetModalUser(user)
                                setResetReason('')
                                setSelectedRecordingId(recordings[0]?.id || '')
                              }}
                              className="btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            >
                              🔄 Reset Progress
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: THREAT ALERTS */}
      {activeTab === 'alerts' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setAlertFilter('unresolved')} className={alertFilter === 'unresolved' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
              Unresolved ({alerts.filter(a => !a.resolved).length})
            </button>
            <button onClick={() => setAlertFilter('all')} className={alertFilter === 'all' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
              All ({alerts.length})
            </button>
          </div>

          {alertsLoading ? (
            <div className="pulse" style={{ padding: '3rem', textAlign: 'center' }}>Loading security alerts...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredAlerts.map((alert, idx) => {
                const style = typeColors[alert.type] || { bg: 'rgba(16,185,129,0.1)', color: 'var(--accent-primary)', icon: '⚠️' }
                return (
                  <div key={alert.id} className={`card stagger-${(idx % 5) + 1}`} style={{ opacity: alert.resolved ? 0.6 : 1, borderLeft: `4px solid ${style.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{style.icon}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.75rem', borderRadius: '99px', background: style.bg, color: style.color }}>
                            {alert.type.replace(/_/g, ' ')}
                          </span>
                          {alert.resolved && <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>✅ Resolved</span>}
                        </div>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{alert.message}</p>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span>👤 {alert.user?.name} ({alert.user?.email})</span>
                          <span>🕐 {new Date(alert.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      {!alert.resolved && (
                        <button onClick={() => resolveAlert(alert.id)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap' }}>
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredAlerts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{alertFilter === 'unresolved' ? '✅' : '🔒'}</div>
                  <p>{alertFilter === 'unresolved' ? 'No unresolved alerts. System is clean!' : 'No security alerts on record.'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RESET RECORDING PROGRESS MODAL */}
      {resetModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>🔄 Reset Monotonic Progress</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Reset video progress to 0:00 for student <strong>{resetModalUser.name}</strong> ({resetModalUser.email}).
            </p>

            <form onSubmit={handleResetProgressSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Select Recording:
                </label>
                <select
                  value={selectedRecordingId}
                  onChange={(e) => setSelectedRecordingId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- Choose Recording --</option>
                  {recordings.map(rec => (
                    <option key={rec.id} value={rec.id}>
                      {rec.title} {rec.subject ? `(${rec.subject.name} - Grade ${rec.subject.grade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Mandatory Admin Reason for Reset:
                </label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g. Student's device crashed mid-session, cleared by teacher request..."
                  required
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="btn-secondary"
                  disabled={resetSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resetSubmitting}
                >
                  {resetSubmitting ? 'Resetting...' : 'Confirm Reset & Email Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
