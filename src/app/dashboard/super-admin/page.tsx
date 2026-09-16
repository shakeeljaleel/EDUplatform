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
      {/* Overview Greeting Header (Overview Page Only) */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Welcome back, Super 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', margin: 0 }}>
          Ready to explore your academic hub today?
        </p>
      </div>

      {/* 5 STAT CARDS GRID (Light 1px border + 4px colored top accent) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        {/* Total Students */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Total students</span>
            <GraduationCap size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, marginTop: '0.5rem', color: '#0f172a' }}>{studentsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={12} /> Active learner roster
          </div>
        </div>

        {/* Total Teachers */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Total teachers</span>
            <Users size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: '#0f172a', marginTop: '0.5rem' }}>{teachersCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={12} /> Instructors & staff
          </div>
        </div>

        {/* Total Parents */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Total parents</span>
            <Users size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: '#0f172a', marginTop: '0.5rem' }}>{parentsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={12} /> Guardian accounts
          </div>
        </div>

        {/* Active Enrollments */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '4px solid #ec4899', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Active enrollments</span>
            <Layers size={18} color="#ec4899" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: '#0f172a', marginTop: '0.5rem' }}>{enrollmentsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: '#db2777', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={12} /> Batch seats allocated
          </div>
        </div>

        {/* Recent Sign-ups */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Recent sign-ups (7d)</span>
            <TrendingUp size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 1, color: '#0f172a', marginTop: '0.5rem' }}>{recentSignupsCount}</div>
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: '#b45309', fontWeight: 700 }}>+ new sign-ups this week</div>
        </div>
      </div>

      {/* CONSISTENT OUTLINED ACTION BUTTONS (EQUAL WIDTH, EQUAL WEIGHT, SENTENCE CASE) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <Link 
          href="/dashboard/super-admin/users" 
          className="btn-secondary" 
          style={{ 
            padding: '0.85rem 1.25rem', fontSize: '0.9rem', fontWeight: 700, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            textAlign: 'center', width: '100%', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a',
            borderRadius: '10px'
          }}
        >
          <Users size={18} color="#10b981" />
          <span>Manage all users & approvals</span>
          <ChevronRight size={16} color="#64748b" />
        </Link>

        <Link 
          href="/dashboard/super-admin/branches" 
          className="btn-secondary" 
          style={{ 
            padding: '0.85rem 1.25rem', fontSize: '0.9rem', fontWeight: 700, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            textAlign: 'center', width: '100%', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a',
            borderRadius: '10px'
          }}
        >
          <Building2 size={18} color="#3b82f6" />
          <span>Physical branches overview</span>
          <ChevronRight size={16} color="#64748b" />
        </Link>
      </div>

      {/* ADMINISTRATIVE AUDIT LOG TERMINAL SECTION (CLEAN LIGHT CARD DESIGN) */}
      <div className="card" style={{ padding: '1.75rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={22} color="#10b981" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Administrative audit log terminal</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, marginTop: '0.15rem' }}>Immutable record of administrator actions and system modifications</p>
            </div>
          </div>
          <span className="badge" style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#059669', border: '1px solid #10b981', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 700 }}>
            Audit active
          </span>
        </div>

        <div style={{ background: '#f9fafb', color: '#334155', border: '1px solid #e2e8f0', padding: '1.25rem 1.5rem', borderRadius: '10px', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto' }}>
          {auditLogs.map((log) => (
            <div key={log.id} style={{ marginBottom: '0.65rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>[{new Date(log.createdAt).toLocaleString()}]</span>{' '}
              <strong style={{ color: '#2563eb', fontWeight: 700 }}>{log.adminName}</strong> executed{' '}
              <span style={{ color: '#d97706', fontWeight: 700 }}>{log.action}</span>
              {log.details && <span style={{ color: '#0f172a' }}> — {log.details}</span>}
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div style={{ color: '#64748b' }}>No administrative audit events recorded yet. System initial state clean.</div>
          )}
        </div>
      </div>
    </div>
  )
}



