import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'
import { RoughFilter } from '@/components/HandDrawnIcons'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="dashboard-layout">
      <Sidebar role={session.user.role} />
      <main className="main-content">
        <RoughFilter />
        <div className="content-wrapper">
          <header style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '3.5rem',
            paddingBottom: '2rem',
            borderBottom: '3px solid var(--text-primary)',
            position: 'relative',
            zIndex: 20
          }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                Welcome, {session.user.name.split(' ')[0]} 🌿
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 600 }}>
                Ready to explore the helix today?
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <NotificationBell />
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-primary)', 
                border: '2px solid var(--text-primary)', boxShadow: '4px 4px 0 var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white'
              }}>
                {session.user.name.charAt(0)}
              </div>
            </div>
          </header>
          <div className="fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
