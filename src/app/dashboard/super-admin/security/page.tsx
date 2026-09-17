'use client'

import { useState, useEffect } from 'react'
import Breadcrumbs from '@/components/Breadcrumbs'

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

interface AuditLogEntry {
  id: string
  actorId: string
  actorName: string
  actorEmail: string
  actorRole: string
  action: string
  targetType: string | null
  targetId: string | null
  details: string | null
  createdAt: string
}

export default function SecurityAuditDashboardPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'sessions' | 'alerts'>('audit')

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertFilter, setAlertFilter] = useState<'all' | 'unresolved'>('unresolved')

  // Sessions state
  const [sessions, setSessions] = useState<SessionUser[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchAuditLogs()
    fetchSessions()
    fetchAlerts()
  }, [])

  const fetchAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const res = await fetch('/api/audit-logs')
      if (res.ok) setAuditLogs((await res.json()).logs || [])
    } finally {
      setAuditLoading(false)
    }
  }

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

  const filteredLogs = auditLogs.filter(log => {
    const matchesAction = !actionFilter || log.action.toLowerCase().includes(actionFilter.toLowerCase())
    const matchesRole = !roleFilter || log.actorRole === roleFilter
    return matchesAction && matchesRole
  })

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
    <div style={{ maxWidth: '1200px' }} className="fade-in">
      <Breadcrumbs items={[{ label: 'Overview', href: '/dashboard/super-admin' }, { label: 'Security alerts' }]} />

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>🛡️ Security & System Audit Log</h1>
            <p style={{ color: '#64748b', fontWeight: 600 }}>
              Track every assignment, permission change, enrolment approval, and security event across the platform.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '3px solid #1a1a2e', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              background: activeTab === 'audit' ? '#1a1a2e' : '#ffffff',
              color: activeTab === 'audit' ? '#ffffff' : '#1a1a2e',
              border: '3px solid #1a1a2e',
              boxShadow: '3px 3px 0px #1a1a2e',
              fontSize: '0.9rem',
              fontWeight: 800,
              padding: '0.6rem 1.25rem',
              borderRadius: '50px',
              cursor: 'pointer'
            }}
          >
            📋 Audit Log ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            style={{
              background: activeTab === 'sessions' ? '#1a1a2e' : '#ffffff',
              color: activeTab === 'sessions' ? '#ffffff' : '#1a1a2e',
              border: '3px solid #1a1a2e',
              boxShadow: '3px 3px 0px #1a1a2e',
              fontSize: '0.9rem',
              fontWeight: 800,
              padding: '0.6rem 1.25rem',
              borderRadius: '50px',
              cursor: 'pointer'
            }}
          >
            👥 Active Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              background: activeTab === 'alerts' ? '#1a1a2e' : '#ffffff',
              color: activeTab === 'alerts' ? '#ffffff' : '#1a1a2e',
              border: '3px solid #1a1a2e',
              boxShadow: '3px 3px 0px #1a1a2e',
              fontSize: '0.9rem',
              fontWeight: 800,
              padding: '0.6rem 1.25rem',
              borderRadius: '50px',
              cursor: 'pointer'
            }}
          >
            🚨 Threat Alerts ({alerts.filter(a => !a.resolved).length})
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', background: actionMessage.type === 'success' ? '#e8f5e9' : '#ffebee', color: actionMessage.type === 'success' ? '#2e7d32' : '#c62828', border: '2px solid #1a1a2e', fontWeight: 800 }}>
          {actionMessage.text}
        </div>
      )}

      {/* TAB 1: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '3px solid #1a1a2e', borderRadius: '12px', boxShadow: '4px 4px 0px #1a1a2e' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Filter by action (e.g. ASSIGN, APPROVE)..."
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              style={{ flex: 1, minWidth: '220px', minHeight: '38px', border: '2px solid #1a1a2e' }}
            />
            <select
              className="input-field"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ width: '180px', minHeight: '38px', border: '2px solid #1a1a2e' }}
            >
              <option value="">All Actor Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="TEACHER">TEACHER</option>
              <option value="ASSISTANT">ASSISTANT</option>
              <option value="STUDENT">STUDENT</option>
            </select>
          </div>

          {auditLoading ? (
            <div className="pulse" style={{ padding: '3rem', fontWeight: 800, color: '#64748b' }}>Loading system audit log...</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e' }}>
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '3px solid #1a1a2e', color: '#1a1a2e' }}>
                      <th style={{ padding: '1rem', fontWeight: 900 }}>Actor</th>
                      <th style={{ padding: '1rem', fontWeight: 900 }}>Role</th>
                      <th style={{ padding: '1rem', fontWeight: 900 }}>Action</th>
                      <th style={{ padding: '1rem', fontWeight: 900 }}>Target</th>
                      <th style={{ padding: '1rem', fontWeight: 900 }}>Details</th>
                      <th style={{ padding: '1rem', fontWeight: 900 }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '2px solid #1a1a2e' }}>
                        <td style={{ padding: '1rem', fontWeight: 900, color: '#0f172a' }}>
                          <div>{log.actorName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{log.actorEmail}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            background: log.actorRole === 'SUPER_ADMIN' ? '#aa00ff' : log.actorRole === 'TEACHER' ? '#2979ff' : '#00c853',
                            color: '#ffffff',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            border: '1.5px solid #1a1a2e'
                          }}>
                            {log.actorRole}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 900, color: '#0f172a' }}>
                          {log.action}
                        </td>
                        <td style={{ padding: '1rem', color: '#475569', fontWeight: 800 }}>
                          {log.targetType} {log.targetId ? `(#${log.targetId.slice(0, 8)})` : ''}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace', maxWidth: '250px', wordBreak: 'break-word' }}>
                          {log.details}
                        </td>
                        <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                          No audit log entries matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SESSIONS & AUDITS */}
      {activeTab === 'sessions' && (
        <div>
          {sessionsLoading ? (
            <div className="pulse" style={{ padding: '3rem', textAlign: 'center' }}>Loading active sessions...</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '3px solid #1a1a2e', color: '#1a1a2e' }}>
                    <th style={{ padding: '1rem', fontWeight: 900 }}>User / Role</th>
                    <th style={{ padding: '1rem', fontWeight: 900 }}>Active Session</th>
                    <th style={{ padding: '1rem', fontWeight: 900 }}>Last Known IP & Device</th>
                    <th style={{ padding: '1rem', fontWeight: 900 }}>24h IPs / 7d Logins</th>
                    <th style={{ padding: '1rem', fontWeight: 900 }}>Security Flags</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 900 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(user => (
                    <tr key={user.id} style={{ borderBottom: '2px solid #1a1a2e' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 900, color: '#0f172a' }}>{user.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {user.hasActiveSession ? (
                          <span style={{ color: '#00c853', fontWeight: 900 }}>🟢 Active</span>
                        ) : (
                          <span style={{ color: '#64748b', fontWeight: 700 }}>Logged Out</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                        {user.lastIp}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800 }}>
                        {user.uniqueIps24hCount} IPs in 24h
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {user.isFlagged ? (
                          <span style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 900 }}>
                            ⚠️ Multi-IP
                          </span>
                        ) : (
                          <span style={{ color: '#00c853', fontWeight: 800 }}>Normal</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {user.hasActiveSession && (
                          <button
                            onClick={() => handleSessionAction(user.id, 'FORCE_LOGOUT')}
                            style={{ background: '#dc2626', color: '#ffffff', border: '2px solid #1a1a2e', padding: '0.35rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Force Logout
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: THREAT ALERTS */}
      {activeTab === 'alerts' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredAlerts.map(alert => (
              <div key={alert.id} className="card" style={{ padding: '1.25rem', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '4px 4px 0px #1a1a2e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{alert.type}</h4>
                    <p style={{ fontSize: '0.88rem', color: '#334155', margin: '0.25rem 0 0 0', fontWeight: 700 }}>{alert.message}</p>
                  </div>
                  {!alert.resolved && (
                    <button onClick={() => resolveAlert(alert.id)} style={{ background: '#00c853', color: '#ffffff', border: '2px solid #1a1a2e', padding: '0.35rem 0.85rem', borderRadius: '50px', fontWeight: 800, cursor: 'pointer' }}>
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
