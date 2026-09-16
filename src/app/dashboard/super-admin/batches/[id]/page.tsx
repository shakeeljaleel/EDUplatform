'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { showToast } from '@/components/ToastContainer'
import { Users, BookOpen, Building2, Plus, ArrowLeft, Check, Layers, Settings, Trash2, Edit, MoreVertical, X, Sparkles } from '@/components/Icons'
import { getSubjectColor, getAcademicLevelColor } from '@/lib/subjectColors'

export default function SuperAdminBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: batchId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialTab = (searchParams.get('tab')?.toUpperCase() || 'SUBJECTS') as 'SUBJECTS' | 'STUDENTS' | 'TEACHERS' | 'SETTINGS'
  const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'STUDENTS' | 'TEACHERS' | 'SETTINGS'>(initialTab)

  const [batch, setBatch] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [allTeachers, setAllTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Tab 1: Add/Edit Subject Modal state
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [subjectDescription, setSubjectDescription] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [submittingSubject, setSubmittingSubject] = useState(false)

  // Reassignment Warning Modal state
  const [reassignModal, setReassignModal] = useState<{
    show: boolean
    teacherId: string
    teacherName: string
    targetSubjectId: string
    existingSubjectName: string
  }>({ show: false, teacherId: '', teacherName: '', targetSubjectId: '', existingSubjectName: '' })

  // Tab 2: Students Roster & Bulk actions state
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [bulkAssignSubjectId, setBulkAssignSubjectId] = useState('')
  const [processingBulk, setProcessingBulk] = useState(false)

  // Tab 3: Assign Teacher Modal state
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false)
  const [teacherModalTeacherId, setTeacherModalTeacherId] = useState('')
  const [teacherModalSubjectId, setTeacherModalSubjectId] = useState('')

  // Tab 4: Settings state
  const [editName, setEditName] = useState('')
  const [editAcademicLevel, setEditAcademicLevel] = useState('')
  const [editBranchId, setEditBranchId] = useState('')
  const [batchStatus, setBatchStatus] = useState('ACTIVE')
  const [savingSettings, setSavingSettings] = useState(false)

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

      if (branchesRes.ok) setBranches((await branchesRes.json()).branches || [])
      if (enrolledRes.ok) setEnrolledStudents((await enrolledRes.json()).students || [])
      if (studentsRes.ok) setAllStudents((await studentsRes.json()).users || [])
      if (teachersRes.ok) setAllTeachers((await teachersRes.json()).users || [])
      if (subjectsRes.ok) setSubjects((await subjectsRes.json()).subjects || [])
    } catch (err) {
      console.error('Failed to load batch data', err)
      showToast('Error loading batch details', 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- TAB 1: SUBJECT HANDLERS ---
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectName.trim()) return
    setSubmittingSubject(true)

    try {
      if (editingSubject) {
        const res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: subjectName.trim(), description: subjectDescription.trim() })
        })
        if (res.ok) {
          showToast(`Subject "${subjectName}" updated`, 'success')
          if (selectedTeacherId) {
            await assignTeacherToSubject(editingSubject.id, selectedTeacherId)
          }
          closeSubjectModal()
          fetchAllData()
        }
      } else {
        const res = await fetch(`/api/batches/${batchId}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subjectName.trim(),
            description: subjectDescription.trim(),
            teacherId: selectedTeacherId || undefined
          })
        })
        if (res.ok) {
          showToast(`Subject "${subjectName}" created`, 'success')
          closeSubjectModal()
          fetchAllData()
        } else {
          showToast('Failed to create subject', 'error')
        }
      }
    } finally {
      setSubmittingSubject(false)
    }
  }

  const closeSubjectModal = () => {
    setShowAddSubjectModal(false)
    setEditingSubject(null)
    setSubjectName('')
    setSubjectDescription('')
    setSelectedTeacherId('')
  }

  const handleDeleteSubject = async (subj: any) => {
    if (!confirm(`Are you sure you want to delete "${subj.name}"? This will remove all associated quizzes and enrollments.`)) return
    try {
      const res = await fetch(`/api/subjects/${subj.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast(`Subject "${subj.name}" removed`, 'success')
        fetchAllData()
      } else {
        showToast('Failed to delete subject', 'error')
      }
    } catch {
      showToast('Error deleting subject', 'error')
    }
  }

  const assignTeacherToSubject = async (subjectId: string, teacherId: string, force: boolean = false) => {
    const teacherObj = allTeachers.find(t => t.id === teacherId)
    const teacherName = teacherObj?.name || 'Teacher'

    try {
      const res = await fetch(`/api/subjects/${subjectId}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: teacherId, force })
      })

      const data = await res.json()
      if (res.ok) {
        if (data.warning) {
          setReassignModal({
            show: true,
            teacherId,
            teacherName,
            targetSubjectId: subjectId,
            existingSubjectName: data.existingSubjectName
          })
          return
        }
        showToast(`${teacherName} assigned to subject`, 'success')
        fetchAllData()
      } else {
        showToast(data.error || 'Failed to assign teacher', 'error')
      }
    } catch {
      showToast('Error assigning teacher', 'error')
    }
  }

  // --- TAB 2: STUDENTS HANDLERS ---
  const toggleSelectStudent = (userId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === enrolledStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(enrolledStudents.map(s => s.userId))
    }
  }

  const handleBulkAssignSubject = async () => {
    if (selectedStudentIds.length === 0 || !bulkAssignSubjectId) return
    setProcessingBulk(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_subject',
          studentIds: selectedStudentIds,
          subjectId: bulkAssignSubjectId
        })
      })
      if (res.ok) {
        showToast(`Assigned ${selectedStudentIds.length} student(s) to subject`, 'success')
        setSelectedStudentIds([])
        setBulkAssignSubjectId('')
        fetchAllData()
      }
    } finally {
      setProcessingBulk(false)
    }
  }

  const handleBulkRemoveStudents = async () => {
    if (selectedStudentIds.length === 0) return
    if (!confirm(`Are you sure you want to remove ${selectedStudentIds.length} student(s) from this batch?`)) return
    setProcessingBulk(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/students`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      })
      if (res.ok) {
        showToast(`Removed ${selectedStudentIds.length} student(s) from batch`, 'success')
        setSelectedStudentIds([])
        fetchAllData()
      }
    } finally {
      setProcessingBulk(false)
    }
  }

  // --- TAB 3: TEACHERS HANDLERS ---
  const handleAssignTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherModalTeacherId || !teacherModalSubjectId) return
    await assignTeacherToSubject(teacherModalSubjectId, teacherModalTeacherId)
    setShowAssignTeacherModal(false)
    setTeacherModalTeacherId('')
    setTeacherModalSubjectId('')
  }

  // --- TAB 4: SETTINGS HANDLERS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
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
        showToast('Batch settings updated successfully', 'success')
        fetchAllData()
      } else {
        showToast('Failed to update batch settings', 'error')
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const handleDeleteBatch = async () => {
    if (!confirm(`CAUTION: Are you sure you want to permanently delete batch "${batch?.name}"? This action cannot be undone.`)) return
    try {
      const res = await fetch(`/api/batches/${batchId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Batch deleted', 'success')
        router.push('/dashboard/super-admin/batches')
      } else {
        showToast('Failed to delete batch', 'error')
      }
    } catch {
      showToast('Error deleting batch', 'error')
    }
  }

  // Filter students by search
  const filteredStudents = enrolledStudents.filter(s =>
    s.user.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.user.email.toLowerCase().includes(studentSearch.toLowerCase())
  )

  // Teachers assigned list for Tab 3
  const assignedTeachersMap = new Map<string, { user: any; subjects: string[] }>()
  subjects.forEach(subj => {
    (subj.teachers || []).forEach((st: any) => {
      const curr = assignedTeachersMap.get(st.userId) || { user: st.user, subjects: [] }
      curr.subjects.push(subj.name)
      assignedTeachersMap.set(st.userId, curr)
    })
  })
  const assignedTeachersList = Array.from(assignedTeachersMap.values())

  if (loading) {
    return <div className="pulse" style={{ padding: '3rem', fontWeight: 800, color: '#64748b' }}>Loading batch control center...</div>
  }

  const levelColor = getAcademicLevelColor(batch?.academicLevel || '')

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Top Back Navigation */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link href="/dashboard/super-admin/batches" className="btn-back">
          <ArrowLeft size={16} /> Back to Batches Console
        </Link>
      </div>

      {/* Batch Header Banner */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: '#ffffff', borderLeft: `8px solid ${levelColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ backgroundColor: levelColor, color: '#ffffff', fontWeight: 800, textTransform: 'uppercase' }}>
                {batch?.academicLevel || 'Batch'}
              </span>
              {batch?.branch && (
                <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #3b82f6', fontWeight: 800 }}>
                  📍 {batch.branch.name}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{batch?.name}</h1>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.25rem' }}>
              {subjects.length} Subjects • {enrolledStudents.length} Students • {assignedTeachersList.length} Teachers
            </p>
          </div>
        </div>
      </div>

      {/* FOUR COMIC PILL TABS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { id: 'SUBJECTS', label: `Subjects (${subjects.length})`, icon: <BookOpen size={18} /> },
          { id: 'STUDENTS', label: `Students (${enrolledStudents.length})`, icon: <Users size={18} /> },
          { id: 'TEACHERS', label: `Teachers (${assignedTeachersList.length})`, icon: <Building2 size={18} /> },
          { id: 'SETTINGS', label: 'Settings', icon: <Settings size={18} /> },
        ].map(tab => (
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
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SUBJECTS */}
      {activeTab === 'SUBJECTS' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Subjects in this Batch</h2>
            <button
              className="btn-primary"
              onClick={() => setShowAddSubjectModal(true)}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={18} /> + Add Subject
            </button>
          </div>

          {/* Subjects Cards Grid in Comic Treatment */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {subjects.map((subj, idx) => {
              const cardBg = getSubjectColor(subj.name, idx)
              const assignedTeacher = subj.teachers?.[0]?.user
              const studentCount = subj._count?.enrollments || 0

              return (
                <div
                  key={subj.id}
                  style={{
                    background: cardBg,
                    color: '#ffffff',
                    borderRadius: '16px',
                    padding: '1.75rem',
                    border: '3px solid #1a1a2e',
                    boxShadow: '5px 5px 0px #1a1a2e',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>{subj.name}</h3>
                      
                      {/* Actions: Edit & Remove */}
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => {
                            setEditingSubject(subj)
                            setSubjectName(subj.name)
                            setSubjectDescription(subj.description || '')
                            setSelectedTeacherId(assignedTeacher?.id || '')
                            setShowAddSubjectModal(true)
                          }}
                          style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer' }}
                          title="Edit Subject"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(subj)}
                          style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer' }}
                          title="Remove Subject"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {subj.description && (
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.5rem', fontWeight: 600 }}>
                        {subj.description}
                      </p>
                    )}

                    <div style={{ marginTop: '1.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, opacity: 0.85 }}>Assigned Teacher</div>
                      {assignedTeacher ? (
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, marginTop: '0.2rem' }}>
                          👨‍🏫 {assignedTeacher.name} ({assignedTeacher.email})
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ff4d4d', marginTop: '0.2rem' }}>
                          ⚠️ No teacher assigned
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 800 }}>
                      👥 {studentCount} student(s) enrolled
                    </div>
                  </div>

                  {/* Assign Teacher Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.35rem', color: '#ffffff' }}>
                      Assign Teacher:
                    </label>
                    <select
                      className="input-field"
                      value={assignedTeacher?.id || ''}
                      onChange={e => {
                        if (e.target.value) {
                          assignTeacherToSubject(subj.id, e.target.value)
                        }
                      }}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 800,
                        border: '2px solid #1a1a2e',
                        minHeight: '40px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="">Select teacher to assign...</option>
                      {allTeachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}

            {subjects.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                <BookOpen size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}>No subjects added yet</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Click "+ Add Subject" above to create subjects for this batch.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === 'STUDENTS' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Student Enrolments</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Manage enrolled students and subject allocations.</p>
            </div>
            
            <Link
              href={`/dashboard/super-admin/students/import?batchId=${batchId}`}
              className="btn-primary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={18} /> + Add student (Import)
            </Link>
          </div>

          {/* Search & Bulk Controls */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search students by name or email..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ flex: 1, minWidth: '240px', minHeight: '42px' }}
            />

            {/* Bulk Actions Bar */}
            {selectedStudentIds.length > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedStudentIds.length} selected:
                </span>

                <select
                  className="input-field"
                  value={bulkAssignSubjectId}
                  onChange={e => setBulkAssignSubjectId(e.target.value)}
                  style={{ width: '180px', minHeight: '40px', fontSize: '0.85rem' }}
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleBulkAssignSubject}
                  disabled={processingBulk || !bulkAssignSubjectId}
                  className="btn-primary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 800 }}
                >
                  Assign to Subject
                </button>

                <button
                  onClick={handleBulkRemoveStudents}
                  disabled={processingBulk}
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Remove from Batch
                </button>
              </div>
            )}
          </div>

          {/* Students Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={enrolledStudents.length > 0 && selectedStudentIds.length === enrolledStudents.length}
                        onChange={toggleSelectAllStudents}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Student</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Enrolled Subjects & Status</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => {
                    const subjectEnrols = s.user.subjectEnrollments || []

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.userId)}
                            onChange={() => toggleSelectStudent(s.userId)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{s.user.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{s.user.email}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {subjectEnrols.map((se: any, idx: number) => {
                              const sColor = getSubjectColor(se.subject.name, idx)
                              return (
                                <span
                                  key={se.subject.id}
                                  style={{
                                    background: sColor,
                                    color: '#ffffff',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  {se.subject.name}
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.25)', padding: '1px 5px', borderRadius: '4px' }}>
                                    {se.status}
                                  </span>
                                </span>
                              )
                            })}

                            {subjectEnrols.length === 0 && (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                                No specific subjects enrolled
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            backgroundColor: s.user.profile?.paymentStatus === 'Paid' ? '#f0fdf4' : '#fffbe5',
                            color: s.user.profile?.paymentStatus === 'Paid' ? '#166534' : '#b45309',
                            border: `1px solid ${s.user.profile?.paymentStatus === 'Paid' ? '#86efac' : '#fde68a'}`,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 800
                          }}>
                            💳 {s.user.profile?.paymentStatus || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                        No students enrolled in this batch. Click <strong>"+ Add student"</strong> to import students.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEACHERS */}
      {activeTab === 'TEACHERS' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Assigned Teachers</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Teachers assigned to teach subjects in this batch.</p>
            </div>
            
            <button
              className="btn-primary"
              onClick={() => setShowAssignTeacherModal(true)}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={18} /> + Assign Teacher
            </button>
          </div>

          {/* Teachers Roster List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Teacher Name</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Email</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 800 }}>Assigned Subject(s) in Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedTeachersList.map(t => (
                    <tr key={t.user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                        👨‍🏫 {t.user.name}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                        {t.user.email}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {t.subjects.map((subjName, idx) => {
                            const sColor = getSubjectColor(subjName, idx)
                            return (
                              <span
                                key={subjName}
                                style={{
                                  background: sColor,
                                  color: '#ffffff',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800
                                }}
                              >
                                {subjName}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {assignedTeachersList.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                        No teachers currently assigned to subjects in this batch. Click <strong>"+ Assign Teacher"</strong> above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="fade-in">
          <div className="card" style={{ padding: '2rem', maxWidth: '640px', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.25rem' }}>
              Batch Configuration
            </h2>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  Batch Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  Academic Level
                </label>
                <select
                  className="input-field"
                  value={editAcademicLevel}
                  onChange={e => setEditAcademicLevel(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="O Level">O Level</option>
                  <option value="AS Level">AS Level</option>
                  <option value="A Level">A Level</option>
                  <option value="Grade 11">Grade 11</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  Assigned Branch
                </label>
                <select
                  className="input-field"
                  value={editBranchId}
                  onChange={e => setEditBranchId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="">Global / No branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingSettings}
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 800 }}
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* DANGER ZONE */}
          <div className="card" style={{ padding: '2rem', maxWidth: '640px', border: '2px solid #ef4444', borderRadius: '14px', background: '#fef2f2' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626', marginBottom: '0.5rem' }}>
              ⚠️ Danger Zone
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '1.25rem', fontWeight: 600 }}>
              Permanently remove or archive this batch and its associated configurations.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleDeleteBatch}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUBJECT */}
      {showAddSubjectModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '8px 8px 0px #1a1a2e' }}>
            <button
              onClick={closeSubjectModal}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem' }}>
              {editingSubject ? 'Edit Subject' : '+ Add New Subject'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 600 }}>
              {editingSubject ? 'Update subject details and teacher assignment.' : 'Create a new subject and assign a lead teacher.'}
            </p>

            <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Subject Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Biology, Chemistry"
                  required
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Description (Optional)</label>
                <textarea
                  className="input-field"
                  placeholder="Brief description of the subject syllabus..."
                  value={subjectDescription}
                  onChange={e => setSubjectDescription(e.target.value)}
                  style={{ width: '100%', minHeight: '70px', padding: '0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Assign Teacher</label>
                <select
                  className="input-field"
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="">No teacher assigned yet</option>
                  {allTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={closeSubjectModal} style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingSubject} style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}>
                  {submittingSubject ? 'Saving...' : (editingSubject ? 'Save Changes' : 'Create Subject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN TEACHER (TAB 3) */}
      {showAssignTeacherModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '8px 8px 0px #1a1a2e' }}>
            <button
              onClick={() => setShowAssignTeacherModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem' }}>
              Assign Teacher to Subject
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 600 }}>
              Select a teacher and choose the subject they will teach in this batch.
            </p>

            <form onSubmit={handleAssignTeacherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Select Teacher</label>
                <select
                  className="input-field"
                  required
                  value={teacherModalTeacherId}
                  onChange={e => setTeacherModalTeacherId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="">Choose a teacher...</option>
                  {allTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Select Subject</label>
                <select
                  className="input-field"
                  required
                  value={teacherModalSubjectId}
                  onChange={e => setTeacherModalSubjectId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  <option value="">Choose a subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAssignTeacherModal(false)} style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}>
                  Assign Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REASSIGNMENT WARNING */}
      {reassignModal.show && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '2rem', position: 'relative', borderRadius: '16px', border: '3px solid #ff6d00', boxShadow: '8px 8px 0px #ff6d00' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>
              ⚠️ Teacher Already Assigned
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600, marginBottom: '1.5rem', lineHeight: 1.5 }}>
              This teacher (<strong>{reassignModal.teacherName}</strong>) is already assigned to <strong>{reassignModal.existingSubjectName}</strong> in this batch. Reassign?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setReassignModal({ show: false, teacherId: '', teacherName: '', targetSubjectId: '', existingSubjectName: '' })}
                style={{ padding: '0.65rem 1.25rem', fontWeight: 800 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const { targetSubjectId, teacherId } = reassignModal
                  setReassignModal({ show: false, teacherId: '', teacherName: '', targetSubjectId: '', existingSubjectName: '' })
                  assignTeacherToSubject(targetSubjectId, teacherId, true)
                }}
                style={{ padding: '0.65rem 1.25rem', fontWeight: 800, background: '#ff6d00', borderColor: '#1a1a2e' }}
              >
                Reassign Teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
