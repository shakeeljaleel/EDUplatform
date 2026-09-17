'use client'

import { useState } from 'react'
import { GraduationCap, Clock } from '@/components/Icons'
import StudentBatchEnrollmentModal from '@/components/StudentBatchEnrollmentModal'
import StatusBadge from '@/components/StatusBadge'

interface StudentBatchHeaderBannerProps {
  currentBatch?: {
    id: string
    name: string
    academicLevel: string
    branch?: { name: string; location?: string | null } | null
  } | null
  enrollments?: any[]
}

export default function StudentBatchHeaderBanner({ currentBatch, enrollments = [] }: StudentBatchHeaderBannerProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const refreshPage = () => {
    window.location.reload()
  }

  // Deduplicate enrolments by batch + branch for status bar display
  const batchBranchMap = new Map<string, any>()
  enrollments.forEach(e => {
    const key = `${e.batchId}_${e.branchId}`
    if (!batchBranchMap.has(key)) {
      batchBranchMap.set(key, e)
    } else {
      // Prioritize active > admin_approved > pending > rejected
      const existing = batchBranchMap.get(key)
      const rank = (s: string) => s === 'active' ? 4 : s === 'admin_approved' ? 3 : s === 'pending' ? 2 : 1
      if (rank(e.status) > rank(existing.status)) {
        batchBranchMap.set(key, e)
      }
    }
  })

  const batchStatusItems = Array.from(batchBranchMap.values())

  return (
    <>
      <div 
        className="card" 
        style={{
          marginBottom: '2rem', padding: '1.5rem 2rem',
          background: '#0f172a', color: 'white', borderRadius: '16px',
          border: '3px solid #1a1a2e', boxShadow: '5px 5px 0px #1a1a2e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
            <GraduationCap size={26} color="#10b981" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900, color: '#10b981', marginBottom: '0.4rem' }}>
              Academic Batch & Enrolment Status
            </div>

            {batchStatusItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {batchStatusItems.map(item => (
                  <div key={`${item.batchId}_${item.branchId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', margin: 0 }}>
                      {item.batch?.name}
                    </h2>
                    {item.batch?.academicLevel && (
                      <span className="badge badge-level" style={{ fontWeight: 800 }}>{item.batch.academicLevel}</span>
                    )}
                    {item.branch && (
                      <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1.5px solid #3b82f6', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '50px', fontSize: '0.75rem' }}>
                        📍 {item.branch.name}
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {item.status === 'pending' && <Clock size={16} color="#ffab00" />}
                      <StatusBadge status={item.status} useFullLabel={true} size="sm" />
                    </div>
                    {item.status === 'rejected' && item.rejectionReason && (
                      <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>
                        ({item.rejectionReason})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : currentBatch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', margin: 0 }}>
                  {currentBatch.name}
                </h2>
                <span className="badge badge-level" style={{ fontWeight: 800 }}>{currentBatch.academicLevel}</span>
                {currentBatch.branch && (
                  <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1.5px solid #3b82f6', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '50px', fontSize: '0.75rem' }}>
                    📍 {currentBatch.branch.name}
                  </span>
                )}
                <StatusBadge status="active" size="sm" />
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffab00', margin: 0 }}>
                  Not Enrolled in a Batch Yet
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0', fontWeight: 600 }}>
                  Enrol in an active batch to access course materials, live quizzes, and class schedules.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#2979ff',
            color: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '50px',
            boxShadow: '4px 4px 0px #1a1a2e',
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
        >
          <GraduationCap size={18} color="#ffffff" />
          {batchStatusItems.length > 0 ? 'Switch / Enrol in batch' : '🎓 Enrol in a batch'}
        </button>
      </div>

      <StudentBatchEnrollmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refreshPage}
      />
    </>
  )
}
