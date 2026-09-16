'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Plus, X, Layers, Building2, BookOpen, Users } from '@/components/Icons'
import { showToast } from '@/components/ToastContainer'
import { getAcademicLevelColor } from '@/lib/subjectColors'

const LEVEL_GRADIENTS: Record<string, { bg: string; border: string; text: string }> = {
  'O Level': { bg: 'linear-gradient(135deg, #00b4d8, #0077b6)', border: '#00b4d8', text: '#ffffff' },
  'AS Level': { bg: 'linear-gradient(135deg, #2979ff, #448aff)', border: '#2979ff', text: '#ffffff' },
  'A Level': { bg: 'linear-gradient(135deg, #aa00ff, #ea80fc)', border: '#aa00ff', text: '#ffffff' },
  'Grade 11': { bg: 'linear-gradient(135deg, #ff6d00, #ffd180)', border: '#ff6d00', text: '#ffffff' },
}

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [academicLevel, setAcademicLevel] = useState('O Level')
  const [branchId, setBranchId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBatches()
    fetchBranches()
  }, [])

  const fetchBatches = async () => {
    const res = await fetch('/api/batches')
    if (res.ok) {
      const data = await res.json()
      setBatches(data.batches || [])
    }
  }

  const fetchBranches = async () => {
    const res = await fetch('/api/branches')
    if (res.ok) {
      const data = await res.json()
      setBranches(data.branches || [])
    }
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), academicLevel, branchId: branchId || undefined })
      })
      
      if (res.ok) {
        showToast(`Batch "${name}" created successfully`, 'success')
        setName('')
        setBranchId('')
        setShowCreateModal(false)
        fetchBatches()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create batch', 'error')
      }
    } catch (err) {
      showToast('Error creating batch', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs items={[{ label: 'Batches & intakes' }]} />

      {/* Clean Page Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Batches & intakes
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', margin: 0 }}>
            Manage academic batches, student allocations, and branch assignments.
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => setShowCreateModal(true)}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={18} />
          <span>+ New batch</span>
        </button>
      </div>

      {/* Full-Width Batches Table Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Batch name</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Branch</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Academic level</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Students</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Subjects</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Created date</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => {
                const levelColor = getAcademicLevelColor(batch.academicLevel)
                const subjectCount = batch._count?.subjects || 0
                return (
                  <tr 
                    key={batch.id} 
                    onClick={() => router.push(`/dashboard/super-admin/batches/${batch.id}`)}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      borderLeft: `6px solid ${levelColor}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(240, 249, 255, 0.6)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                      {batch.name}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {batch.branch ? (
                        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 }}>
                          📍 {batch.branch.name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Global</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        background: levelColor,
                        color: '#ffffff',
                        fontWeight: 800,
                        padding: '0.35rem 0.85rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        boxShadow: `0 2px 8px ${levelColor}44`
                      }}>
                        {batch.academicLevel}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      👥 {batch._count?.enrollments || 0}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/super-admin/batches/${batch.id}?tab=subjects`)
                        }}
                        style={{
                          background: '#f0fdf4',
                          color: '#059669',
                          border: '1.5px solid #10b981',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        📚 {subjectCount} {subjectCount === 1 ? 'subject' : 'subjects'}
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                    No batches found. Click <strong>"+ New batch"</strong> above to create your first intake.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BATCH MODAL (PROMPT 4 SPECIFICATION) */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative', borderRadius: '14px', border: '2px solid #10b981' }}>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Layers size={24} color="#10b981" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Create batch</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 600 }}>
              Add a new academic batch intake to your institution.
            </p>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Batch name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Cambridge AS 2026"
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Academic level</label>
                <select 
                  className="input-field" 
                  value={academicLevel} 
                  onChange={e => setAcademicLevel(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="O Level">O Level</option>
                  <option value="AS">AS</option>
                  <option value="A Level">A Level</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Branch (Optional)</label>
                <select 
                  className="input-field" 
                  value={branchId} 
                  onChange={e => setBranchId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="">Global / No branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                  style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}
                >
                  {loading ? 'Creating...' : 'Create batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
