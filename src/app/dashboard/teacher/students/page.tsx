'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface QuizHistoryItem {
  quizId: string
  title: string
  score: number
  maxPossibleScore: number
  percentage: number
  stars: number
  date: string
}

interface StudentRecord {
  id: string
  name: string
  email: string
  batchId: string
  batchName: string
  branchId: string
  branchName: string
  branchColour: string
  subjectId: string
  subjectName: string
  subjectColour: string
  helixScore: number
  stars: number
  goldMedals: number
  silverMedals: number
  bronzeMedals: number
  paymentStatus: string
  attendancePct: number
  presentCount: number
  absentCount: number
  totalPastSessions: number
  lastQuizScore: string
  quizHistory: QuizHistoryItem[]
}

interface StudentGroup {
  key: string
  groupTitle: string
  batchName: string
  batchId: string
  branchName: string
  branchId: string
  branchColour: string
  subjectName: string
  subjectId: string
  subjectColour: string
  studentCount: number
  students: StudentRecord[]
}

export default function MyStudentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [totalStudents, setTotalStudents] = useState(0)
  const [groups, setGroups] = useState<StudentGroup[]>([])
  const [allStudents, setAllStudents] = useState<StudentRecord[]>([])
  const [viewMode, setViewMode] = useState<'BATCH' | 'SUBJECT' | 'ALL'>('BATCH')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // 3-dot dropdown state
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null)

  // Slide-in student panel state
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)
  const [panelTab, setPanelTab] = useState<'OVERVIEW' | 'QUIZZES' | 'ATTENDANCE'>('OVERVIEW')

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/students')
      if (res.ok) {
        const data = await res.json()
        setTotalStudents(data.totalStudents || 0)
        setGroups(data.groups || [])
        setAllStudents(data.allStudents || [])
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Quick message trigger
  const handleSendMessage = (studentEmail: string) => {
    router.push(`/dashboard/teacher/messages?recipient=${encodeURIComponent(studentEmail)}`)
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>My Students</h1>
            <span style={{
              background: '#00c853',
              color: '#ffffff',
              border: '2px solid #1a1a2e',
              borderRadius: '50px',
              padding: '0.2rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 900,
              boxShadow: '2px 2px 0px #1a1a2e'
            }}>
              {totalStudents} Enrolled
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
            Manage student rosters, track individual academic progress, and monitor attendance across class groups.
          </p>
        </div>

        {/* View Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: '#ffffff',
          border: '3px solid #1a1a2e',
          borderRadius: '50px',
          padding: '4px',
          boxShadow: '4px 4px 0px #1a1a2e'
        }}>
          {[
            { key: 'BATCH', label: 'By batch' },
            { key: 'SUBJECT', label: 'By subject' },
            { key: 'ALL', label: 'All students' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as 'BATCH' | 'SUBJECT' | 'ALL')}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '50px',
                border: viewMode === tab.key ? '2px solid #1a1a2e' : 'none',
                background: viewMode === tab.key ? '#1a1a2e' : 'transparent',
                color: viewMode === tab.key ? '#ffffff' : '#1a1a2e',
                fontWeight: 900,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === tab.key ? '2px 2px 0px #1a1a2e' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <h3 style={{ fontWeight: 900, color: '#1a1a2e' }}>Loading Student Directory...</h3>
        </div>
      )}

      {!loading && (
        <>
          {/* ── View 1: By Batch (Grouped by Batch + Branch) ────────── */}
          {viewMode === 'BATCH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {groups.map(group => {
                const isCollapsed = collapsedGroups[group.key]
                return (
                  <div key={group.key} style={{
                    border: '2px solid #1a1a2e',
                    borderRadius: '16px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    background: '#ffffff',
                    overflow: 'hidden'
                  }}>
                    {/* Collapsible Section Header */}
                    <div 
                      onClick={() => toggleGroup(group.key)}
                      style={{
                        padding: '1.25rem 1.5rem',
                        background: 'rgba(41, 121, 255, 0.06)',
                        borderBottom: isCollapsed ? 'none' : '2px solid #1a1a2e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>
                          {group.batchName}
                        </h3>

                        {/* Branch Pill */}
                        <span style={{
                          background: group.branchColour || '#2979ff',
                          color: '#ffffff',
                          border: '2px solid #1a1a2e',
                          borderRadius: '50px',
                          padding: '0.2rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          boxShadow: '2px 2px 0px #1a1a2e'
                        }}>
                          📍 {group.branchName}
                        </span>

                        {/* Subject Pill */}
                        <span style={{
                          background: group.subjectColour || '#00c853',
                          color: '#ffffff',
                          border: '2px solid #1a1a2e',
                          borderRadius: '50px',
                          padding: '0.2rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          boxShadow: '2px 2px 0px #1a1a2e'
                        }}>
                          {group.subjectName}
                        </span>

                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                          ({group.studentCount} student{group.studentCount === 1 ? '' : 's'})
                        </span>
                      </div>

                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a2e' }}>
                        {isCollapsed ? '►' : '▼'}
                      </div>
                    </div>

                    {/* Table of Students in Group */}
                    {!isCollapsed && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #1a1a2e', fontSize: '0.85rem', color: '#64748b' }}>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Student Name</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Email Address</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Subject</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Attendance</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Last Quiz Score</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>HELIX Score</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Status</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.students.map((student: StudentRecord) => (
                              <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#1a1a2e' }}>
                                  <button 
                                    onClick={() => setSelectedStudent(student)} 
                                    style={{ background: 'none', border: 'none', color: '#1a1a2e', fontWeight: 900, cursor: 'pointer', textAlign: 'left', padding: 0 }}
                                  >
                                    {student.name}
                                  </button>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontWeight: 600 }}>{student.email}</td>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  <span style={{
                                    background: student.subjectColour || '#2979ff',
                                    color: '#fff',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '50px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800
                                  }}>
                                    {student.subjectName}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 800 }}>
                                  <span style={{ color: student.attendancePct >= 75 ? '#00c853' : '#dc2626' }}>
                                    {student.attendancePct}%
                                  </span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 800 }}>
                                  {student.lastQuizScore}
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                  <span style={{
                                    background: '#ffd700',
                                    color: '#1a1a2e',
                                    border: '1.5px solid #1a1a2e',
                                    borderRadius: '50px',
                                    padding: '0.2rem 0.65rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 900,
                                    boxShadow: '1.5px 1.5px 0px #1a1a2e'
                                  }}>
                                    ⚡ {student.helixScore} pts
                                  </span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                  <span style={{
                                    background: '#e8f5e9',
                                    color: '#2e7d32',
                                    border: '1.5px solid #2e7d32',
                                    borderRadius: '50px',
                                    padding: '0.15rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 800
                                  }}>
                                    Active
                                  </span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center', position: 'relative' }}>
                                  <button
                                    onClick={() => setActiveMenuStudentId(activeMenuStudentId === student.id ? null : student.id)}
                                    style={{
                                      background: '#ffffff',
                                      border: '2px solid #1a1a2e',
                                      borderRadius: '8px',
                                      padding: '4px 10px',
                                      cursor: 'pointer',
                                      fontWeight: 900,
                                      boxShadow: '2px 2px 0px #1a1a2e'
                                    }}
                                  >
                                    ⋮
                                  </button>

                                  {/* Dropdown Menu */}
                                  {activeMenuStudentId === student.id && (
                                    <div style={{
                                      position: 'absolute',
                                      right: '1.25rem',
                                      top: '2.5rem',
                                      zIndex: 100,
                                      background: '#ffffff',
                                      border: '2.5px solid #1a1a2e',
                                      borderRadius: '12px',
                                      boxShadow: '4px 4px 0px #1a1a2e',
                                      width: '190px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      overflow: 'hidden'
                                    }}>
                                      <button 
                                        onClick={() => { setSelectedStudent(student); setActiveMenuStudentId(null); }}
                                        style={{ padding: '0.65rem 1rem', background: 'none', border: 'none', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                      >
                                        👤 View full profile
                                      </button>
                                      <button 
                                        onClick={() => { handleSendMessage(student.email); setActiveMenuStudentId(null); }}
                                        style={{ padding: '0.65rem 1rem', background: 'none', border: 'none', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                      >
                                        💬 Message student
                                      </button>
                                      <button 
                                        onClick={() => { setSelectedStudent(student); setPanelTab('QUIZZES'); setActiveMenuStudentId(null); }}
                                        style={{ padding: '0.65rem 1rem', background: 'none', border: 'none', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                      >
                                        ✍️ View quiz history
                                      </button>
                                      <button 
                                        onClick={() => { setSelectedStudent(student); setPanelTab('ATTENDANCE'); setActiveMenuStudentId(null); }}
                                        style={{ padding: '0.65rem 1rem', background: 'none', border: 'none', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                                      >
                                        📅 View attendance record
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── View 2: By Subject (Grouped by Subject + Batch + Branch) ────── */}
          {viewMode === 'SUBJECT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {groups.map(group => {
                const isCollapsed = collapsedGroups[group.key]
                return (
                  <div key={`subj_${group.key}`} style={{
                    border: '2px solid #1a1a2e',
                    borderRadius: '16px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    background: '#ffffff',
                    overflow: 'hidden'
                  }}>
                    <div 
                      onClick={() => toggleGroup(group.key)}
                      style={{
                        padding: '1.25rem 1.5rem',
                        background: 'rgba(0, 200, 83, 0.06)',
                        borderBottom: isCollapsed ? 'none' : '2px solid #1a1a2e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {/* Subject Color Pill */}
                        <span style={{
                          background: group.subjectColour || '#00c853',
                          color: '#ffffff',
                          border: '2px solid #1a1a2e',
                          borderRadius: '50px',
                          padding: '0.25rem 0.85rem',
                          fontSize: '0.85rem',
                          fontWeight: 900,
                          boxShadow: '2px 2px 0px #1a1a2e'
                        }}>
                          🟢 {group.subjectName}
                        </span>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>
                          {group.batchName}
                        </h3>

                        {/* Branch Pill */}
                        <span style={{
                          background: group.branchColour || '#2979ff',
                          color: '#ffffff',
                          border: '2px solid #1a1a2e',
                          borderRadius: '50px',
                          padding: '0.2rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          boxShadow: '2px 2px 0px #1a1a2e'
                        }}>
                          📍 {group.branchName}
                        </span>

                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                          ({group.studentCount} student{group.studentCount === 1 ? '' : 's'})
                        </span>
                      </div>

                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a2e' }}>
                        {isCollapsed ? '►' : '▼'}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #1a1a2e', fontSize: '0.85rem', color: '#64748b' }}>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Student Name</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Email Address</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Attendance</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Last Quiz Score</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>HELIX Score</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Status</th>
                              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.students.map((student: StudentRecord) => (
                              <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                                <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#1a1a2e' }}>
                                  <button onClick={() => setSelectedStudent(student)} style={{ background: 'none', border: 'none', color: '#1a1a2e', fontWeight: 900, cursor: 'pointer', padding: 0 }}>
                                    {student.name}
                                  </button>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontWeight: 600 }}>{student.email}</td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 800, color: student.attendancePct >= 75 ? '#00c853' : '#dc2626' }}>
                                  {student.attendancePct}%
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 800 }}>{student.lastQuizScore}</td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                  <span style={{ background: '#ffd700', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.65rem', fontSize: '0.8rem', fontWeight: 900 }}>
                                    ⚡ {student.helixScore} pts
                                  </span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                  <span style={{ background: '#e8f5e9', color: '#2e7d32', border: '1.5px solid #2e7d32', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 800 }}>Active</span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                  <button onClick={() => setSelectedStudent(student)} style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontWeight: 900 }}>View</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── View 3: All Students Flat List ────────────────────── */}
          {viewMode === 'ALL' && (
            <div style={{ border: '2.5px solid #1a1a2e', borderRadius: '16px', boxShadow: '4px 4px 0px #1a1a2e', background: '#ffffff', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2.5px solid #1a1a2e', fontSize: '0.85rem', color: '#64748b' }}>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800 }}>Name</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800 }}>Email</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800 }}>Batch</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800 }}>Branch</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800 }}>Subject</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Attendance</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Last Quiz</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>HELIX Score</th>
                      <th style={{ padding: '1rem 1.25rem', fontWeight: 800, textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStudents.map(student => (
                      <tr key={`all_${student.id}_${student.subjectId}_${student.branchId}`} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#1a1a2e' }}>
                          <button onClick={() => setSelectedStudent(student)} style={{ background: 'none', border: 'none', color: '#1a1a2e', fontWeight: 900, cursor: 'pointer', padding: 0 }}>
                            {student.name}
                          </button>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontWeight: 600 }}>{student.email}</td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1a1a2e' }}>{student.batchName}</td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            background: student.branchColour || '#2979ff',
                            color: '#ffffff',
                            border: '1.5px solid #1a1a2e',
                            borderRadius: '50px',
                            padding: '0.2rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 900
                          }}>
                            {student.branchName}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            background: student.subjectColour || '#00c853',
                            color: '#ffffff',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 800
                          }}>
                            {student.subjectName}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 800, color: student.attendancePct >= 75 ? '#00c853' : '#dc2626' }}>
                          {student.attendancePct}%
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 800 }}>{student.lastQuizScore}</td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{ background: '#ffd700', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.65rem', fontSize: '0.8rem', fontWeight: 900 }}>
                            ⚡ {student.helixScore} pts
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{ background: '#e8f5e9', color: '#2e7d32', border: '1.5px solid #2e7d32', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 800 }}>Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Slide-in Student Detail Panel (Right Side) ──────────── */}
      {selectedStudent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            height: '100%',
            background: '#ffffff',
            borderLeft: '4px solid #1a1a2e',
            boxShadow: '-8px 0px 0px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflowY: 'auto',
            padding: '2rem'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedStudent(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: '2px solid #1a1a2e',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            {/* Student Header Info */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>👨‍🎓</span>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>
                    {selectedStudent.name}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                    {selectedStudent.email}
                  </p>
                </div>
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <span style={{
                  background: selectedStudent.branchColour || '#2979ff',
                  color: '#ffffff',
                  border: '1.5px solid #1a1a2e',
                  borderRadius: '50px',
                  padding: '0.2rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 900
                }}>
                  📍 {selectedStudent.branchName}
                </span>

                <span style={{
                  background: selectedStudent.subjectColour || '#00c853',
                  color: '#ffffff',
                  border: '1.5px solid #1a1a2e',
                  borderRadius: '50px',
                  padding: '0.2rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 900
                }}>
                  {selectedStudent.subjectName}
                </span>

                <span style={{
                  background: '#f1f5f9',
                  color: '#1a1a2e',
                  border: '1.5px solid #1a1a2e',
                  borderRadius: '50px',
                  padding: '0.2rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  {selectedStudent.batchName}
                </span>
              </div>
            </div>

            {/* Stats Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem', background: '#fff9c4', border: '2px solid #1a1a2e', borderRadius: '12px', boxShadow: '2px 2px 0px #1a1a2e', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1a1a2e' }}>HELIX SCORE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a2e', marginTop: '2px' }}>{selectedStudent.helixScore} pts</div>
              </div>

              <div style={{ padding: '0.85rem', background: '#e1f5fe', border: '2px solid #1a1a2e', borderRadius: '12px', boxShadow: '2px 2px 0px #1a1a2e', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1a1a2e' }}>STARS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0288d1', marginTop: '2px' }}>{selectedStudent.stars} ⭐</div>
              </div>

              <div style={{ padding: '0.85rem', background: '#f3e5f5', border: '2px solid #1a1a2e', borderRadius: '12px', boxShadow: '2px 2px 0px #1a1a2e', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1a1a2e' }}>MEDALS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#7b1fa2', marginTop: '2px' }}>
                  {selectedStudent.goldMedals > 0 && '🥇'}
                  {selectedStudent.silverMedals > 0 && '🥈'}
                  {selectedStudent.bronzeMedals > 0 && '🥉'}
                  {selectedStudent.goldMedals === 0 && selectedStudent.silverMedals === 0 && selectedStudent.bronzeMedals === 0 && '0'}
                </div>
              </div>
            </div>

            {/* Panel Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #1a1a2e', marginBottom: '1.25rem' }}>
              {[
                { key: 'OVERVIEW', label: 'Overview' },
                { key: 'QUIZZES', label: 'Quiz History' },
                { key: 'ATTENDANCE', label: 'Attendance' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPanelTab(tab.key as 'OVERVIEW' | 'QUIZZES' | 'ATTENDANCE')}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: panelTab === tab.key ? '3px solid #00c853' : 'none',
                    color: panelTab === tab.key ? '#00c853' : '#64748b',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {panelTab === 'OVERVIEW' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 900, color: '#1a1a2e' }}>Attendance Summary</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    {selectedStudent.presentCount} present, {selectedStudent.absentCount} absent ({selectedStudent.attendancePct}% overall rate).
                  </p>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 900, color: '#1a1a2e' }}>Latest Assessment</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    Last score: <strong style={{ color: '#1a1a2e' }}>{selectedStudent.lastQuizScore}</strong>
                  </p>
                </div>

                <button
                  onClick={() => handleSendMessage(selectedStudent.email)}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: '#00c853',
                    color: '#ffffff',
                    border: '3px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  💬 Send direct message
                </button>
              </div>
            )}

            {/* Tab 2: Quiz History */}
            {panelTab === 'QUIZZES' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {selectedStudent.quizHistory?.length > 0 ? (
                  selectedStudent.quizHistory.map((q, i) => (
                    <div key={i} style={{ padding: '0.85rem 1rem', border: '2px solid #1a1a2e', borderRadius: '12px', background: '#ffffff', boxShadow: '2px 2px 0px #1a1a2e' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.9rem', color: '#1a1a2e' }}>
                        <span>{q.title}</span>
                        <span style={{ color: '#00c853' }}>{q.percentage}%</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Score: {q.score}/{q.maxPossibleScore}</span>
                        <span>{q.stars} ⭐</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>No submitted quizzes yet.</p>
                )}
              </div>
            )}

            {/* Tab 3: Attendance */}
            {panelTab === 'ATTENDANCE' && (
              <div style={{ padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px', background: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#1a1a2e' }}>Attendance Record</h4>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <div style={{ flex: 1, padding: '0.75rem', background: '#e8f5e9', border: '1.5px solid #2e7d32', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#2e7d32' }}>{selectedStudent.presentCount}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2e7d32' }}>Classes Attended</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.75rem', background: '#ffebee', border: '1.5px solid #c62828', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#c62828' }}>{selectedStudent.absentCount}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c62828' }}>Classes Missed</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
