'use client'

import PendingEnrolmentsSection from '@/components/PendingEnrolmentsSection'

export default function AdminEnrollmentsPage() {
  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          Student Enrolment Requests
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
          Review, approve, or bulk approve pending student enrolments across branches and batches.
        </p>
      </div>

      <PendingEnrolmentsSection />
    </div>
  )
}
