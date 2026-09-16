'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, Building2, BookOpen, Check, X, Layers } from '@/components/Icons'
import { showToast } from '@/components/ToastContainer'

interface StudentBatchEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function StudentBatchEnrollmentModal({ isOpen, onClose, onSuccess }: StudentBatchEnrollmentModalProps) {
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchBatches()
    }
  }, [isOpen])

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/students/enroll-batch')
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch (err) {
      showToast('Failed to load available batches', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (batchId: string, batchName: string) => {
    setEnrollingId(batchId)
    try {
      const res = await fetch('/api/students/enroll-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      })

      if (res.ok) {
        showToast(`Successfully enrolled in ${batchName}!`, 'success')
        onSuccess()
        onClose()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to enroll in batch', 'error')
      }
    } catch (err) {
      showToast('Network error while enrolling in batch', 'error')
    } finally {
      setEnrollingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }}>
      <div 
        className="card" 
        style={{
          width: '100%', maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          padding: 0, overflow: 'hidden', border: '2px solid var(--accent-primary)', position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.5rem 2rem', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <GraduationCap size={28} color="#10b981" />
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: 'white' }}>Batch Enrollment Directory</h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, marginTop: '0.15rem' }}>Select an active academic batch to enroll in and join your classroom.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div className="pulse" style={{ textAlign: 'center', padding: '3rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
              Loading active academic batches...
            </div>
          )}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {batches.map(batch => (
                <div 
                  key={batch.id}
                  style={{
                    padding: '1.25rem 1.5rem', borderRadius: '12px',
                    backgroundColor: batch.isEnrolled ? '#f0fdf4' : 'var(--bg-secondary)',
                    border: batch.isEnrolled ? '2px solid #10b981' : '1px solid var(--bg-tertiary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                      <span className="badge badge-level" style={{ fontWeight: 800 }}>{batch.academicLevel}</span>
                      {batch.branch && (
                        <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #3b82f6', fontWeight: 800 }}>
                          📍 {batch.branch.name}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                      {batch.name}
                    </h3>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      <span>📚 {batch.subjects?.length || 0} Subjects offered</span>
                      <span>•</span>
                      <span>👥 {batch._count?.enrollments || 0} Enrolled Students</span>
                    </div>

                    {batch.subjects && batch.subjects.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem' }}>
                        {batch.subjects.slice(0, 4).map((s: any) => (
                          <span key={s.id} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'var(--bg-tertiary)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {batch.isEnrolled ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1.25rem', borderRadius: '10px', background: '#10b981', color: 'white', fontWeight: 800, fontSize: '0.875rem' }}>
                        <Check size={16} /> Enrolled
                      </span>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => handleEnroll(batch.id, batch.name)}
                        disabled={enrollingId === batch.id}
                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, whiteSpace: 'nowrap' }}
                      >
                        {enrollingId === batch.id ? 'Enrolling...' : 'Enroll Now'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {batches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  No active batches available for enrollment right now.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '1rem 2rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}>
            Close Directory
          </button>
        </div>
      </div>
    </div>
  )
}
