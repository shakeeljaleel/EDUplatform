'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Plus, X, Building2, Layers, Users, ChevronRight } from '@/components/Icons'
import { showToast } from '@/components/ToastContainer'

export default function BranchesPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [type, setType] = useState('Physical')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    const res = await fetch('/api/branches')
    if (res.ok) {
      const data = await res.json()
      setBranches(data.branches || [])
    }
  }

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), address: address.trim(), type }),
      })
      if (res.ok) {
        showToast(`Branch "${name}" created successfully`, 'success')
        setShowCreateModal(false)
        setName('')
        setAddress('')
        setType('Physical')
        fetchBranches()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create branch', 'error')
      }
    } catch {
      showToast('Error creating branch', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      <Breadcrumbs items={[{ label: 'Branches' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Branches
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', margin: 0 }}>
            Manage physical campuses and online learning branches.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.65rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#00c853',
            color: '#ffffff',
            borderRadius: '50px',
            border: '3px solid #1a1a2e',
            boxShadow: '4px 4px 0px #1a1a2e',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={18} color="#ffffff" />
          <span>+ New branch</span>
        </button>
      </div>

      {/* Branch Comic Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
        {branches.map(branch => {
          const cardBg = branch.colour || '#00c853'
          const batchCount = branch.batchCount || 0
          const studentCount = branch.studentCount || 0

          return (
            <div
              key={branch.id}
              onClick={() => router.push(`/dashboard/super-admin/branches/${branch.id}`)}
              style={{
                background: cardBg,
                color: '#ffffff',
                borderRadius: '16px',
                padding: '1.75rem',
                border: '3px solid #1a1a2e',
                boxShadow: '5px 5px 0px #1a1a2e',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.5rem',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '8px 8px 0px #1a1a2e'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0px)'
                e.currentTarget.style.boxShadow = '5px 5px 0px #1a1a2e'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{
                    backgroundColor: '#ffffff',
                    color: cardBg,
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '50px',
                    border: '2px solid #1a1a2e',
                    boxShadow: '2px 2px 0px #1a1a2e',
                    textTransform: 'uppercase'
                  }}>
                    {branch.type || 'Physical'}
                  </span>
                  <Building2 size={24} color="#ffffff" />
                </div>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                  {branch.name}
                </h3>

                {branch.address && (
                  <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>
                    📍 {branch.address}
                  </p>
                )}
              </div>

              <div>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  border: '1.5px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 800 }}>
                    <Layers size={18} color="#ffffff" />
                    <span>{batchCount} {batchCount === 1 ? 'batch' : 'batches'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 800 }}>
                    <Users size={18} color="#ffffff" />
                    <span>{studentCount} students</span>
                  </div>
                </div>

                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.65rem 1rem',
                    background: '#ffffff',
                    color: '#1a1a2e',
                    borderRadius: '50px',
                    border: '2.5px solid #1a1a2e',
                    boxShadow: '3px 3px 0px #1a1a2e',
                    fontWeight: 900,
                    fontSize: '0.875rem',
                    textAlign: 'center'
                  }}
                >
                  <span>View running batches</span>
                  <ChevronRight size={16} color="#1a1a2e" />
                </div>
              </div>
            </div>
          )
        })}

        {branches.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '16px', border: '3px dashed #cbd5e1' }}>
            <Building2 size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>No branches created yet</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>Click <strong>"+ New branch"</strong> above to register your first campus.</p>
          </div>
        )}
      </div>

      {/* CREATE NEW BRANCH MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e' }}>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Building2 size={24} color="#00c853" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Create branch</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 600 }}>
              Add a new physical campus or online learning branch.
            </p>

            <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Branch name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Main Campus, Kohuwala, Wattala, Online"
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Address</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. 123 High Street, Kohuwala"
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Branch type</label>
                <select 
                  className="input-field" 
                  value={type} 
                  onChange={e => setType(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                >
                  <option value="Physical">Physical</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.65rem 1.25rem', fontWeight: 800, borderRadius: '50px', border: '3px solid #1a1a2e' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontWeight: 800,
                    background: '#00c853',
                    color: '#ffffff',
                    borderRadius: '50px',
                    border: '3px solid #1a1a2e',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Creating...' : 'Create branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
