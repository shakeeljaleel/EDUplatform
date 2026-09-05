'use client'

import { useState, useEffect } from 'react'
import EmptyState from '@/components/EmptyState'
import { showToast } from '@/components/ToastContainer'
import { Search, Filter, Lock, ShieldAlert, Check, Users, AlertTriangle } from '@/components/Icons'

const ROLES = ['TEACHER', 'STUDENT', 'PARENT', 'ASSISTANT']
const ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Teachers',
  STUDENT: 'Students',
  PARENT: 'Parents',
  ASSISTANT: 'Assistants',
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:  { bg: '#fffbeb', color: '#b45309', border: '#f59e0b' },
  APPROVED: { bg: '#f0fdf4', color: '#059669', border: '#10b981' },
  REJECTED: { bg: '#fef2f2', color: '#dc2626', border: '#ef4444' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [activeRole, setActiveRole] = useState('TEACHER')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Password reset modal state
  const [resetUser, setResetUser] = useState<any | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Suspend confirmation modal state
  const [suspendUserTarget, setSuspendUserTarget] = useState<any | null>(null)
  const [suspendLoading, setSuspendLoading] = useState(false)

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
    if (res.ok) {
      showToast(`User status updated to ${approvalStatus}`, 'success')
      fetchUsers()
    }
  }

  const confirmSuspend = async () => {
    if (!suspendUserTarget) return
    setSuspendLoading(true)
    try {
      await handleStatus(suspendUserTarget.id, 'REJECTED')
      setSuspendUserTarget(null)
    } finally {
      setSuspendLoading(false)
    }
  }

  const handlePayment = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid'
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: newStatus }),
    })
    if (res.ok) {
      showToast(`Payment status updated to ${newStatus}`, 'success')
      fetchUsers()
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUser || !newPassword) return
    setResetLoading(true)
    try {
      const res = await fetch(`/api/users/${resetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      if (res.ok) {
        showToast(`Password for ${resetUser.name} reset successfully!`, 'success')
        setNewPassword('')
        setResetUser(null)
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to update password', 'error')
      }
    } catch (err) {
      showToast('Network error while resetting password', 'error')
    } finally {
      setResetLoading(false)
    }
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || u.approvalStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = users.filter(u => u.approvalStatus === 'PENDING').length

  return (
    <div className="fade-in">
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>User Management Console</h1>
          <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600 }}>Ecosystem account configuration, approval controls, and credential resets.</p>
        </div>
        {pendingCount > 0 && activeRole === 'TEACHER' && (
          <div style={{ padding: '0.65rem 1.25rem', backgroundColor: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '12px', color: '#b45309', fontWeight: 800, fontSize: '0.85rem' }}>
            ⏳ {pendingCount} Pending Approvals
          </div>
        )}
      </div>

      {/* Role Tabs Container */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: '6px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {ROLES.map(role => (
          <button 
            key={role} 
            onClick={() => { setActiveRole(role); setSearch('') }}
            style={{
              padding: '0.65rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
              backgroundColor: activeRole === role ? '#10b981' : 'transparent',
              fontWeight: 800, color: activeRole === role ? 'white' : '#475569', fontSize: '0.875rem',
              transition: 'all 0.2s ease', minHeight: '44px'
            }}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {/* Search & Status Filter Controls */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem', minHeight: '44px' }}
          />
        </div>

        <select
          className="input-field"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: '200px', minHeight: '44px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="APPROVED">Approved Only</option>
          <option value="PENDING">Pending Approval</option>
          <option value="REJECTED">Suspended / Rejected</option>
        </select>
      </div>

      {/* User List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '4rem' }}>
        {loading && <p style={{ fontWeight: 800, color: '#64748b' }}>Loading user directory...</p>}

        {!loading && filtered.map(user => {
          const statusStyle = STATUS_COLORS[user.approvalStatus] || STATUS_COLORS.APPROVED
          const paymentStatus = user.profile?.paymentStatus || 'Pending'

          return (
            <div 
              key={user.id} 
              className="premium-card-v2" 
              style={{ 
                padding: '1.25rem 1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1.5rem', 
                flexWrap: 'wrap',
                borderLeft: `6px solid ${statusStyle.border}`,
                background: '#ffffff'
              }}
            >
              {/* Avatar */}
              <div style={{ 
                width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#f0fdf4', 
                border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: 900, color: '#059669', fontSize: '1.1rem', flexShrink: 0
              }}>
                {user.name[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{user.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>{user.email}</div>
              </div>

              {/* Badges Column */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Approval status badge */}
                <div style={{ padding: '0.25rem 0.875rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', backgroundColor: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                  {user.approvalStatus}
                </div>

                {/* Student specific payment status badge */}
                {activeRole === 'STUDENT' && (
                  <div style={{ 
                    padding: '0.25rem 0.875rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 800, 
                    textTransform: 'uppercase',
                    backgroundColor: paymentStatus === 'Paid' ? '#f0fdf4' : '#fffbeb', 
                    color: paymentStatus === 'Paid' ? '#059669' : '#b45309',
                    border: `1px solid ${paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'}` 
                  }}>
                    💳 {paymentStatus}
                  </div>
                )}
              </div>

              {/* Actions Column */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
                {user.approvalStatus !== 'APPROVED' && (
                  <button className="btn-primary" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem', minHeight: '40px' }} onClick={() => handleStatus(user.id, 'APPROVED')}>
                    Approve
                  </button>
                )}

                {/* DESTRUCTIVE SUSPEND ACTION — RED OUTLINE STYLE & CONFIRMATION MODAL */}
                {user.approvalStatus !== 'REJECTED' && (
                  <button 
                    style={{
                      padding: '0.5rem 0.875rem', fontSize: '0.8rem', minHeight: '40px',
                      color: '#dc2626', background: '#fef2f2', border: '1px solid #ef4444',
                      borderRadius: '8px', fontWeight: 800, cursor: 'pointer'
                    }}
                    onClick={() => setSuspendUserTarget(user)}
                  >
                    Suspend User
                  </button>
                )}

                {/* Password Reset Trigger */}
                <button 
                  className="btn-secondary" 
                  style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem', minHeight: '40px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => { setResetUser(user); setNewPassword('') }}
                >
                  <Lock size={14} /> Password Reset
                </button>

                {activeRole === 'STUDENT' && (
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem', minHeight: '40px' }} 
                    onClick={() => handlePayment(user.id, paymentStatus)}
                  >
                    {paymentStatus === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={<Users size={36} color="#94a3b8" />}
            title={`No ${activeRole.toLowerCase()}s found`}
            description="No user records match your search query or status filter."
          />
        )}
      </div>

      {/* CONFIRMATION DIALOG FOR DESTRUCTIVE SUSPEND ACTION */}
      {suspendUserTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', position: 'relative', border: '2px solid #ef4444' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef2f2', border: '1px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="#dc2626" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: '#0f172a' }}>
              Confirm Account Suspension
            </h3>

            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to suspend access for <strong style={{ color: '#0f172a' }}>{suspendUserTarget.name}</strong> ({suspendUserTarget.email})? They will be blocked from logging into the platform until re-approved.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setSuspendUserTarget(null)}
                style={{ minHeight: '44px', padding: '0.75rem 1.25rem' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmSuspend}
                disabled={suspendLoading}
                style={{
                  minHeight: '44px', padding: '0.75rem 1.25rem',
                  background: '#dc2626', color: 'white', border: 'none',
                  borderRadius: '8px', fontWeight: 800, cursor: 'pointer'
                }}
              >
                {suspendLoading ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setResetUser(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.25rem', color: '#0f172a' }}>Reset Password</h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem' }}>
              Set new password for <strong style={{ color: '#0f172a' }}>{resetUser.name}</strong> ({resetUser.email})
            </p>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#475569' }}>New Password</label>
                <input 
                  type="password"
                  className="input-field"
                  required
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              <button 
                type="submit"
                className="btn-primary"
                disabled={resetLoading}
                style={{ width: '100%', minHeight: '44px' }}
              >
                {resetLoading ? 'Updating Password...' : 'Confirm Password Reset'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
