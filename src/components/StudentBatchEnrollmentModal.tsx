'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, Building2, BookOpen, Check, X, ArrowLeft } from '@/components/Icons'
import { showToast } from '@/components/ToastContainer'
import { getAcademicLevelColor } from '@/lib/subjectColors'

interface StudentBatchEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function StudentBatchEnrollmentModal({ isOpen, onClose, onSuccess }: StudentBatchEnrollmentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Selected values across 3 steps
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [existingEnrollments, setExistingEnrollments] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedBatch(null)
      setSelectedBranch(null)
      setSelectedSubjectIds([])
      setAvailableSubjects([])
      fetchBatches()
      fetchExistingEnrollments()
    }
  }, [isOpen])

  useEffect(() => {
    if (step === 3 && selectedBatch && selectedBranch) {
      fetchAvailableSubjects(selectedBatch.id, selectedBranch.id)
    }
  }, [step, selectedBatch, selectedBranch])

  const fetchExistingEnrollments = async () => {
    try {
      const res = await fetch('/api/student-enrollments')
      if (res.ok) {
        const data = await res.json()
        setExistingEnrollments(data.enrollments || [])
      }
    } catch {}
  }

  const fetchAvailableSubjects = async (batchId: string, branchId: string) => {
    setLoadingSubjects(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/subjects?branchId=${branchId}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableSubjects(data.subjects || [])
      } else {
        setAvailableSubjects([])
      }
    } catch {
      showToast('Failed to load subjects for selected branch', 'error')
      setAvailableSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/batches')
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch {
      showToast('Failed to load available batches', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Step 1 -> Step 2 or 3
  const handleSelectBatch = (batch: any) => {
    setSelectedBatch(batch)
    if (batch.branches && batch.branches.length > 1) {
      setStep(2)
    } else if (batch.branches && batch.branches.length === 1) {
      setSelectedBranch(batch.branches[0])
      setStep(3)
    } else {
      showToast('This batch has no active branches assigned', 'error')
    }
  }

  // Step 2 -> Step 3
  const handleSelectBranch = (branch: any) => {
    setSelectedBranch(branch)
    setStep(3)
  }

  // Subject Toggle in Step 3
  const toggleSubject = (subId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    )
  }

  // Final Submit
  const handleSubmitEnrollment = async () => {
    if (!selectedBatch || !selectedBranch || selectedSubjectIds.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          branchId: selectedBranch.id,
          subjectIds: selectedSubjectIds
        })
      })

      if (res.ok) {
        showToast('Enrolment request submitted! Pending admin approval.', 'success')
        onSuccess()
        onClose()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to request enrolment', 'error')
      }
    } catch {
      showToast('Network error submitting enrolment', 'error')
    } finally {
      setSubmitting(false)
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
          padding: 0, overflow: 'hidden', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '6px 6px 0px #1a1a2e'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', background: '#1a1a2e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <GraduationCap size={28} color="#00c853" />
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: 'white' }}>Subject Enrolment Request</h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, marginTop: '0.15rem', fontWeight: 700 }}>
                Step {step} of 3: {step === 1 ? 'Select Batch' : step === 2 ? 'Select Branch' : 'Select Subject(s)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div className="pulse" style={{ textAlign: 'center', padding: '3rem', fontWeight: 800, color: '#64748b' }}>
              Loading available directory...
            </div>
          )}

          {!loading && step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Step 1: Select Academic Batch
              </h3>
              {batches.map(batch => {
                const levelColor = getAcademicLevelColor(batch.academicLevel)

                return (
                  <div 
                    key={batch.id}
                    onClick={() => handleSelectBatch(batch)}
                    style={{
                      padding: '1.25rem 1.5rem',
                      borderRadius: '12px',
                      border: '3px solid #1a1a2e',
                      borderLeft: `8px solid ${levelColor}`,
                      boxShadow: '4px 4px 0px #1a1a2e',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <span style={{
                        background: levelColor,
                        color: '#ffffff',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        display: 'inline-block',
                        marginBottom: '0.35rem'
                      }}>
                        {batch.academicLevel}
                      </span>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                        {batch.name}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginTop: '0.35rem' }}>
                        📍 Runs at {batch.branchesCount || 0} branches • 📚 {batch.subjectsCount || 0} subjects
                      </div>
                    </div>

                    <button style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      background: '#00c853',
                      color: '#ffffff',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      cursor: 'pointer'
                    }}>
                      Select →
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && step === 2 && selectedBatch && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <button
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', alignSelf: 'flex-start' }}
              >
                <ArrowLeft size={16} /> Change Batch ({selectedBatch.name})
              </button>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Step 2: Select Branch for {selectedBatch.name}
              </h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {selectedBatch.branches?.map((branch: any) => (
                  <button
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch)}
                    style={{
                      padding: '1rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: 900,
                      background: branch.colour || '#2979ff',
                      color: '#ffffff',
                      border: '3px solid #1a1a2e',
                      borderRadius: '50px',
                      boxShadow: '4px 4px 0px #1a1a2e',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    📍 {branch.name} ({branch.type})
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && step === 3 && selectedBatch && selectedBranch && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setStep(selectedBatch.branches.length > 1 ? 2 : 1)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Step 3: Select Subject(s) available at {selectedBranch.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
                  Select the subjects you want to enroll in for {selectedBatch.name} at {selectedBranch.name}.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loadingSubjects ? (
                  <div className="pulse" style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 800 }}>
                    Loading available subjects for {selectedBranch.name}...
                  </div>
                ) : (
                  <>
                    {availableSubjects.map((sub: any) => {
                      const isChecked = selectedSubjectIds.includes(sub.id)
                      const existing = existingEnrollments.find(e => e.subjectId === sub.id && e.branchId === selectedBranch.id)

                      const isPending = existing?.status === 'pending'
                      const isAdminApproved = existing?.status === 'admin_approved'
                      const isActive = existing?.status === 'active'
                      const isRejected = existing?.status === 'rejected'

                      const isDisabled = isPending || isAdminApproved || isActive

                      return (
                        <div
                          key={sub.id}
                          style={{
                            padding: '1rem 1.25rem',
                            borderRadius: '12px',
                            border: '3px solid #1a1a2e',
                            boxShadow: '3px 3px 0px #1a1a2e',
                            background: isDisabled ? '#f8fafc' : isChecked ? '#e8f5e9' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            opacity: isDisabled ? 0.85 : 1,
                            gap: '1rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={isChecked || isDisabled}
                              disabled={isDisabled}
                              onChange={() => !isDisabled && toggleSubject(sub.id)}
                              style={{ width: '20px', height: '20px', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                            />
                            <div>
                              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                                📚 {sub.name}
                              </div>
                              {sub.description && (
                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{sub.description}</div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {isPending && (
                              <span style={{
                                background: '#ffab00',
                                color: '#ffffff',
                                border: '1.5px solid #1a1a2e',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '50px',
                                fontSize: '0.75rem',
                                fontWeight: 900
                              }}>
                                Already requested — awaiting approval
                              </span>
                            )}

                            {isAdminApproved && (
                              <span style={{
                                background: '#2979ff',
                                color: '#ffffff',
                                border: '1.5px solid #1a1a2e',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '50px',
                                fontSize: '0.75rem',
                                fontWeight: 900
                              }}>
                                Approved by admin — awaiting teacher
                              </span>
                            )}

                            {isActive && (
                              <span style={{
                                background: '#00c853',
                                color: '#ffffff',
                                border: '1.5px solid #1a1a2e',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '50px',
                                fontSize: '0.75rem',
                                fontWeight: 900
                              }}>
                                ✓ Already enrolled
                              </span>
                            )}

                            {isRejected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  background: '#f50057',
                                  color: '#ffffff',
                                  border: '1.5px solid #1a1a2e',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '50px',
                                  fontSize: '0.75rem',
                                  fontWeight: 900
                                }}>
                                  Previously rejected — {existing.rejectionReason || 'Criteria not met'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleSubject(sub.id)}
                                  style={{
                                    background: isChecked ? '#00c853' : '#ffffff',
                                    color: isChecked ? '#ffffff' : '#1a1a2e',
                                    border: '1.5px solid #1a1a2e',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '50px',
                                    fontSize: '0.7rem',
                                    fontWeight: 900,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isChecked ? '✓ Selected' : 'Request again'}
                                </button>
                              </div>
                            )}

                            {!existing && (
                              <span style={{
                                background: sub.colour || '#2979ff',
                                color: '#ffffff',
                                border: '1.5px solid #1a1a2e',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '50px',
                                fontSize: '0.75rem',
                                fontWeight: 900
                              }}>
                                {sub.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {availableSubjects.length === 0 && (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                        No subjects available in this batch at {selectedBranch.name} yet.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 2rem', background: '#f8fafc', borderTop: '3px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={onClose} style={{ borderRadius: '50px', border: '3px solid #1a1a2e', fontWeight: 800 }}>
            Cancel
          </button>

          {step === 3 && (
            <button
              onClick={handleSubmitEnrollment}
              disabled={submitting || selectedSubjectIds.length === 0}
              style={{
                padding: '0.65rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 900,
                background: '#00c853',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
                borderRadius: '50px',
                cursor: 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit enrolment request'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
