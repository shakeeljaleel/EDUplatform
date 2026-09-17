'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Plus, X, Layers, Eye, Edit, Trash2, Archive } from '@/components/Icons'
import { showToast } from '@/components/ToastContainer'
import { getAcademicLevelColor } from '@/lib/subjectColors'

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Create Batch Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [academicLevel, setAcademicLevel] = useState('O Level')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit Batch Modal state
  const [editBatch, setEditBatch] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editAcademicLevel, setEditAcademicLevel] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // 3-Dot Dropdown Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchBatches()
  }, [])

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
          description: description.trim() || undefined
        })
      })
      
      if (res.ok) {
        showToast(`Batch "${name}" created successfully`, 'success')
        setName('')
        setAcademicLevel('O Level')
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

  const handleToggleArchive = async (batchItem: any) => {
    const newStatus = batchItem.status === 'archived' ? 'active' : 'archived'
    try {
      const res = await fetch(`/api/batches/${batchItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        showToast(`Batch "${batchItem.name}" set to ${newStatus}`, 'success')
        fetchBatches()
      }
    } catch {
      showToast('Error updating batch status', 'error')
    }
  }

  const handleDeleteBatch = async (batchItem: any) => {
    const confirmInput = prompt(`Type "${batchItem.name}" to confirm irreversible deletion of this batch:`)
    if (confirmInput !== batchItem.name) {
      if (confirmInput !== null) showToast('Batch name did not match confirmation', 'error')
      return
    }

    try {
      const res = await fetch(`/api/batches/${batchItem.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: confirmInput })
      })
      if (res.ok) {
        showToast(`Batch "${batchItem.name}" deleted permanently`, 'success')
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
      <Breadcrumbs items={[{ label: 'Batches' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Batches
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', margin: 0 }}>
            Academic class groups running across physical and online locations.
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

      {/* Full Width Table View */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e' }}>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '3px solid #1a1a2e', textAlign: 'left' }}>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Batch name</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Academic level</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Branches count</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Students count</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Subjects count</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase' }}>Created date</th>
                <th style={{ padding: '1.1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => {
                const levelColor = getAcademicLevelColor(batch.academicLevel)
                const subjectCount = batch.subjectsCount || 0
                const branchCount = batch.branchesCount || 0
                const studentCount = batch.studentsCount || 0

                return (
                  <tr 
                    key={batch.id} 
                    onClick={() => router.push(`/dashboard/super-admin/batches/${batch.id}`)}
                    style={{
                      borderBottom: '2px solid #1a1a2e',
                      borderLeft: `8px solid ${levelColor}`,
                      cursor: 'pointer',
                      background: batch.status === 'archived' ? '#f8fafc' : '#ffffff',
                      opacity: batch.status === 'archived' ? 0.75 : 1,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(240, 249, 255, 0.7)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = batch.status === 'archived' ? '#f8fafc' : '#ffffff'}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{batch.name}</span>
                        {batch.status === 'archived' && (
                          <span style={{ fontSize: '0.7rem', background: '#cbd5e1', color: '#334155', padding: '0.15rem 0.5rem', borderRadius: '50px', fontWeight: 800 }}>Archived</span>
                        )}
                      </div>
                      {batch.description && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>{batch.description}</div>
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
                        border: '2px solid #1a1a2e',
                        boxShadow: '2px 2px 0px #1a1a2e',
                        display: 'inline-block'
                      }}>
                        {batch.academicLevel}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      📍 {branchCount} {branchCount === 1 ? 'branch' : 'branches'}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      👥 {studentCount} {studentCount === 1 ? 'student' : 'students'}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          background: subjectCount === 0 ? '#ffebee' : '#e8f5e9',
                          color: subjectCount === 0 ? '#c62828' : '#2e7d32',
                          border: subjectCount === 0 ? '2px solid #c62828' : '2px solid #2e7d32',
                          boxShadow: '2px 2px 0px #1a1a2e',
                          borderRadius: '50px',
                          padding: '0.35rem 0.85rem',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        📚 {subjectCount} {subjectCount === 1 ? 'subject' : 'subjects'}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions Three-Dot Menu */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === batch.id ? null : batch.id)}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50px', border: '2px solid #1a1a2e',
                          background: '#ffffff', color: '#1a1a2e', fontSize: '1rem', fontWeight: 900,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          boxShadow: '2px 2px 0px #1a1a2e'
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
                            width: '170px', backgroundColor: '#ffffff', borderRadius: '12px',
                            border: '3px solid #1a1a2e', boxShadow: '5px 5px 0px #1a1a2e',
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
                            <Eye size={14} /> View batch
                          </button>

                          <button
                            onClick={() => {
                              setEditBatch(batch)
                              setEditName(batch.name)
                              setEditAcademicLevel(batch.academicLevel)
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

                          <button
                            onClick={() => { handleToggleArchive(batch); setOpenMenuId(null); }}
                            style={{
                              padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none',
                              fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Archive size={14} /> {batch.status === 'archived' ? 'Unarchive' : 'Archive'}
                          </button>

                          <div style={{ height: '2px', backgroundColor: '#1a1a2e', margin: '0.25rem 0' }} />

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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                    No batches created yet. Click <strong>"+ New batch"</strong> above to create your first academic class group.
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
              Add a new academic class group intake.
            </p>

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Batch name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Cambridge A Level 2026, Grade 11 Science"
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Academic level</label>
                <select 
                  className="input-field" 
                  value={academicLevel} 
                  onChange={e => setAcademicLevel(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                >
                  <option value="A Level">A Level (#aa00ff)</option>
                  <option value="AS Level">AS Level (#2979ff)</option>
                  <option value="O Level">O Level (#00c853)</option>
                  <option value="Grade 11">Grade 11 (#ff6d00)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Description (Optional)</label>
                <textarea 
                  className="input-field" 
                  placeholder="e.g. Cambridge A Level intake running at multiple branches"
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ width: '100%', minHeight: '80px', border: '2px solid #1a1a2e', padding: '0.6rem' }}
                />
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
              Update batch details.
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
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Academic level</label>
                <select 
                  className="input-field" 
                  value={editAcademicLevel} 
                  onChange={e => setEditAcademicLevel(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                >
                  <option value="A Level">A Level (#aa00ff)</option>
                  <option value="AS Level">AS Level (#2979ff)</option>
                  <option value="O Level">O Level (#00c853)</option>
                  <option value="Grade 11">Grade 11 (#ff6d00)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Description</label>
                <textarea 
                  className="input-field" 
                  value={editDescription} 
                  onChange={e => setEditDescription(e.target.value)} 
                  style={{ width: '100%', minHeight: '80px', border: '2px solid #1a1a2e', padding: '0.6rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setEditBatch(null)}
                  style={{ padding: '0.65rem 1.25rem', fontWeight: 800, borderRadius: '50px', border: '3px solid #1a1a2e' }}
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
