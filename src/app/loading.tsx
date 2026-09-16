'use client'

import DnaHelixLogo from '@/components/DnaHelixLogo'

export default function RootLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'sans-serif',
          fontSize: '2.5rem',
          fontWeight: 900,
          marginBottom: '1rem',
          letterSpacing: '-0.05em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem'
        }}>
          <DnaHelixLogo style={{ width: '40px', height: '50px' }} />
          <span style={{
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            HELIX
          </span>
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto',
          border: '4px solid rgba(16, 185, 129, 0.2)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
