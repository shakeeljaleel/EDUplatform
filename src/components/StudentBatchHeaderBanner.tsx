'use client'

import { useState } from 'react'
import { GraduationCap, Building2, Plus } from '@/components/Icons'
import StudentBatchEnrollmentModal from '@/components/StudentBatchEnrollmentModal'

interface StudentBatchHeaderBannerProps {
  currentBatch: {
    id: string
    name: string
    academicLevel: string
    branch?: { name: string; location?: string | null } | null
  } | null
}

export default function StudentBatchHeaderBanner({ currentBatch }: StudentBatchHeaderBannerProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const refreshPage = () => {
    window.location.reload()
  }

  return (
    <>
      <div 
        className="card" 
        style={{
          marginBottom: '2rem', padding: '1.5rem 2rem',
          background: '#0f172a', color: 'white', borderRadius: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={26} color="#10b981" />
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: '#10b981' }}>
              Academic Batch Status
            </div>

            {currentBatch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', margin: 0 }}>
                  {currentBatch.name}
                </h2>
                <span className="badge badge-level" style={{ fontWeight: 800 }}>{currentBatch.academicLevel}</span>
                {currentBatch.branch && (
                  <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid #3b82f6', fontWeight: 800 }}>
                    📍 {currentBatch.branch.name}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '0.2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b', margin: 0 }}>
                  Not Enrolled in a Batch Yet
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, marginTop: '0.15rem' }}>
                  Enroll in an active batch to access course materials, live quizzes, and class schedules.
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
          {currentBatch ? 'Switch / Enrol in batch' : '🎓 Enrol in a batch'}
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
