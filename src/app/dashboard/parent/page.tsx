import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function ParentDashboard() {
  const session = await getSession()
  if (!session) return null

  // Fetch parent profile and included children with their user data
  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          user: true
        }
      }
    }
  })

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>My Children</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {parentProfile?.children.map((child) => (
          <div key={child.id} className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>{child.user.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Email:</span>
                <div style={{ fontWeight: 500 }}>{child.user.email}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Payment Status:</span>
                <div style={{ 
                  display: 'inline-block',
                  marginTop: '0.25rem',
                  padding: '0.25rem 0.75rem', 
                  borderRadius: 'var(--radius-full)', 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  backgroundColor: child.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: child.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)'
                }}>
                  {child.paymentStatus || 'Pending'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href={`/dashboard/parent/children/${child.userId}`} className="btn-primary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
                📊 View Academic Report
              </Link>
              <Link href={`/dashboard/parent/children/${child.userId}/calendar`} className="btn-secondary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
                📅 View Lesson Plan
              </Link>
            </div>
          </div>
        ))}
        {(!parentProfile || parentProfile.children.length === 0) && (
          <p style={{ color: 'var(--text-secondary)' }}>No children profiles linked to your account.</p>
        )}
      </div>
    </div>
  )
}
