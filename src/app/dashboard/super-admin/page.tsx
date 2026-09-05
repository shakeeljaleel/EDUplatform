import { prisma } from '@/lib/prisma'
import { RoughFilter } from '@/components/HandDrawnIcons'

export default async function SuperAdminDashboard() {
  const usersCount = await prisma.user.count()
  const batchesCount = await prisma.batch.count()
  const branchesCount = await prisma.branch.count()
  
  return (
    <div className="content-wrapper fade-in">
      <RoughFilter />
      <div style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Helix Command</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>Global infrastructure and administrative oversight.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
        <div className="premium-card-v2" style={{ borderLeft: '12px solid var(--accent-primary)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Total Ecosystem Users</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>{usersCount}</div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 800 }}>Across all roles & branches</div>
        </div>

        <div className="premium-card-v2" style={{ borderLeft: '12px solid var(--dna-blue)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Active Batches</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: 'var(--dna-blue)' }}>{batchesCount}</div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--dna-blue)', fontWeight: 800 }}>Live academic sequences</div>
        </div>

        <div className="premium-card-v2" style={{ borderLeft: '12px solid var(--dna-pink)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Branch Infrastructure</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: 'var(--dna-pink)' }}>{branchesCount}</div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--dna-pink)', fontWeight: 800 }}>Global physical centers</div>
        </div>
      </div>

      {/* Admin Quick Links or Activity can go here */}
      <div style={{ marginTop: '4rem', padding: '3rem', border: '3px dashed var(--text-primary)', borderRadius: '24px', textAlign: 'center' }}>
        <h3 style={{ fontWeight: 900, color: 'var(--text-secondary)' }}>Administrative Log Terminal</h3>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem' }}>Select a module from the sidebar to manage specific infrastructure nodes.</p>
      </div>
    </div>
  )
}
