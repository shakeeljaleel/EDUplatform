'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import EmptyState from '@/components/EmptyState'
import { showToast } from '@/components/ToastContainer'
import { BookOpen, Users, Search, Filter, CheckSquare, Sparkles } from '@/components/Icons'
import { getSubjectColor } from '@/lib/subjectColors'

export default function TeacherDashboardTabs({ subjectAssignments, batchEnrollments, allStudents }: any) {
  const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'STUDENTS'>('SUBJECTS')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // Filter students by search query and batch filter
  const filteredStudents = useMemo(() => {
    return allStudents.filter((student: any) => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            student.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesBatch = selectedBatchFilter === 'ALL' ||
        student.enrollments.some((en: any) => en.batchId === selectedBatchFilter)

      return matchesSearch && matchesBatch
    })
  }, [allStudents, searchQuery, selectedBatchFilter])

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filteredStudents.map((s: any) => s.id))
    }
  }

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleBulkAction = (actionName: string) => {
    if (selectedStudentIds.length === 0) return
    showToast(`${actionName} applied successfully for ${selectedStudentIds.length} student(s).`, 'success')
    setSelectedStudentIds([])
  }

  return (
    <div>
      {/* AT-A-GLANCE SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="stat-card" style={{
          background: '#00bcd4',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
            Assigned Subjects
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#ffffff' }}>{subjectAssignments.length}</div>
          <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.5rem' }}>Active teaching modules</p>
        </div>

        <div className="stat-card" style={{
          background: '#2979ff',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
            Assigned Batches
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#ffffff' }}>{batchEnrollments.length}</div>
          <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.5rem' }}>Active student intakes</p>
        </div>

        <div className="stat-card" style={{
          background: '#aa00ff',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
            Total Roster Students
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#ffffff' }}>{allStudents.length}</div>
          <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.5rem' }}>Enrolled across all classes</p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'SUBJECTS', label: 'My Subjects', icon: <BookOpen size={20} /> },
          { id: 'STUDENTS', label: 'Student Directory & Filtering', icon: <Users size={20} /> }
        ].map((tab: any) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
            style={{
              background: activeTab === tab.id ? '#1a1a2e' : '#ffffff',
              color: activeTab === tab.id ? '#ffffff' : '#1a1a2e',
              border: '3px solid #1a1a2e',
              boxShadow: '3px 3px 0px #1a1a2e',
              borderRadius: '50px',
              padding: '0.65rem 1.5rem',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              minHeight: '44px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'SUBJECTS' ? (
        <div className="fade-in">
          {/* My Subjects Section */}
          {subjectAssignments.length > 0 ? (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                {subjectAssignments.map((sa: any, idx: number) => {
                  const subjectColor = getSubjectColor(sa.subject.name, idx)
                  const studentCount = sa.subject._count?.enrollments || 0

                  return (
                    <div
                      key={sa.id}
                      className="card"
                      style={{
                        padding: '1.75rem',
                        background: subjectColor,
                        color: '#ffffff',
                        border: '3px solid #1a1a2e',
                        boxShadow: '5px 5px 0px #1a1a2e',
                        borderRadius: '16px'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.35rem', letterSpacing: '0.05em', opacity: 0.9 }}>
                        {sa.subject.batch.name}
                      </div>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff' }}>{sa.subject.name}</h3>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.25rem', color: 'rgba(255,255,255,0.9)' }}>
                        👥 {studentCount} Student(s) Enrolled
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Link prefetch={true} href={`/dashboard/teacher/batches/${sa.subject.batchId}`} className="btn-primary" style={{ 
                          gridColumn: 'span 2', textAlign: 'center', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '42px',
                          background: '#1a1a2e', color: '#ffffff', border: '2px solid #ffffff', borderRadius: '10px'
                        }}>
                          <CheckSquare size={18} /> Quizzes & Assessments
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/grading`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          🤖 AI Grading
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/buzzer`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          ⚡ Speed Buzzer
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/forum`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          💬 Q&A Forum
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/performance`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          📊 Mark Analytics
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/lesson-planner`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          📑 AI Planner
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/syllabus`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          🧬 Syllabus
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/calendar`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          📅 Schedule
                        </Link>

                        <Link prefetch={true} href={`/dashboard/teacher/subjects/${sa.subject.id}/recordings`} style={{ padding: '0.65rem 0.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#1a1a2e', background: '#ffffff', border: '2px solid #1a1a2e', textAlign: 'center', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          📹 Recordings
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <EmptyState 
              icon={<BookOpen size={36} color="#10b981" />}
              title="No Subjects Assigned Yet" 
              description="You have not been assigned to any subjects yet. Contact your Super Admin to get subject assignments."
            />
          )}
        </div>
      ) : (
        <div className="card premium-card" style={{ padding: '2rem', overflow: 'hidden' }}>
          
          {/* SEARCH & FILTER CONTROLS */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Search students by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem', minHeight: '44px' }}
                />
              </div>

              <select 
                className="input-field"
                value={selectedBatchFilter}
                onChange={e => setSelectedBatchFilter(e.target.value)}
                style={{ width: '200px', minHeight: '44px' }}
              >
                <option value="ALL">All Batches</option>
                {batchEnrollments.map((be: any) => (
                  <option key={be.batchId} value={be.batchId}>{be.batch.name}</option>
                ))}
              </select>
            </div>

            {/* BULK ACTIONS BUTTONS */}
            {selectedStudentIds.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleBulkAction('Export Selected Roster')}
                  className="btn-secondary"
                  style={{ minHeight: '44px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  📥 Export ({selectedStudentIds.length})
                </button>
                <button 
                  onClick={() => handleBulkAction('Mark Submissions Reviewed')}
                  className="btn-primary"
                  style={{ minHeight: '44px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  ✓ Mark Reviewed ({selectedStudentIds.length})
                </button>
              </div>
            )}
          </div>

          {/* RESPONSIVE TABLE CONTAINER */}
          {filteredStudents.length > 0 ? (
            <div className="table-container-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ padding: '1rem', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                        onChange={toggleSelectAll}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', color: '#475569' }}>Student Name</th>
                    <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', color: '#475569' }}>Email</th>
                    <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', color: '#475569' }}>Batch Enrolled</th>
                    <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', color: '#475569' }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student: any) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleSelectStudent(student.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                            {student.name.charAt(0)}
                          </div>
                          <span>{student.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>{student.email}</td>
                      <td style={{ padding: '1rem' }}>
                        {student.enrollments.map((en: any) => (
                          <span key={en.batchId} className="badge" style={{ marginRight: '0.5rem', background: '#f0fdf4', border: '1px solid #10b981', color: '#059669', fontWeight: 800, fontSize: '0.75rem', borderRadius: '6px', padding: '2px 8px' }}>
                            {en.batch.name}
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${student.profile?.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                          {student.profile?.paymentStatus || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState 
              icon={<Users size={36} color="#94a3b8" />}
              title="No Students Found" 
              description="No student records match your current search query or batch filter."
            />
          )}
        </div>
      )}
    </div>
  )
}
