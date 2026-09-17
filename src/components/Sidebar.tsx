'use client'

import { useState, useEffect } from 'react'
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
import DnaHelixLogo from '@/components/DnaHelixLogo'

interface SidebarProps {
  role: string
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [enrollmentStatusInfo, setEnrollmentStatusInfo] = useState<{ pending: number; adminApproved: number }>({ pending: 0, adminApproved: 0 })

  useEffect(() => {
    if (role === 'STUDENT') {
      fetchStudentEnrollments()
    }
  }, [role])

  const fetchStudentEnrollments = async () => {
    try {
      const res = await fetch('/api/student-enrollments')
      if (res.ok) {
        const data = await res.json()
        const enrollments = data.enrollments || []
        const pending = enrollments.filter((e: any) => e.status === 'pending').length
        const adminApproved = enrollments.filter((e: any) => e.status === 'admin_approved').length
        setEnrollmentStatusInfo({ pending, adminApproved })
      }
    } catch {}
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const NavLink = ({ href, label, icon, exact = false }: { href: string; label: string; icon: React.ReactNode; exact?: boolean }) => {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        href={href}
        prefetch={true}
        onClick={() => onClose && onClose()}
        className={`nav-link ${active ? 'active' : ''}`}
        title={isCollapsed ? label : undefined}
        style={{
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '0.75rem',
          padding: isCollapsed ? '0.75rem 0' : '0.75rem 1rem',
          borderRadius: '12px',
          color: active ? '#0f172a' : '#cbd5e1',
          background: active ? '#ffffff' : 'transparent',
          boxShadow: active ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
          fontWeight: active ? 800 : 600,
          fontSize: '0.9rem',
          transition: 'all 0.2s ease',
          textDecoration: 'none'
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
            e.currentTarget.style.color = '#ffffff'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#cbd5e1'
          }
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#00c853' : '#94a3b8' }}>
          {icon}
        </span>
        {!isCollapsed && <span>{label}</span>}
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
        borderRight: '3px solid #1a1a2e',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0.75rem',
        width: isCollapsed ? '80px' : '260px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
        zIndex: 999
      }}>
        
        {/* Brand Header & Collapse Toggle */}
        <div style={{ padding: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center' }}>
          {isCollapsed ? (
            <DnaHelixLogo width={32} height={44} style={{ width: '32px', height: '44px' }} />
          ) : (
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 900,
                color: 'white',
                lineHeight: 1,
                letterSpacing: '-0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <DnaHelixLogo width={32} height={44} style={{ width: '32px', height: '44px' }} />
                <span style={{
                  background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  HELIX
                </span>
              </div>
              <div style={{
                fontSize: '0.6rem',
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 800,
                marginTop: '4px'
              }}>
                {role.replace('_', ' ')}
              </div>

              {role === 'STUDENT' && !isCollapsed && (
                <>
                  {enrollmentStatusInfo.pending > 0 && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#ffab00',
                      color: '#ffffff',
                      border: '1.5px solid #1a1a2e',
                      boxShadow: '2px 2px 0px #1a1a2e',
                      borderRadius: '50px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 900
                    }}>
                      ⏳ {enrollmentStatusInfo.pending} enrolment{enrollmentStatusInfo.pending > 1 ? 's' : ''} pending approval
                    </div>
                  )}

                  {enrollmentStatusInfo.pending === 0 && enrollmentStatusInfo.adminApproved > 0 && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#2979ff',
                      color: '#ffffff',
                      border: '1.5px solid #1a1a2e',
                      boxShadow: '2px 2px 0px #1a1a2e',
                      borderRadius: '50px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 900
                    }}>
                      🔷 {enrollmentStatusInfo.adminApproved} enrolment{enrollmentStatusInfo.adminApproved > 1 ? 's' : ''} awaiting teacher confirmation
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Desktop & Mobile Collapse / Close Toggle */}
          <button
            onClick={() => {
              if (window.innerWidth <= 1024 && onClose) {
                onClose()
              } else {
                setIsCollapsed(!isCollapsed)
              }
            }}
            className="hamburger-btn"
            style={{ color: 'white' }}
            aria-label="Toggle sidebar navigation"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            ☰
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '1.25rem' }} />

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {role === 'SUPER_ADMIN' && (<>
            <NavLink href="/dashboard/super-admin" label="Overview" icon={<LayoutDashboard size={20} />} exact />
            <NavLink href="/dashboard/super-admin/users" label="User Management" icon={<Users size={20} />} />
            <NavLink href="/dashboard/super-admin/batches" label="Batches" icon={<Layers size={20} />} />
            <NavLink href="/dashboard/super-admin/branches" label="Branches" icon={<Building2 size={20} />} />
            <NavLink href="/dashboard/super-admin/students" label="Student Import" icon={<GraduationCap size={20} />} />
            <NavLink href="/dashboard/super-admin/security" label="Security Alerts" icon={<ShieldAlert size={20} />} />
          </>)}

          {role === 'TEACHER' && (<>
            <NavLink href="/dashboard/teacher" label="My Classes" icon={<BookOpen size={20} />} exact />
            <NavLink href="/dashboard/teacher/grading" label="AI Marking & Grader" icon={<Sparkles size={20} />} />
            <NavLink href="/dashboard/teacher/buzzer" label="Live Speed Buzzer" icon={<Sparkles size={20} />} />
            <NavLink href="/dashboard/teacher/forum" label="Discussion Forums" icon={<MessageSquare size={20} />} />
            <NavLink href="/dashboard/teacher/performance" label="Mark Analytics" icon={<Layers size={20} />} />
            <NavLink href="/dashboard/teacher/attendance" label="Attendance Roll Call" icon={<CheckSquare size={20} />} />
            <NavLink href="/dashboard/teacher/messages" label="Messages & Inbox" icon={<MessageSquare size={20} />} />
          </>)}

          {role === 'STUDENT' && (<>
            <NavLink href="/dashboard/student" label="Dashboard" icon={<LayoutDashboard size={20} />} exact />
            <NavLink href="/dashboard/student/quizzes" label="Quizzes & Exams" icon={<CheckSquare size={20} />} />
            <NavLink href="/dashboard/student/buzzer" label="Speed Buzzer Quiz" icon={<Sparkles size={20} />} />
            <NavLink href="/dashboard/student/grading" label="AI Marking & Feedback" icon={<Sparkles size={20} />} />
            <NavLink href="/dashboard/student/forum" label="Discussion Forums" icon={<MessageSquare size={20} />} />
            <NavLink href="/dashboard/student/messages" label="Messages & Inbox" icon={<MessageSquare size={20} />} />
          </>)}

          {role === 'PARENT' && (<>
            <NavLink href="/dashboard/parent" label="Children Overview" icon={<Users size={20} />} exact />
          </>)}

          {role === 'ASSISTANT' && (<>
            <NavLink href="/dashboard/assistant" label="Overview" icon={<LayoutDashboard size={20} />} exact />
            <NavLink href="/dashboard/assistant/forum" label="Forum Moderation" icon={<MessageSquare size={20} />} />
          </>)}
        </nav>

        {/* Horizontal Divider Line above Sign Out Link */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem', marginTop: 'auto' }}>
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: isCollapsed ? '0.75rem 0' : '0.75rem 1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
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
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

