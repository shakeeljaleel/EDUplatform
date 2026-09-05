'use client'

import { useState, useEffect } from 'react'

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved')

  useEffect(() => { fetchAlerts() }, [])

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/security-alerts')
      if (res.ok) setAlerts((await res.json()).alerts)
    } finally { setLoading(false) }
  }

  const resolve = async (alertId: string) => {
    await fetch('/api/admin/security-alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId })
    })
    fetchAlerts()
  }

  const filtered = filter === 'unresolved' ? alerts.filter(a => !a.resolved) : alerts

  const typeColors: Record<string, { bg: string, color: string, icon: string }> = {
    UNUSUAL_LOCATION: { bg: 'rgba(245,158,11,0.1)', color: '#b45309', icon: '📍' },
    UNKNOWN_DEVICE: { bg: 'rgba(239,68,68,0.1)', color: '#b91c1c', icon: '💻' },
    MULTI_SESSION: { bg: 'rgba(124,58,237,0.1)', color: '#6d28d9', icon: '🔄' },
    SHARE_ATTEMPT: { bg: 'rgba(239,68,68,0.15)', color: '#991b1b', icon: '🔗' },
    ACCOUNT_SHARING_ATTEMPT: { bg: 'rgba(239,68,68,0.15)', color: '#991b1b', icon: '🚫' },
    PROFANITY_VIOLATION: { bg: 'rgba(234,179,8,0.15)', color: '#ca8a04', icon: '🤬' }
  }

  if (loading) return <div className="pulse">Loading security alerts...</div>

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>🚨 Security Alerts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor suspicious recording access patterns across all students.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setFilter('unresolved')} className={filter === 'unresolved' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            Unresolved ({alerts.filter(a => !a.resolved).length})
          </button>
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            All ({alerts.length})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((alert, idx) => {
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
                  <button onClick={() => resolve(alert.id)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap' }}>
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{filter === 'unresolved' ? '✅' : '🔒'}</div>
            <p>{filter === 'unresolved' ? 'No unresolved alerts. System is clean!' : 'No security alerts on record.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
