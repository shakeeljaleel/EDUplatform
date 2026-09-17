'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Plus, X, Layers, Building2, BookOpen, Users, MoreVertical, Edit, Trash2, Eye } from '@/components/Icons'
import { showToast } from '@/components/ToastContainer'
import { getAcademicLevelColor } from '@/lib/subjectColors'

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Create Batch Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [academicLevel, setAcademicLevel] = useState('O Level')
  const [branchId, setBranchId] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit Batch Modal state
  const [editBatch, setEditBatch] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editAcademicLevel, setEditAcademicLevel] = useState('')
  const [editBranchId, setEditBranchId] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // 3-Dot Dropdown Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchBatches()
    fetchBranches()
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/batches')
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } finally {
      setLoading(false)
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
    setSubmitting(true)
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          academicLevel,
          branchId: branchId || undefined,
          description: description.trim() || undefined
        })
      })
      
      if (res.ok) {
        showToast(`Batch "${name}" created successfully`, 'success')
        setName('')
        setAcademicLevel('O Level')
        setBranchId('')
        setDescription('')
        setShowCreateModal(false)
        fetchBatches()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create batch', 'error')
      }
    } catch {
      showToast('Error creating batch', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBatch || !editName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/batches/${editBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          academicLevel: editAcademicLevel,
          branchId: editBranchId || null,
          description: editDescription.trim() || null
        })
      })
      if (res.ok) {
        showToast(`Batch "${editName}" updated successfully`, 'success')
        setEditBatch(null)
        fetchBatches()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to update batch', 'error')
      }
    } catch {
      showToast('Error updating batch', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBatch = async (batchItem: any) => {
    if (!confirm(`Are you sure you want to delete batch "${batchItem.name}"? This action cannot be undone.`)) return
    try {
      const res = await fetch(`/api/batches/${batchItem.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast(`Batch "${batchItem.name}" deleted`, 'success')
        fetchBatches()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to delete batch', 'error')
      }
    } catch {
      showToast('Error deleting batch', 'error')
    }
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs items={[{ label: 'Batches' }]} />

      {/* Clean Page Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Batches
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', margin: 0 }}>
            Manage academic batches, student allocations, and branch assignments.
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
          <span>+ New batch</span>
        </button>
      </div>

      {/* Full-Width Active Batches Table Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e' }}>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #1a1a2e', textAlign: 'left' }}>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Batch name</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Branch</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Academic level</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Students</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Subjects</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Teachers</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Created date</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => {
                const levelColor = getAcademicLevelColor(batch.academicLevel)
                const subjectCount = batch._count?.subjects || 0
                const studentCount = batch._count?.enrollments || 0
                const teacherCount = batch.teacherCount || 0

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
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                      <div>{batch.name}</div>
                      {batch.description && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>{batch.description}</div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      {batch.branch ? (
                        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1.5px solid #2563eb', padding: '0.25rem 0.65rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 900 }}>
                          📍 {batch.branch.name}
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1.5px solid #cbd5e1', padding: '0.25rem 0.65rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800 }}>
                          Global
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        background: levelColor,
                        color: '#ffffff',
                        fontWeight: 900,
                        padding: '0.35rem 0.85rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        border: '1.5px solid #1a1a2e',
                        boxShadow: '2px 2px 0px #1a1a2e'
                      }}>
                        {batch.academicLevel}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      👥 {studentCount}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/super-admin/batches/${batch.id}?tab=subjects`)
                        }}
                        style={{
                          background: subjectCount === 0 ? '#fff0f0' : '#f0fff4',
                          color: subjectCount === 0 ? '#dc2626' : '#059669',
                          border: subjectCount === 0 ? '2px solid #dc2626' : '2px solid #059669',
                          boxShadow: '3px 3px 0px #1a1a2e',
                          borderRadius: '50px',
                          padding: '0.35rem 0.85rem',
                          fontWeight: 900,
                          fontSize: '0.825rem',
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

                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      👨‍🏫 {teacherCount}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions Menu */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === batch.id ? null : batch.id)}
                        style={{
                          width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #cbd5e1',
                          background: '#ffffff', color: '#475569', fontSize: '1rem', fontWeight: 900,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}
                        title="Actions menu"
                      >
                        •••
                      </button>

                      {openMenuId === batch.id && (
                        <div 
                          ref={menuRef}
                          style={{
                            position: 'absolute', right: '1.25rem', top: '3.25rem', zIndex: 100,
                            width: '160px', backgroundColor: '#ffffff', borderRadius: '10px',
                            border: '2px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e',
                            padding: '0.35rem 0', display: 'flex', flexDirection: 'column'
                          }}
                        >
                          <button
                            onClick={() => { router.push(`/dashboard/super-admin/batches/${batch.id}`); setOpenMenuId(null); }}
                            style={{
                              padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none',
                              fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Eye size={14} /> View detail
                          </button>

                          <button
                            onClick={() => {
                              setEditBatch(batch)
                              setEditName(batch.name)
                              setEditAcademicLevel(batch.academicLevel)
                              setEditBranchId(batch.branchId || '')
                              setEditDescription(batch.description || '')
                              setOpenMenuId(null)
                            }}
                            style={{
                              padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none',
                              fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Edit size={14} /> Edit batch
                          </button>

                          <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.25rem 0' }} />

                          <button
                            onClick={() => { handleDeleteBatch(batch); setOpenMenuId(null); }}
                            style={{
                              padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none',
                              fontSize: '0.85rem', fontWeight: 800, color: '#dc2626', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Trash2 size={14} /> Delete batch
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {!loading && batches.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                    No batches found. Click <strong>"+ New batch"</strong> above to create your first intake.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW BATCH MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e' }}>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Layers size={24} color="#00c853" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Create batch</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 600 }}>
              Add a new academic batch intake to your institution.
            </p>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Batch name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Cambridge AS 2026, Grade 11 Biology"
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Academic level</label>
                <select 
                  className="input-field" 
                  value={academicLevel} 
                  onChange={e => setAcademicLevel(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="O Level">O Level</option>
                  <option value="AS Level">AS Level</option>
                  <option value="A Level">A Level</option>
                  <option value="Grade 11">Grade 11</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Branch</label>
                <select 
                  className="input-field" 
                  value={branchId} 
                  onChange={e => setBranchId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="">Global (No specific branch)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>📍 {b.name} ({b.type || 'Physical'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Description (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Full-time morning session for 2026 intake"
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px' }}
                />
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
                  disabled={submitting}
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
                  {submitting ? 'Creating...' : 'Create batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL */}
      {editBatch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e' }}>
            <button 
              onClick={() => setEditBatch(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Edit size={22} color="#2979ff" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Edit batch</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 600 }}>
              Update batch details and branch assignment.
            </p>

            <form onSubmit={handleEditBatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Batch name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Academic level</label>
                <select 
                  className="input-field" 
                  value={editAcademicLevel} 
                  onChange={e => setEditAcademicLevel(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="O Level">O Level</option>
                  <option value="AS Level">AS Level</option>
                  <option value="A Level">A Level</option>
                  <option value="Grade 11">Grade 11</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Branch</label>
                <select 
                  className="input-field" 
                  value={editBranchId} 
                  onChange={e => setEditBranchId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="">Global (No specific branch)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>📍 {b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Description (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editDescription} 
                  onChange={e => setEditDescription(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setEditBatch(null)}
                  style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
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
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
