export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '1rem 0' }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ width: '220px', height: '32px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '0.5rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '340px', height: '18px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ width: '120px', height: '40px', background: '#e2e8f0', borderRadius: '10px', animation: 'pulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Grid Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '40%', height: '14px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '1rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '60%', height: '36px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '0.75rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '80%', height: '14px', background: '#f8fafc', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
        ))}
      </div>

      {/* Content Block Skeleton */}
      <div style={{ padding: '2rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '30%', height: '24px', background: '#e2e8f0', borderRadius: '6px', marginBottom: '1.5rem', animation: 'pulse 1.5s infinite ease-in-out' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 4].map(i => (
            <div key={i} style={{ height: '60px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
