'use client'

export default function RootLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'sans-serif',
          fontSize: '2.5rem',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #10b981, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          letterSpacing: '-0.05em'
        }}>
          HELIX
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
