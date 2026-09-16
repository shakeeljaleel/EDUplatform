'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'
import ToastContainer from '@/components/ToastContainer'
import DnaHelixLogo from '@/components/DnaHelixLogo'

interface DashboardShellProps {
  user: {
    id: string
    name: string
    role: string
  }
  children: React.ReactNode
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Greeting header should only show on main Overview/Dashboard pages
  const isOverview = pathname === '/dashboard/super-admin' || 
                     pathname === '/dashboard/teacher' || 
                     pathname === '/dashboard/student' || 
                     pathname === '/dashboard/parent'

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 50%, #fdf4ff 100%)' }}>
      <ToastContainer />

      {/* Mobile Header Bar */}
      <div className="mobile-header-bar" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.25rem',
        background: '#1a1a2e',
        color: 'white',
        borderBottom: '3px solid #1a1a2e',
        position: 'sticky',
        top: 0,
        zIndex: 990
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>
          <DnaHelixLogo />
          <span style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HELIX
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NotificationBell />
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', background: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: '0.875rem'
          }}>
            {user.name.charAt(0)}
          </div>
        </div>
      </div>

      <Sidebar role={user.role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content" style={{ flex: 1, minWidth: 0, padding: '2rem' }}>
        <div className="content-wrapper" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <header className="desktop-dashboard-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
            position: 'relative',
            zIndex: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(15, 23, 42, 0.06)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#0f172a',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                aria-label="Toggle menu"
                title="Toggle sidebar navigation"
              >
                ☰
              </button>

              <div style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 900, 
                fontSize: '1.5rem', 
                background: 'linear-gradient(135deg, #10b981, #3b82f6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em'
              }}>
                HELIX
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <NotificationBell />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '50%', background: '#10b981', 
                  border: '2px solid #ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white'
                }}>
                  {user.name.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{user.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.role.replace('_', ' ')}</span>
                </div>
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

