'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { showToast } from '@/components/ToastContainer'
import { BookOpen, Users, Plus, CheckSquare, Edit, Trash2, X, Check, Shield } from '@/components/Icons'

const ASSISTANT_PERMISSIONS = [
  'Mark attendance',
  'Grade assignments',
  'Post resources',
  'Manage forum',
  'View student performance',
  'Send announcements',
  'Create quizzes',
  'View student contact details'
]

export default function TeacherDashboardTabs({ teacherClasses, pendingConfirmations: initialPending }: any) {
  const [activeTab, setActiveTab] = useState<'CLASSES' | 'CONFIRMATIONS'>('CLASSES')
  const [classList, setClassList] = useState<any[]>(teacherClasses || [])
  const [pendingList, setPendingList] = useState<any[]>(initialPending || [])

  // Assistant Modal
  const [assistantModal, setAssistantModal] = useState<{
    show: boolean
    subjectBranchTeacherId: string
    subjectName: string
    branchName: string
    existingAssistantId?: string
    existingPermissions?: string[]
  }>({ show: false, subjectBranchTeacherId: '', subjectName: '', branchName: '' })

  const [assistantsList, setAssistantsList] = useState<any[]>([])
  const [selectedAssistantId, setSelectedAssistantId] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [submittingAssistant, setSubmittingAssistant] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetch('/api/users?role=ASSISTANT')
      .then(res => res.json())
      .then(data => {
        if (isMounted) setAssistantsList(data.users || [])
      })
      .catch(err => console.error(err))
    return () => {
      isMounted = false
    }
  }, [])

  const handleSaveAssistant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assistantModal.subjectBranchTeacherId || !selectedAssistantId) return
    setSubmittingAssistant(true)
    try {
      const res = await fetch('/api/subject-branch-teachers/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectBranchTeacherId: assistantModal.subjectBranchTeacherId,
          assistantId: selectedAssistantId,
          permissions: selectedPermissions
        })
      })
      if (res.ok) {
        showToast('Assistant permissions updated successfully', 'success')
        setAssistantModal({ show: false, subjectBranchTeacherId: '', subjectName: '', branchName: '' })
        window.location.reload()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to update assistant', 'error')
      }
    } finally {
      setSubmittingAssistant(false)
    }
  }

  const handleRemoveAssistant = async (assistantAssignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assistant?')) return
    try {
      const res = await fetch(`/api/subject-branch-teachers/assistant?id=${assistantAssignmentId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Assistant removed', 'success')
        window.location.reload()
      }
    } catch {
      showToast('Error removing assistant', 'error')
    }
  }

  // Query Admin Modal
  const [queryModal, setQueryModal] = useState<{
    show: boolean
    studentName: string
    subjectName: string
    batchName: string
  }>({ show: false, studentName: '', subjectName: '', batchName: '' })

  const handleConfirmEnrollment = async (enrollmentId: string, studentName: string, subjectId?: string, branchId?: string) => {
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: enrollmentId, action: 'TEACHER_CONFIRM' })
      })
      if (res.ok) {
        showToast(`Enrolment confirmed for ${studentName}`, 'success')
        setPendingList(prev => prev.filter(p => p.id !== enrollmentId))

        // Update local classList roster count immediately
        if (subjectId && branchId) {
          setClassList(prev => prev.map(cls => {
            if (cls.subject?.id === subjectId && cls.branch?.id === branchId) {
              return { ...cls, studentCount: (cls.studentCount || 0) + 1 }
            }
            return cls
          }))
        }
      }
    } catch {
      showToast('Error confirming enrolment', 'error')
    }
  }

  // Compute counts for stat cards
  const uniqueSubjectsCount = new Set(classList.map(c => c.subject.id)).size
  const uniqueBatchesCount = new Set(classList.map(c => c.subject.batch.id)).size
  const totalRosterStudentsCount = classList.reduce((sum, c) => sum + (c.studentCount || 0), 0)

  return (
    <div>
      {/* STAT CARDS — Fix 6: Solid Color Comic Treatment & Sentence Case */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{
          background: '#00bcd4',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>Assigned subjects</span>
            <span style={{ fontSize: '1.5rem' }}>📚</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{uniqueSubjectsCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', marginTop: '0.5rem', fontWeight: 700 }}>Active courses taught</div>
        </div>

        <div style={{
          background: '#2979ff',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>Assigned batches</span>
            <span style={{ fontSize: '1.5rem' }}>🎓</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{uniqueBatchesCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', marginTop: '0.5rem', fontWeight: 700 }}>Academic streams</div>
        </div>

        <div style={{
          background: '#aa00ff',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>Total roster students</span>
            <span style={{ fontSize: '1.5rem' }}>👥</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{totalRosterStudentsCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#ffffff', marginTop: '0.5rem', fontWeight: 700 }}>Active enrolled students</div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('CLASSES')}
          style={{
            background: activeTab === 'CLASSES' ? '#1a1a2e' : '#ffffff',
            color: activeTab === 'CLASSES' ? '#ffffff' : '#1a1a2e',
            border: '3px solid #1a1a2e',
            boxShadow: '4px 4px 0px #1a1a2e',
            borderRadius: '50px',
            padding: '0.65rem 1.5rem',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <BookOpen size={20} />
          <span>My Classes ({classList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CONFIRMATIONS')}
          style={{
            background: activeTab === 'CONFIRMATIONS' ? '#1a1a2e' : '#ffffff',
            color: activeTab === 'CONFIRMATIONS' ? '#ffffff' : '#1a1a2e',
            border: '3px solid #1a1a2e',
            boxShadow: '4px 4px 0px #1a1a2e',
            borderRadius: '50px',
            padding: '0.65rem 1.5rem',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}
        >
          <span>Pending Enrolment Confirmations</span>
          {pendingList.length > 0 && (
            <span style={{
              background: '#f50057',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 900,
              padding: '0.15rem 0.6rem',
              borderRadius: '50px',
              border: '2px solid #1a1a2e',
              boxShadow: '1px 1px 0px #1a1a2e',
              lineHeight: 1
            }}>
              {pendingList.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MY CLASSES */}
      {activeTab === 'CLASSES' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
            {classList.map((cls: any) => {
              const assistantObj = cls.assistants?.[0]
              let assistantPermissions: string[] = []
              if (assistantObj) {
                try { assistantPermissions = JSON.parse(assistantObj.permissions) } catch { assistantPermissions = [] }
              }

              return (
                <div
                  key={cls.id}
                  className="card"
                  style={{
                    padding: '1.75rem',
                    background: cls.subject.colour || '#2979ff',
                    color: '#ffffff',
                    border: '3px solid #1a1a2e',
                    boxShadow: '5px 5px 0px #1a1a2e',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{
                        backgroundColor: '#ffffff',
                        color: '#1a1a2e',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '50px',
                        border: '2px solid #1a1a2e'
                      }}>
                        {cls.subject.batch.name}
                      </span>

                      {/* Fix 13: Green Branch Pill */}
                      <span style={{
                        backgroundColor: '#00c853',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '50px',
                        border: '2px solid #1a1a2e',
                        boxShadow: '2px 2px 0px #1a1a2e'
                      }}>
                        📍 {cls.branch.name || 'Main Campus'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0.25rem 0', color: '#ffffff', textTransform: 'capitalize' }}>
                      {cls.subject.name}
                    </h3>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginBottom: '1.25rem' }}>
                      👥 {cls.studentCount} student(s) enrolled at {cls.branch.name}
                    </div>

                    {/* MY ASSISTANT PANEL */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(255,255,255,0.3)',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' }}>
                          My Assistant
                        </span>

                        {assistantObj ? (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => {
                                setSelectedAssistantId(assistantObj.assistant.id)
                                setSelectedPermissions(assistantPermissions)
                                setAssistantModal({
                                  show: true,
                                  subjectBranchTeacherId: cls.id,
                                  subjectName: cls.subject.name,
                                  branchName: cls.branch.name,
                                  existingAssistantId: assistantObj.id
                                })
                              }}
                              style={{ background: '#ffffff', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRemoveAssistant(assistantObj.id)}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #1a1a2e', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAssistantId('')
                              setSelectedPermissions([])
                              setAssistantModal({
                                show: true,
                                subjectBranchTeacherId: cls.id,
                                subjectName: cls.subject.name,
                                branchName: cls.branch.name
                              })
                            }}
                            style={{
                              background: '#00c853',
                              color: '#ffffff',
                              border: '1.5px solid #1a1a2e',
                              borderRadius: '50px',
                              padding: '0.2rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              cursor: 'pointer'
                            }}
                          >
                            + Add assistant
                          </button>
                        )}
                      </div>

                      {assistantObj ? (
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.5rem' }}>
                            🤝 {assistantObj.assistant.name}
                          </div>
                          {assistantPermissions.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {assistantPermissions.map((perm: string) => (
                                <span key={perm} style={{
                                  background: 'rgba(255,255,255,0.2)',
                                  color: '#ffffff',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '50px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  border: '1px solid rgba(255,255,255,0.4)'
                                }}>
                                  ✓ {perm}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, fontStyle: 'italic', fontWeight: 700 }}>
                          No assistant assigned for this subject branch.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fix 5: Quick Action Grid — 8 Solid Color Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/grading`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#aa00ff', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      🤖 AI Grading
                    </Link>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/buzzer`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#f50057', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      ⚡ Speed Buzzer
                    </Link>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/forum`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#2979ff', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      💬 Q&A Forum
                    </Link>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/performance`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#00bcd4', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      📊 Mark Analytics
                    </Link>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/lesson-planner`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#ff6d00', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      🧠 AI Planner
                    </Link>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/syllabus`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#00c853', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      🎯 Syllabus
                    </Link>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/calendar`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#ffab00', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      📅 Schedule
                    </Link>
                    <Link href={`/dashboard/teacher/subjects/${cls.subject.id}/recordings`} style={{ padding: '0.55rem 0.4rem', borderRadius: '50px', fontWeight: 900, fontSize: '0.75rem', color: '#ffffff', background: '#795548', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e', textAlign: 'center', textDecoration: 'none' }}>
                      📹 Recordings
                    </Link>
                  </div>
                </div>
              )
            })}

            {classList.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '16px', border: '3px dashed #cbd5e1' }}>
                <BookOpen size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>No classes assigned yet</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>Contact your Super Admin to get subject and branch assignments.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING ENROLMENT CONFIRMATIONS (STAGE 2) */}
      {activeTab === 'CONFIRMATIONS' && (
        <div className="fade-in">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.25rem', borderLeft: '4px solid #2979ff', paddingLeft: '12px' }}>
            Stage 2 Teacher Enrolment Confirmations
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pendingList.map((p: any) => (
              <div key={p.id} className="card" style={{
                padding: '1.5rem 1.75rem',
                background: '#ffffff',
                border: '3px solid #1a1a2e',
                borderLeft: '6px solid #00c853',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.65rem' }}>
                    {p.student.name} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>({p.student.email})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      background: '#00c853',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '50px',
                      border: '2px solid #1a1a2e',
                      boxShadow: '1px 1px 0px #1a1a2e',
                      textTransform: 'capitalize'
                    }}>
                      📚 Subject: {p.subject.name}
                    </span>

                    <span style={{
                      background: '#2979ff',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '50px',
                      border: '2px solid #1a1a2e',
                      boxShadow: '1px 1px 0px #1a1a2e'
                    }}>
                      🎓 Batch: {p.batch.name}
                    </span>

                    <span style={{
                      background: '#aa00ff',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '50px',
                      border: '2px solid #1a1a2e',
                      boxShadow: '1px 1px 0px #1a1a2e'
                    }}>
                      📍 Branch: {p.branch.name}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setQueryModal({ show: true, studentName: p.student.name, subjectName: p.subject.name, batchName: p.batch.name })}
                    style={{
                      padding: '0.55rem 1.25rem',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      background: '#ff6d00',
                      color: '#ffffff',
                      border: '3px solid #1a1a2e',
                      boxShadow: '4px 4px 0px #1a1a2e',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    💬 Query
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmEnrollment(p.id, p.student.name, p.subject.id, p.branch.id)}
                    className="btn-bob"
                    style={{
                      padding: '0.55rem 1.25rem',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      background: '#00c853',
                      color: '#ffffff',
                      border: '3px solid #1a1a2e',
                      boxShadow: '4px 4px 0px #1a1a2e',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ✓ Confirm enrolment
                  </button>
                </div>
              </div>
            ))}

            {pendingList.length === 0 && (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700, border: '3px dashed #cbd5e1' }}>
                No pending enrolment confirmations for your classes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGN ASSISTANT MODAL */}
      {assistantModal.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e', position: 'relative' }}>
            <button onClick={() => setAssistantModal({ show: false, subjectBranchTeacherId: '', subjectName: '', branchName: '' })} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.35rem 0' }}>Assign assistant</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '1.25rem' }}>
              Subject: <strong>{assistantModal.subjectName}</strong> ({assistantModal.branchName})
            </p>

            <form onSubmit={handleSaveAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Select assistant</label>
                <select
                  className="input-field"
                  value={selectedAssistantId}
                  onChange={e => setSelectedAssistantId(e.target.value)}
                  required
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                >
                  <option value="">Select assistant from list...</option>
                  {assistantsList.map(ast => (
                    <option key={ast.id} value={ast.id}>🤝 {ast.name} ({ast.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
                  Permission checkboxes (tick any combination):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {ASSISTANT_PERMISSIONS.map(perm => {
                    const isChecked = selectedPermissions.includes(perm)

                    return (
                      <label key={perm} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        background: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1.5px solid #1a1a2e',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedPermissions(selectedPermissions.filter(p => p !== perm))
                            } else {
                              setSelectedPermissions([...selectedPermissions, perm])
                            }
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span>{perm}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setAssistantModal({ show: false, subjectBranchTeacherId: '', subjectName: '', branchName: '' })} style={{ borderRadius: '50px', border: '3px solid #1a1a2e' }}>Cancel</button>
                <button type="submit" disabled={submittingAssistant || !selectedAssistantId} style={{ background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', borderRadius: '50px', padding: '0.6rem 1.25rem', fontWeight: 800 }}>Save assistant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN QUERY MODAL */}
      {queryModal.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e', position: 'relative', background: '#ffffff' }}>
            <button onClick={() => setQueryModal({ show: false, studentName: '', subjectName: '', batchName: '' })} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: '#1a1a2e' }}>Query Admin</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '1.25rem' }}>
              Send query regarding <strong>{queryModal.studentName}</strong> ({queryModal.subjectName} — {queryModal.batchName})
            </p>

            <form onSubmit={(e) => {
              e.preventDefault()
              showToast(`Query sent to Admin for ${queryModal.studentName}`, 'success')
              setQueryModal({ show: false, studentName: '', subjectName: '', batchName: '' })
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Message note for admin</label>
                <textarea
                  className="input-field"
                  placeholder="e.g. Please verify payment status or prerequisites for this student..."
                  required
                  rows={4}
                  style={{ width: '100%', border: '2px solid #1a1a2e', padding: '0.75rem', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setQueryModal({ show: false, studentName: '', subjectName: '', batchName: '' })} style={{ borderRadius: '50px', border: '3px solid #1a1a2e' }}>Cancel</button>
                <button type="submit" style={{ background: '#ff6d00', color: '#ffffff', border: '3px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', borderRadius: '50px', padding: '0.6rem 1.25rem', fontWeight: 800 }}>Send Query</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
