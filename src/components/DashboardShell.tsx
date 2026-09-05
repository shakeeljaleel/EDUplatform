'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'
import ToastContainer from '@/components/ToastContainer'

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

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <ToastContainer />

      {/* Mobile Header Bar */}
      <div className="mobile-header-bar" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.25rem',
        background: '#020617',
        color: 'white',
        borderBottom: '2px solid #10b981',
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

        <div style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HELIX
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
            marginBottom: '2rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid #e2e8f0',
            position: 'relative',
            zIndex: 20
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                  Welcome back, {user.name.split(' ')[0]} 👋
                </h1>
                <span className="badge" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', background: '#f0fdf4', color: '#059669', border: '1px solid #10b981', fontWeight: 800, borderRadius: '9999px' }}>
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <p style={{ color: '#475569', fontWeight: 600, fontSize: '0.95rem' }}>
                Ready to explore your academic hub today?
              </p>
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
