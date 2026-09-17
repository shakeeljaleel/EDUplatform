import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { Shield } from '@/components/Icons'

const PERMISSION_COLORS: Record<string, string> = {
  'Mark attendance': '#00c853',
  'Grade assignments': '#2979ff',
  'Post resources': '#ff6d00',
  'Manage forum': '#aa00ff',
  'View student performance': '#00bcd4',
  'Send announcements': '#f50057',
  'Create quizzes': '#ffab00',
  'View student contact details': '#795548'
}

export default async function AssistantDashboard() {
  const session = await getSession()
  if (!session) return null

  // Fetch all subject-branch-teacher combinations assigned to this assistant
  const assistantAssignments = await prisma.subjectBranchTeacherAssistant.findMany({
    where: { assistantId: session.user.id },
    include: {
      subjectBranchTeacher: {
        include: {
          subject: { include: { batch: true } },
          branch: true,
          teacher: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Header Banner */}
      <div style={{
        background: '#e0f7fa',
        padding: '1.75rem 2rem',
        borderRadius: '20px',
        border: '3px solid #1a1a2e',
        boxShadow: '6px 6px 0px #1a1a2e',
        marginBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={28} color="#00bcd4" />
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Teacher Assistant Portal
          </h1>
        </div>
        <p style={{ color: '#334155', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.35rem', margin: '0.35rem 0 0 0' }}>
          Welcome, {session.user.name}. You are assigned to assist specific teachers across their subject branches.
        </p>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.5rem' }}>
        My Assigned Classes & Granted Permissions
      </h2>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
        {assistantAssignments.map((assignment) => {
          const sbt = assignment.subjectBranchTeacher
          let permissions: string[] = []
          try {
            permissions = JSON.parse(assignment.permissions)
          } catch { permissions = [] }

          const hasAttendance = permissions.includes('Mark attendance')
          const hasGrading = permissions.includes('Grade assignments')
          const hasResources = permissions.includes('Post resources')
          const hasForum = permissions.includes('Manage forum')
          const hasAnalytics = permissions.includes('View student performance')
          const hasAnnouncements = permissions.includes('Send announcements')
          const hasQuizzes = permissions.includes('Create quizzes')

          return (
            <div
              key={assignment.id}
              className="card"
              style={{
                padding: '1.75rem',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{
                    background: sbt.subject.colour || '#2979ff',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '50px',
                    border: '1.5px solid #1a1a2e'
                  }}>
                    {sbt.subject.batch.name}
                  </span>

                  <span style={{
                    background: sbt.branch.colour || '#00c853',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '50px',
                    border: '1.5px solid #1a1a2e'
                  }}>
                    📍 {sbt.branch.name}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0.25rem 0', color: '#0f172a' }}>
                  {sbt.subject.name}
                </h3>

                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569', marginBottom: '1.25rem' }}>
                  👨‍🏫 Assisting <strong>{sbt.teacher.name}</strong>
                </div>

                {/* Permission Badges Pills */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                    Granted Permissions ({permissions.length})
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {permissions.map((perm) => {
                      const color = PERMISSION_COLORS[perm] || '#1a1a2e'
                      return (
                        <span
                          key={perm}
                          style={{
                            background: color,
                            color: '#ffffff',
                            border: '2px solid #1a1a2e',
                            borderRadius: '50px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.65rem',
                            display: 'inline-block'
                          }}
                        >
                          {perm}
                        </span>
                      )
                    })}

                    {permissions.length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, fontStyle: 'italic' }}>
                        No active permissions assigned.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Feature Action Buttons: VISIBLE ONLY IF PERMISSION GRANTED */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                {hasGrading && (
                  <Link href={`/dashboard/assistant/subjects/${sbt.subject.id}/grading`} style={{ padding: '0.6rem 0.5rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#e3f2fd', border: '2px solid #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                    🤖 Grade Papers
                  </Link>
                )}

                {hasForum && (
                  <Link href={`/dashboard/assistant/subjects/${sbt.subject.id}/forum`} style={{ padding: '0.6rem 0.5rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#f3e8ff', border: '2px solid #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                    💬 Manage Forum
                  </Link>
                )}

                {hasQuizzes && (
                  <Link href={`/dashboard/assistant/subjects/${sbt.subject.id}/quizzes`} style={{ padding: '0.6rem 0.5rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#fff8e1', border: '2px solid #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                    📝 Quizzes
                  </Link>
                )}

                {hasAnalytics && (
                  <Link href={`/dashboard/assistant/subjects/${sbt.subject.id}/analytics`} style={{ padding: '0.6rem 0.5rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#e0f7fa', border: '2px solid #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                    📊 Student Performance
                  </Link>
                )}

                {hasAttendance && (
                  <Link href={`/dashboard/assistant/subjects/${sbt.subject.id}/attendance`} style={{ padding: '0.6rem 0.5rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#e8f5e9', border: '2px solid #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                    📋 Attendance
                  </Link>
                )}

                {hasResources && (
                  <Link href={`/dashboard/assistant/subjects/${sbt.subject.id}/resources`} style={{ padding: '0.6rem 0.5rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#fff3e0', border: '2px solid #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                    📁 Resources
                  </Link>
                )}
              </div>
            </div>
          )
        })}

        {assistantAssignments.length === 0 && (
          <div className="card" style={{ gridColumn: '1/-1', padding: '4rem 2rem', textAlign: 'center', border: '3px dashed #cbd5e1' }}>
            <Shield size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>No Assistant Assignments Yet</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
              You have not been assigned as assistant to any teacher yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
