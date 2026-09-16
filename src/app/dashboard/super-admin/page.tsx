import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, GraduationCap, Building2, Layers, TrendingUp, ShieldAlert, ChevronRight } from '@/components/Icons'

export default async function SuperAdminDashboard() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    studentsCount,
    teachersCount,
    parentsCount,
    enrollmentsCount,
    recentSignupsCount,
    auditLogs
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.user.count({ where: { role: 'PARENT' } }),
    prisma.batchEnrollment.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8
    })
  ])

  return (
    <div className="content-wrapper fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Soft Teal to Mint Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #e0f7fa, #e8f5e9)',
        padding: '1.5rem 2rem',
        borderRadius: '16px',
        border: '1px solid rgba(0, 200, 83, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 200, 83, 0.08)',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Welcome back, Super 👋
        </h1>
        <p style={{ color: '#334155', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', margin: 0 }}>
          Ready to explore your academic hub today?
        </p>
      </div>

      {/* 5 VIVID GRADIENT STAT CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        {/* Total Students - Vivid Green */}
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #00c853, #69f0ae)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: 'none',
          color: 'white',
          boxShadow: '0 8px 24px rgba(0, 200, 83, 0.3)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'white', textTransform: 'uppercase', fontWeight: 800 }}>Total students</span>
            <GraduationCap size={20} color="white" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, marginTop: '0.5rem', color: 'white' }}>{studentsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} color="white" /> Active learner roster
          </div>
        </div>

        {/* Total Teachers - Electric Blue */}
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #2979ff, #82b1ff)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: 'none',
          color: 'white',
          boxShadow: '0 8px 24px rgba(41, 121, 255, 0.3)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'white', textTransform: 'uppercase', fontWeight: 800 }}>Total teachers</span>
            <Users size={20} color="white" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: 'white', marginTop: '0.5rem' }}>{teachersCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} color="white" /> Instructors & staff
          </div>
        </div>

        {/* Total Parents - Vibrant Purple */}
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #aa00ff, #ea80fc)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: 'none',
          color: 'white',
          boxShadow: '0 8px 24px rgba(170, 0, 255, 0.3)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'white', textTransform: 'uppercase', fontWeight: 800 }}>Total parents</span>
            <Users size={20} color="white" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: 'white', marginTop: '0.5rem' }}>{parentsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} color="white" /> Guardian accounts
          </div>
        </div>

        {/* Active Enrollments - Energetic Orange */}
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #ff6d00, #ffd180)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: 'none',
          color: 'white',
          boxShadow: '0 8px 24px rgba(255, 109, 0, 0.3)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'white', textTransform: 'uppercase', fontWeight: 800 }}>Active enrollments</span>
            <Layers size={20} color="white" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: 'white', marginTop: '0.5rem' }}>{enrollmentsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} color="white" /> Batch seats allocated
          </div>
        </div>

        {/* Recent Sign-ups - Hot Pink */}
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #f50057, #ff80ab)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: 'none',
          color: 'white',
          boxShadow: '0 8px 24px rgba(245, 0, 87, 0.3)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'white', textTransform: 'uppercase', fontWeight: 800 }}>Recent sign-ups (7d)</span>
            <TrendingUp size={20} color="white" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: 'white', marginTop: '0.5rem' }}>{recentSignupsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>+ new sign-ups this week</div>
        </div>
      </div>

      {/* VIVID GRADIENT ACTION BUTTONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <Link 
          href="/dashboard/super-admin/users" 
          className="btn-primary"
          style={{ 
            padding: '0.95rem 1.5rem', fontSize: '0.95rem', fontWeight: 800, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            textAlign: 'center', width: '100%',
            background: 'linear-gradient(135deg, #00c853, #00e676)', color: '#ffffff',
            borderRadius: '12px', border: 'none',
            boxShadow: '0 4px 14px rgba(0, 200, 83, 0.4)',
            textDecoration: 'none', transition: 'all 0.2s ease'
          }}
        >
          <Users size={20} color="#ffffff" />
          <span>Manage all users & approvals</span>
          <ChevronRight size={18} color="#ffffff" />
        </Link>

        <Link 
          href="/dashboard/super-admin/branches" 
          className="btn-primary"
          style={{ 
            padding: '0.95rem 1.5rem', fontSize: '0.95rem', fontWeight: 800, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            textAlign: 'center', width: '100%',
            background: 'linear-gradient(135deg, #2979ff, #40c4ff)', color: '#ffffff',
            borderRadius: '12px', border: 'none',
            boxShadow: '0 4px 14px rgba(41, 121, 255, 0.4)',
            textDecoration: 'none', transition: 'all 0.2s ease'
          }}
        >
          <Building2 size={20} color="#ffffff" />
          <span>Physical branches overview</span>
          <ChevronRight size={18} color="#ffffff" />
        </Link>
      </div>

      {/* AUDIT LOG TERMINAL (DARK GRADIENT + GLOWING GREEN MONOSPACE FONT) */}
      <div style={{
        padding: '1.75rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #0f0c29, #1a1a2e)',
        border: '1px solid rgba(0, 230, 118, 0.4)',
        boxShadow: '0 0 20px rgba(0, 230, 118, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={24} color="#00e676" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Administrative audit log terminal</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, marginTop: '0.15rem' }}>Immutable record of administrator actions and system modifications</p>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', background: 'rgba(0, 230, 118, 0.15)', color: '#00e676', border: '1px solid #00e676', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontWeight: 800 }}>
            ● Audit active
          </span>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          color: '#00e676',
          border: '1px solid rgba(0, 230, 118, 0.2)',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          fontFamily: 'monospace, SFMono-Regular, Menlo, Monaco, Consolas',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          overflowX: 'auto'
        }}>
          {auditLogs.map((log) => (
            <div key={log.id} style={{ marginBottom: '0.65rem', borderBottom: '1px solid rgba(0, 230, 118, 0.1)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#82b1ff' }}>[{new Date(log.createdAt).toLocaleString()}]</span>{' '}
              <strong style={{ color: '#69f0ae' }}>{log.adminName}</strong> executed{' '}
              <span style={{ color: '#ffd180' }}>{log.action}</span>
              {log.details && <span style={{ color: '#00e676' }}> — {log.details}</span>}
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div style={{ color: '#00e676' }}>[SYSTEM] No administrative audit events recorded yet. System initial state clean.</div>
          )}
        </div>
      </div>
    </div>
  )
}



