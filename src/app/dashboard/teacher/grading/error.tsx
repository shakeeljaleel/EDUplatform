'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'

export default function GradingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Grading Page Error:', error)
  }, [error])

  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <div style={{
        border: '3px solid #1a1a2e',
        borderRadius: '16px',
        boxShadow: '6px 6px 0px #1a1a2e',
        background: '#ffffff',
        padding: '3rem 2rem'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤖</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.75rem' }}>
          Grading Hub Error
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600, marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
          We encountered an issue loading your AI grading hub. This may be due to a temporary database or configuration disconnect.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              background: '#aa00ff',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '50px',
              boxShadow: '4px 4px 0px #1a1a2e',
              padding: '0.75rem 1.75rem',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            🔄 Try again
          </button>
          <Link
            href="/dashboard/teacher"
            style={{
              background: '#ffffff',
              color: '#1a1a2e',
              border: '3px solid #1a1a2e',
              borderRadius: '50px',
              boxShadow: '4px 4px 0px #1a1a2e',
              padding: '0.75rem 1.75rem',
              fontWeight: 900,
              fontSize: '0.95rem',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
