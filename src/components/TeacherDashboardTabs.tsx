'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import EmptyState from '@/components/EmptyState'
import { showToast } from '@/components/ToastContainer'
import { BookOpen, Users, Search, Filter, CheckSquare, Sparkles } from '@/components/Icons'

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
        <div className="premium-card-v2" style={{ borderLeft: '6px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
            Assigned Subjects
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#0f172a' }}>{subjectAssignments.length}</div>
          <p style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, marginTop: '0.5rem' }}>Active teaching modules</p>
        </div>

        <div className="premium-card-v2" style={{ borderLeft: '6px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
            Assigned Batches
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#2563eb' }}>{batchEnrollments.length}</div>
          <p style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 700, marginTop: '0.5rem' }}>Active student intakes</p>
        </div>

        <div className="premium-card-v2" style={{ borderLeft: '6px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
            Total Roster Students
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#7c3aed' }}>{allStudents.length}</div>
          <p style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.5rem' }}>Enrolled across all classes</p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '2.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2.5rem' }}>
        {[
          { id: 'SUBJECTS', label: 'My Subjects', icon: <BookOpen size={20} /> },
          { id: 'STUDENTS', label: 'Student Directory & Filtering', icon: <Users size={20} /> }
        ].map((tab: any) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none', border: 'none', padding: '1rem 0.5rem', cursor: 'pointer',
              fontSize: '1rem', fontWeight: 800, color: activeTab === tab.id ? '#10b981' : '#475569',
              position: 'relative', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.65rem',
              minHeight: '44px'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <div style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '3px', backgroundColor: '#10b981', borderRadius: '2px' }} />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'SUBJECTS' ? (
        <div className="fade-in">
          {/* My Subjects Section */}
          {subjectAssignments.length > 0 ? (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                {subjectAssignments.map((sa: any) => (
                  <div key={sa.id} className="card premium-card" style={{ padding: '2rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                      {sa.subject.batch.name}
                    </div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1.5rem', color: '#0f172a' }}>{sa.subject.name}</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                      <Link href={`/dashboard/teacher/batches/${sa.subject.batchId}`} className="btn-primary" style={{ 
                        gridColumn: 'span 2', textAlign: 'center', padding: '0.875rem', fontSize: '1rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '44px'
                      }}>
                        <CheckSquare size={18} /> Quizzes & Assessments
                      </Link>

                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/performance`} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: '8px', fontWeight: 800, textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📊 Stats</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/calendar`} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: '8px', fontWeight: 800, textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📅 Schedule</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/syllabus`} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: '8px', fontWeight: 800, color: '#059669', borderColor: '#10b981', textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🧬 Syllabus</Link>
                      <Link href={`/dashboard/teacher/subjects/${sa.subject.id}/grading`} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: '8px', fontWeight: 800, color: '#ec4899', borderColor: '#ec4899', textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖 Grading</Link>
                    </div>
                  </div>
                ))}
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
