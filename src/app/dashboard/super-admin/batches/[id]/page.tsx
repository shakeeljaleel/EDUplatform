'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { showToast } from '@/components/ToastContainer'
import { Users, BookOpen, Building2, Plus, ArrowLeft, Check, Layers } from '@/components/Icons'

export default function SuperAdminBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: batchId } = use(params)

  const [batch, setBatch] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [allTeachers, setAllTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [addStudentId, setAddStudentId] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  // New subject modal state
  const [newSubjectName, setNewSubjectName] = useState('')
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [addingSubject, setAddingSubject] = useState(false)

  // Subject teacher mapping: subjectId -> teacherId
  const [assigningTeacher, setAssigningTeacher] = useState<Record<string, boolean>>({})

  // Edit batch state
  const [editingBatch, setEditingBatch] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAcademicLevel, setEditAcademicLevel] = useState('')
  const [editBranchId, setEditBranchId] = useState('')

  useEffect(() => {
    fetchAllData()
  }, [batchId])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [batchRes, branchesRes, enrolledRes, studentsRes, teachersRes, subjectsRes] = await Promise.all([
        fetch(`/api/batches`),
        fetch(`/api/branches`),
        fetch(`/api/batches/${batchId}/students`),
        fetch(`/api/users?role=STUDENT`),
        fetch(`/api/users?role=TEACHER`),
        fetch(`/api/batches/${batchId}/subjects`),
      ])

      if (batchRes.ok) {
        const data = await batchRes.json()
        const currentBatch = data.batches?.find((b: any) => b.id === batchId)
        if (currentBatch) {
          setBatch(currentBatch)
          setEditName(currentBatch.name)
          setEditAcademicLevel(currentBatch.academicLevel)
          setEditBranchId(currentBatch.branchId || '')
        }
      }

      if (branchesRes.ok) {
        setBranches((await branchesRes.json()).branches || [])
      }

      if (enrolledRes.ok) {
        setEnrolledStudents((await enrolledRes.json()).students || [])
      }

      if (studentsRes.ok) {
        setAllStudents((await studentsRes.json()).users || [])
      }

      if (teachersRes.ok) {
        setAllTeachers((await teachersRes.json()).users || [])
      }

      if (subjectsRes.ok) {
        setSubjects((await subjectsRes.json()).subjects || [])
      }
    } catch (err) {
      console.error('Failed to load batch data', err)
      showToast('Error loading batch details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addStudentId) return
    setAddingStudent(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: addStudentId }),
      })
      if (res.ok) {
        showToast('Student enrolled in batch successfully', 'success')
        setAddStudentId('')
        // Refresh enrolled students
        const enrolledRes = await fetch(`/api/batches/${batchId}/students`)
        if (enrolledRes.ok) setEnrolledStudents((await enrolledRes.json()).students || [])
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to add student', 'error')
      }
    } finally {
      setAddingStudent(false)
    }
  }

  const handleRemoveStudent = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this batch?`)) return
    try {
      const res = await fetch(`/api/batches/${batchId}/students?userId=${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast(`Removed ${userName} from batch`, 'success')
        setEnrolledStudents(prev => prev.filter(s => s.userId !== userId))
      } else {
        showToast('Failed to remove student', 'error')
      }
    } catch (err) {
      showToast('Network error while removing student', 'error')
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return
    setAddingSubject(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubjectName.trim() }),
      })
      if (res.ok) {
        showToast(`Subject "${newSubjectName}" created`, 'success')
        setNewSubjectName('')
        setShowAddSubject(false)
        const subjectsRes = await fetch(`/api/batches/${batchId}/subjects`)
        if (subjectsRes.ok) setSubjects((await subjectsRes.json()).subjects || [])
      } else {
        showToast('Failed to create subject', 'error')
      }
    } finally {
      setAddingSubject(false)
    }
  }

  const handleAssignTeacher = async (subjectId: string, teacherId: string) => {
    if (!teacherId) return
    setAssigningTeacher(prev => ({ ...prev, [subjectId]: true }))
    try {
      const res = await fetch(`/api/subjects/${subjectId}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: teacherId }),
      })
      if (res.ok) {
        showToast('Teacher assigned successfully', 'success')
        const subjectsRes = await fetch(`/api/batches/${batchId}/subjects`)
        if (subjectsRes.ok) setSubjects((await subjectsRes.json()).subjects || [])
      } else {
        showToast('Failed to assign teacher', 'error')
      }
    } finally {
      setAssigningTeacher(prev => ({ ...prev, [subjectId]: false }))
    }
  }

  const handleSaveBatchDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          academicLevel: editAcademicLevel,
          branchId: editBranchId || null
        })
      })
      if (res.ok) {
        showToast('Batch updated successfully', 'success')
        setEditingBatch(false)
        fetchAllData()
      } else {
        showToast('Failed to update batch', 'error')
      }
    } catch (err) {
      showToast('Error updating batch', 'error')
    }
  }

  const enrolledUserIds = new Set(enrolledStudents.map(s => s.userId))
  const availableStudents = allStudents.filter(s => 
    !enrolledUserIds.has(s.id) &&
    (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
  )

  if (loading) {
    return <div className="pulse" style={{ padding: '2rem', fontWeight: 800, color: '#64748b' }}>Loading batch management portal...</div>
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link href="/dashboard/super-admin/batches" className="btn-back">
          <ArrowLeft size={16} /> Back to Batches Console
        </Link>
      </div>

      {/* Header Banner */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: '#ffffff', borderLeft: '8px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-level" style={{ textTransform: 'uppercase', fontWeight: 800 }}>{batch?.academicLevel || 'Batch'}</span>
              {batch?.branch && (
                <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #3b82f6', fontWeight: 800 }}>
                  📍 {batch.branch.name}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{batch?.name}</h1>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Created on {new Date(batch?.createdAt || Date.now()).toLocaleDateString()} • {enrolledStudents.length} Students Enrolled • {subjects.length} Subjects
            </p>
          </div>

          <button 
            className="btn-secondary"
            onClick={() => setEditingBatch(!editingBatch)}
            style={{ fontWeight: 800, padding: '0.65rem 1.25rem' }}
          >
            {editingBatch ? 'Cancel Editing' : 'Edit Batch Details'}
          </button>
        </div>

        {/* Edit Batch Form */}
        {editingBatch && (
          <form onSubmit={handleSaveBatchDetails} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Batch Name</label>
              <input type="text" className="input-field" required value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Academic Level</label>
              <select className="input-field" value={editAcademicLevel} onChange={e => setEditAcademicLevel(e.target.value)}>
                <option value="O Level">O Level</option>
                <option value="AS">AS</option>
                <option value="A Level">A Level</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Assigned Branch</label>
              <select className="input-field" value={editBranchId} onChange={e => setEditBranchId(e.target.value)}>
                <option value="">No Branch Assigned</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ height: '44px' }}>Save Batch Changes</button>
          </form>
        )}
      </div>

      {/* Main Grid: Left = Students, Right = Subjects & Teachers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem' }}>
        
        {/* LEFT COLUMN: Student Roster Management */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={22} color="#10b981" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Batch Student Roster</h2>
            </div>
            <span className="badge" style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #10b981', fontWeight: 800 }}>
              {enrolledStudents.length} Students
            </span>
          </div>

          {/* Add Student Section */}
          <form onSubmit={handleAddStudent} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
              Add Student to Batch
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="input-field"
                value={addStudentId}
                onChange={e => setAddStudentId(e.target.value)}
                style={{ flex: 1, minHeight: '44px' }}
                required
              >
                <option value="">Select a student to add...</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
              </select>
              <button type="submit" className="btn-primary" disabled={addingStudent || !addStudentId} style={{ minHeight: '44px', whiteSpace: 'nowrap', padding: '0.5rem 1.25rem' }}>
                {addingStudent ? 'Adding...' : '+ Add'}
              </button>
            </div>
          </form>

          {/* Enrolled Students List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {enrolledStudents.map(enrollment => (
              <div 
                key={enrollment.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem', backgroundColor: '#ffffff', borderRadius: '10px',
                  border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0fdf4', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#059669' }}>
                    {enrollment.user.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{enrollment.user.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{enrollment.user.email}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveStudent(enrollment.userId, enrollment.user.name)}
                  style={{
                    background: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444',
                    padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                  }}
                  title="Remove student from batch"
                >
                  Remove
                </button>
              </div>
            ))}

            {enrolledStudents.length === 0 && (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontWeight: 600 }}>
                No students currently enrolled in this batch.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Subjects & Teacher Assignment */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={22} color="#3b82f6" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Subjects & Teacher Assignments</h2>
            </div>
            <button className="btn-secondary" onClick={() => setShowAddSubject(!showAddSubject)} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 800 }}>
              {showAddSubject ? 'Cancel' : '+ New Subject'}
            </button>
          </div>

          {/* Add Subject Form */}
          {showAddSubject && (
            <form onSubmit={handleCreateSubject} style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem', color: '#1e40af' }}>
                Subject Name (e.g. Mathematics, Physics)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Biology"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  style={{ flex: 1, minHeight: '44px' }}
                  required
                />
                <button type="submit" className="btn-primary" disabled={addingSubject} style={{ minHeight: '44px', whiteSpace: 'nowrap', padding: '0.5rem 1.25rem' }}>
                  {addingSubject ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}

          {/* Subjects List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {subjects.map(subject => {
              const assignedTeachers = subject.teachers || []

              return (
                <div 
                  key={subject.id}
                  style={{
                    padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px',
                    border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{subject.name}</h3>
                    <span className="badge" style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.75rem' }}>
                      {assignedTeachers.length} Teacher(s) Assigned
                    </span>
                  </div>

                  {/* Teacher Assignment Select */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                      Assign / Reassign Teacher to {subject.name}:
                    </label>
                    <select
                      className="input-field"
                      onChange={e => handleAssignTeacher(subject.id, e.target.value)}
                      defaultValue=""
                      style={{ width: '100%', minHeight: '40px', fontSize: '0.85rem' }}
                      disabled={assigningTeacher[subject.id]}
                    >
                      <option value="" disabled>Select teacher to assign...</option>
                      {allTeachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                      ))}
                    </select>
                  </div>

                  {/* Currently Assigned Teachers Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {assignedTeachers.map((st: any) => (
                      <div 
                        key={st.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.35rem 0.75rem', borderRadius: '9999px',
                          background: '#f0fdf4', border: '1px solid #10b981', color: '#059669',
                          fontSize: '0.8rem', fontWeight: 800
                        }}
                      >
                        <span>👨‍🏫 {st.user.name}</span>
                      </div>
                    ))}
                    {assignedTeachers.length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                        ⚠️ No teacher assigned to this subject yet.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {subjects.length === 0 && (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontWeight: 600 }}>
                No subjects created in this batch yet.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
