'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  DashboardIcon, 
  QuizzesIcon, 
  MessagesIcon, 
  BuzzerIcon, 
  RoughFilter 
} from './HandDrawnIcons'

interface SidebarProps { role: string }

const NAV_ICON: Record<string, React.ReactNode> = {
  'Dashboard': <DashboardIcon />,
  'Quizzes': <QuizzesIcon />,
  'Messages': <MessagesIcon />,
  'Buzzer Quiz': <BuzzerIcon />,
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const NavLink = ({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) => {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link href={href} className={`nav-link ${active ? 'active' : ''}`}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
          {NAV_ICON[label] || '•'}
        </span>
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <aside className="sidebar" style={{ 
      borderRight: '3px solid var(--text-primary)', 
      background: 'rgba(2, 6, 23, 0.95)',
      boxShadow: '10px 0 0 rgba(0,0,0,0.05)',
      filter: 'url(#rough-edge)'
    }}>
      <RoughFilter />
      {/* Brand */}
      <div style={{ padding: '1rem 0.5rem', marginBottom: '3rem' }}>
        <div style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: '2.5rem', 
          fontWeight: 900, 
          color: 'white', 
          lineHeight: 1, 
          letterSpacing: '-0.05em',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <span style={{ 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--dna-blue))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(3px 3px 0 var(--text-primary))',
            position: 'relative'
          }}>
            HELIX
          </span>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900, marginTop: '8px', borderTop: '2px solid var(--accent-primary)', paddingTop: '4px', width: 'fit-content' }}>
            {role.replace('_', ' ')} Portal
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(16,185,129,0.15)', marginBottom: '1rem' }} />

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {role === 'SUPER_ADMIN' && (<>
          <NavLink href="/dashboard/super-admin" label="Overview" exact />
          <NavLink href="/dashboard/super-admin/branches" label="Branches" />
          <NavLink href="/dashboard/super-admin/users" label="Users" />
          <NavLink href="/dashboard/super-admin/batches" label="Batches & Intakes" />
          <NavLink href="/dashboard/super-admin/students" label="Student Import" />
          <NavLink href="/dashboard/super-admin/security" label="Security Alerts" />
        </>)}

        {role === 'TEACHER' && (<>
          <NavLink href="/dashboard/teacher" label="My Classes" exact />
          <NavLink href="/dashboard/teacher/attendance" label="Attendance" />
          <NavLink href="/dashboard/teacher/messages" label="Messages" />
        </>)}

        {role === 'STUDENT' && (<>
          <NavLink href="/dashboard/student" label="Dashboard" exact />
          <NavLink href="/dashboard/student/quizzes" label="Quizzes" />
          <NavLink href="/dashboard/student/messages" label="Messages" />
          <NavLink href="/dashboard/student/buzzer" label="Buzzer Quiz" />
        </>)}

        {role === 'PARENT' && (<>
          <NavLink href="/dashboard/parent" label="Children Overview" exact />
        </>)}
      </nav>

      {/* Sign Out */}
      <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', paddingTop: '1rem', marginTop: 'auto' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            color: 'rgba(252,165,165,0.85)', fontWeight: 500, fontSize: '0.9rem',
            transition: 'all 0.18s',
            background: 'transparent',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
