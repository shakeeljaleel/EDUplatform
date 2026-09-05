'use client'

import { useState, useEffect } from 'react'

const ROLES = ['TEACHER', 'STUDENT', 'PARENT', 'ASSISTANT']
const ROLE_LABELS: Record<string, string> = {
  TEACHER: '👩‍🏫 Teachers',
  STUDENT: '🎓 Students',
  PARENT: '👨‍👩‍👧 Parents',
  ASSISTANT: '🧑‍💼 Assistants',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  APPROVED: { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
  REJECTED: { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [activeRole, setActiveRole] = useState('TEACHER')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchUsers() }, [activeRole])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?role=${activeRole}`)
      if (res.ok) setUsers((await res.json()).users)
    } finally { setLoading(false) }
  }

  const handleStatus = async (userId: string, approvalStatus: string) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalStatus }),
    })
    if (res.ok) fetchUsers()
  }

  const handlePayment = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid'
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: newStatus }),
    })
    if (res.ok) fetchUsers()
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = users.filter(u => u.approvalStatus === 'PENDING').length

  return (
    <div className="fade-in">
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3.5rem', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>User Console</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>Ecosystem account configuration, approval controls, and subscription verification.</p>
        </div>
        {pendingCount > 0 && activeRole === 'TEACHER' && (
          <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'rgba(245,158,11,0.15)', border: '2px solid var(--warning)', borderRadius: '16px', color: '#d97706', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', boxShadow: '4px 4px 0 var(--text-primary)' }}>
            ⏳ {pendingCount} Pending Approvals
          </div>
        )}
      </div>

      {/* Role Tabs Container */}
      <div style={{ display: 'inline-flex', gap: '1rem', background: 'var(--text-primary)', padding: '10px', borderRadius: '24px', boxShadow: '8px 8px 0 var(--accent-primary)', marginBottom: '3rem', flexWrap: 'wrap' }}>
        {ROLES.map(role => (
          <button 
            key={role} 
            onClick={() => { setActiveRole(role); setSearch('') }}
            style={{
              padding: '0.875rem 1.5rem', borderRadius: '16px', border: 'none', cursor: 'pointer',
              backgroundColor: activeRole === role ? 'var(--accent-primary)' : 'transparent',
              fontWeight: 900, color: 'white', textTransform: 'uppercase', fontSize: '0.85rem',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {/* Search Input styled */}
      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Search users by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '500px', border: 'var(--sketch-border)', boxShadow: '4px 4px 0 var(--text-primary)' }}
        />
      </div>

      {/* User List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
        {loading && <p style={{ fontWeight: 800, color: 'var(--text-secondary)' }} className="pulse">Loading registry node...</p>}

        {!loading && filtered.map(user => {
          const statusStyle = STATUS_COLORS[user.approvalStatus] || STATUS_COLORS.APPROVED
          const paymentStatus = user.profile?.paymentStatus || 'Pending'

          return (
            <div 
              key={user.id} 
              className="premium-card-v2" 
              style={{ 
                padding: '1.5rem 2rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '2rem', 
                flexWrap: 'wrap',
                borderLeft: activeRole === 'STUDENT' 
                  ? `10px solid ${paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)'}` 
                  : '3px solid var(--text-primary)'
              }}
            >
              {/* Avatar */}
              <div style={{ 
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--accent-glow)', 
                border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.25rem', flexShrink: 0,
                boxShadow: '2px 2px 0 var(--text-primary)'
              }}>
                {user.name[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: 900, fontSize: '1.25rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{user.email}</div>
              </div>

              {/* Badges Column */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Approval status badge */}
                <div style={{ padding: '0.35rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', backgroundColor: statusStyle.bg, color: statusStyle.color, border: `2px solid ${statusStyle.color}` }}>
                  {user.approvalStatus}
                </div>

                {/* Student specific payment status badge */}
                {activeRole === 'STUDENT' && (
                  <div style={{ 
                    padding: '0.35rem 1rem', 
                    borderRadius: 'var(--radius-full)', 
                    fontSize: '0.75rem', 
                    fontWeight: 900, 
                    textTransform: 'uppercase',
                    backgroundColor: paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                    color: paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)',
                    border: `2px solid ${paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)'}` 
                  }}>
                    💳 {paymentStatus}
                  </div>
                )}
              </div>

              {/* Actions Column */}
              <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                {/* Actions — only for TEACHER role */}
                {activeRole === 'TEACHER' && (
                  <>
                    {user.approvalStatus !== 'APPROVED' && (
                      <button className="sketch-button-v2" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', backgroundColor: 'var(--success)' }} onClick={() => handleStatus(user.id, 'APPROVED')}>
                        Approve
                      </button>
                    )}
                    {user.approvalStatus !== 'REJECTED' && (
                      <button className="sketch-button-v2" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', backgroundColor: 'var(--error)' }} onClick={() => handleStatus(user.id, 'REJECTED')}>
                        Reject
                      </button>
                    )}
                    {user.approvalStatus !== 'PENDING' && (
                      <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', borderRadius: '16px' }} onClick={() => handleStatus(user.id, 'PENDING')}>
                        Reset
                      </button>
                    )}
                  </>
                )}

                {/* Actions — only for STUDENT role to update payment status */}
                {activeRole === 'STUDENT' && (
                  <button 
                    className="sketch-button-v2" 
                    style={{ 
                      padding: '0.6rem 1.25rem', 
                      fontSize: '0.8rem', 
                      backgroundColor: paymentStatus === 'Paid' ? 'var(--warning)' : 'var(--accent-primary)',
                    }} 
                    onClick={() => handlePayment(user.id, paymentStatus)}
                  >
                    {paymentStatus === 'Paid' ? '⚠️ Mark Pending' : '💎 Mark Paid'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {!loading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <h3>No {activeRole.toLowerCase()}s found.</h3>
          </div>
        )}
      </div>
    </div>
  )
}
