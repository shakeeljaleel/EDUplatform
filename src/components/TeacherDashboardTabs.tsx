'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function TeacherDashboardTabs({ subjectAssignments, batchEnrollments, allStudents }: any) {
  const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'STUDENTS'>('SUBJECTS')

  return (
    <div>
      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '2.5rem', borderBottom: '1px solid var(--bg-tertiary)', marginBottom: '3rem' }}>
        {[
          { id: 'SUBJECTS', label: 'My Subjects', icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-5deg)' }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
            </svg>
          )},
          { id: 'STUDENTS', label: 'My Students', icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(5deg)' }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          )}
        ].map((tab: any) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none', border: 'none', padding: '1rem 0.5rem', cursor: 'pointer',
              fontSize: '1.125rem', fontWeight: 800, color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              position: 'relative', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}
          >
            <span style={{ display: 'flex', color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <div style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '4px', backgroundColor: 'var(--accent-primary)', borderRadius: '2px' }} />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'SUBJECTS' ? (
        <div className="fade-in">
          {/* My Subjects Section */}
          {subjectAssignments.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
                {subjectAssignments.map((sa: any) => (
                  <div key={sa.id} className="card premium-card" style={{ padding: '2.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>
                      {sa.subject.batch.name}
                    </div>
                    <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2.5rem' }}>{sa.subject.name}</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      {/* PRIMARY: QUIZZES */}
                      <Link href={`/dashboard/teacher/batches/${sa.subject.batchId}`} className="btn-primary" style={{ 
                        gridColumn: 'span 2', textAlign: 'center', padding: '1.5rem', fontSize: '1.25rem', fontWeight: 900,
                        border: '3px solid var(--text-primary)', color: 'white',
                        boxShadow: '8px 8px 0 var(--text-primary)', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                      }}>
                        📝 Quizzes
                      </Link>

                      {/* SECONDARY BUTTONS */}
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/performance`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--text-primary)', textAlign: 'center' }}>📊 Stats</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/calendar`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--text-primary)', textAlign: 'center' }}>📅 Schedule</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/syllabus`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--accent-primary)', color: 'var(--accent-primary)', textAlign: 'center' }}>🧬 Syllabus</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/grading`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--dna-pink)', color: 'var(--dna-pink)', textAlign: 'center' }}>🤖 Grading</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/broadcast`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--warning)', color: 'var(--warning)', textAlign: 'center' }}>📢 Broadcast</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/lesson-planner`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--dna-purple)', color: 'var(--dna-purple)', textAlign: 'center' }}>🪄 AI Planner</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/resources`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--text-primary)', textAlign: 'center' }}>📚 Resources</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/forum`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--text-primary)', textAlign: 'center' }}>💬 Forum</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/recordings`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--error)', color: 'var(--error)', textAlign: 'center' }}>📹 Recordings</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/buzzer`} className="btn-secondary" style={{ padding: '1rem', borderRadius: '12px', fontWeight: 900, border: '2px solid #7c3aed', color: '#7c3aed', textAlign: 'center' }}>🔔 Buzzer</Link>
                      
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/settings`} className="btn-secondary" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
                        ⚙️ Advanced Subject Settings
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Batches */}
          {batchEnrollments.length > 0 && (
            <div style={{ marginTop: '4rem' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', fontWeight: 900 }}>Assigned Batches</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2.5rem' }}>
                {batchEnrollments.map((e: any) => (
                  <div key={e.batch.id} className="card premium-card" style={{ padding: '2.5rem', borderTop: '8px solid var(--dna-blue)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 900, letterSpacing: '0.1em' }}>{e.batch.branch?.name || 'Academic Batch'}</div>
                    <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem' }}>{e.batch.name}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      <Link href={`/dashboard/teacher/batches/${e.batch.id}`} className="btn-primary" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: 900, border: '3px solid var(--text-primary)', boxShadow: '6px 6px 0 var(--text-primary)' }}>
                        Manage Batch
                      </Link>
                      <Link href={`/dashboard/teacher/batches/${e.batch.id}/performance`} className="btn-secondary" style={{ padding: '0.875rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--text-primary)', textAlign: 'center' }}>
                        Performance
                      </Link>
                      <Link href={`/dashboard/teacher/batches/${e.batch.id}/students`} className="btn-secondary" style={{ padding: '0.875rem', borderRadius: '12px', fontWeight: 900, border: '2px solid var(--text-primary)', textAlign: 'center' }}>
                        Students
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card premium-card" style={{ padding: '2rem', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '3px solid var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>Global Student Directory</h3>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 800 }}>Total: {allStudents.length} Students</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '3px solid var(--text-primary)' }}>
                  <th style={{ padding: '1.5rem', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Name</th>
                  <th style={{ padding: '1.5rem', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                  <th style={{ padding: '1.5rem', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch Enrolled</th>
                  <th style={{ padding: '1.5rem', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</th>
                </tr>
              </thead>
              <tbody>
                {allStudents.map((student: any) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                    <td style={{ padding: '1.5rem', fontWeight: 900, fontSize: '1.125rem' }}>{student.name}</td>
                    <td style={{ padding: '1.5rem', fontWeight: 600 }}>{student.email}</td>
                    <td style={{ padding: '1.5rem' }}>
                      {student.enrollments.map((en: any) => (
                        <span key={en.batchId} className="badge" style={{ marginRight: '0.5rem', background: 'var(--bg-accent)', border: '2px solid var(--text-primary)', fontWeight: 800, fontSize: '0.75rem' }}>{en.batch.name}</span>
                      ))}
                    </td>
                    <td style={{ padding: '1.5rem' }}>
                      <span style={{ fontWeight: 900, color: 'var(--accent-primary)' }}>{student.profile?.level || 'N/A'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allStudents.length === 0 && (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No students found.</div>
          )}
        </div>
      )}
    </div>
  )
}
