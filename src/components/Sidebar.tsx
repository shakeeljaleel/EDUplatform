'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  MessageSquare,
  Users,
  Building2,
  Layers,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  LogOut,
  X
} from '@/components/Icons'

interface SidebarProps {
  role: string
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const NavLink = ({ href, label, icon, exact = false }: { href: string; label: string; icon: React.ReactNode; exact?: boolean }) => {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        href={href}
        onClick={() => onClose && onClose()}
        className={`nav-link ${active ? 'active' : ''}`}
        style={{
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          color: active ? '#ffffff' : '#94a3b8',
          background: active ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
          borderLeft: active ? '4px solid #10b981' : '4px solid transparent',
          fontWeight: active ? 800 : 600,
          fontSize: '0.9rem',
          transition: 'all 0.2s ease',
          textDecoration: 'none'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#10b981' : '#94a3b8' }}>
          {icon}
        </span>
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`} style={{
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
      }}>
        
        {/* Brand Header & Mobile Close */}
        <div style={{ padding: '0.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.25rem',
              fontWeight: 900,
              color: 'white',
              lineHeight: 1,
              letterSpacing: '-0.05em'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                HELIX
              </span>
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: '#10b981',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontWeight: 800,
              marginTop: '6px'
            }}>
              {role.replace('_', ' ')} PORTAL
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '1.5rem' }} />

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {role === 'SUPER_ADMIN' && (<>
            <NavLink href="/dashboard/super-admin" label="Overview" icon={<LayoutDashboard size={20} />} exact />
            <NavLink href="/dashboard/super-admin/users" label="User Management" icon={<Users size={20} />} />
            <NavLink href="/dashboard/super-admin/branches" label="Branches" icon={<Building2 size={20} />} />
            <NavLink href="/dashboard/super-admin/batches" label="Batches & Intakes" icon={<Layers size={20} />} />
            <NavLink href="/dashboard/super-admin/students" label="Student Import" icon={<GraduationCap size={20} />} />
            <NavLink href="/dashboard/super-admin/security" label="Security Alerts" icon={<ShieldAlert size={20} />} />
          </>)}

          {role === 'TEACHER' && (<>
            <NavLink href="/dashboard/teacher" label="My Classes" icon={<BookOpen size={20} />} exact />
            <NavLink href="/dashboard/teacher/attendance" label="Attendance" icon={<CheckSquare size={20} />} />
            <NavLink href="/dashboard/teacher/messages" label="Messages" icon={<MessageSquare size={20} />} />
          </>)}

          {role === 'STUDENT' && (<>
            <NavLink href="/dashboard/student" label="Dashboard" icon={<LayoutDashboard size={20} />} exact />
            <NavLink href="/dashboard/student/quizzes" label="Quizzes" icon={<CheckSquare size={20} />} />
            <NavLink href="/dashboard/student/messages" label="Messages" icon={<MessageSquare size={20} />} />
            <NavLink href="/dashboard/student/buzzer" label="Buzzer Quiz" icon={<Sparkles size={20} />} />
          </>)}

          {role === 'PARENT' && (<>
            <NavLink href="/dashboard/parent" label="Children Overview" icon={<Users size={20} />} exact />
          </>)}
        </nav>

        {/* Sign Out Button */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: 'auto' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#f87171',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={20} color="#f87171" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
