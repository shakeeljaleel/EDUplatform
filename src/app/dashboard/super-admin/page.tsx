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
    <div className="content-wrapper fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>Super Admin System Command</h1>
        <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600 }}>
          Global ecosystem infrastructure, user approval controls, and audit trails.
        </p>
      </div>

      {/* METRICS ROW WITH TREND INDICATORS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        {/* Total Students */}
        <div className="premium-card-v2" style={{ borderLeft: '6px solid #10b981', background: '#ffffff', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800 }}>Total Students</span>
            <GraduationCap size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, marginTop: '0.5rem', color: '#0f172a' }}>{studentsCount}</div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} /> Active learner roster
          </div>
        </div>

        {/* Total Teachers */}
        <div className="premium-card-v2" style={{ borderLeft: '6px solid #3b82f6', background: '#ffffff', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800 }}>Total Teachers</span>
            <Users size={20} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: '#2563eb', marginTop: '0.5rem' }}>{teachersCount}</div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#2563eb', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} /> Instructors & staff
          </div>
        </div>

        {/* Total Parents */}
        <div className="premium-card-v2" style={{ borderLeft: '6px solid #8b5cf6', background: '#ffffff', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800 }}>Total Parents</span>
            <Users size={20} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: '#7c3aed', marginTop: '0.5rem' }}>{parentsCount}</div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} /> Guardian accounts
          </div>
        </div>

        {/* Active Enrollments */}
        <div className="premium-card-v2" style={{ borderLeft: '6px solid #ec4899', background: '#ffffff', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800 }}>Active Enrollments</span>
            <Layers size={20} color="#ec4899" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: '#db2777', marginTop: '0.5rem' }}>{enrollmentsCount}</div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#db2777', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} /> Batch seats allocated
          </div>
        </div>

        {/* Recent Sign-ups */}
        <div className="premium-card-v2" style={{ borderLeft: '6px solid #f59e0b', background: '#ffffff', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800 }}>Recent Sign-ups (7D)</span>
            <TrendingUp size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: '#b45309', marginTop: '0.5rem' }}>{recentSignupsCount}</div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#b45309', fontWeight: 800 }}>+ new sign-ups this week</div>
        </div>
      </div>

      {/* QUICK ACTIONS & USER CONSOLE LINK */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <Link href="/dashboard/super-admin/users" className="btn-primary" style={{ padding: '0.875rem 1.5rem', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} /> Manage All Users & Approvals <ChevronRight size={16} />
        </Link>
        <Link href="/dashboard/super-admin/branches" className="btn-secondary" style={{ padding: '0.875rem 1.5rem', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={18} /> Physical Branches Overview
        </Link>
      </div>

      {/* ADMINISTRATIVE AUDIT LOG TERMINAL */}
      <div className="card premium-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={24} color="#10b981" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Administrative Audit Log Terminal</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Immutable record of administrator actions and system modifications</p>
            </div>
          </div>
          <span className="badge" style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#059669', border: '1px solid #10b981', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 800 }}>
            Audit Active
          </span>
        </div>

        <div style={{ background: '#020617', color: '#10b981', padding: '1.25rem 1.5rem', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto' }}>
          {auditLogs.map((log) => (
            <div key={log.id} style={{ marginBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>[{new Date(log.createdAt).toLocaleString()}]</span>{' '}
              <strong style={{ color: '#3b82f6' }}>{log.adminName}</strong> executed{' '}
              <span style={{ color: '#f59e0b' }}>{log.action}</span>
              {log.details && <span style={{ color: '#e2e8f0' }}> — {log.details}</span>}
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div style={{ color: '#94a3b8' }}>No administrative audit events recorded yet. System initial state clean.</div>
          )}
        </div>
      </div>
    </div>
  )
}
