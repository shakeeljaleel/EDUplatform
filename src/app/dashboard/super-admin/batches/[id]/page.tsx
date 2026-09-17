'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { showToast } from '@/components/ToastContainer'
import { Users, BookOpen, Building2, Plus, ArrowLeft, Layers, Settings, Trash2, Edit, X, Archive, Check, Shield } from '@/components/Icons'
import { getAcademicLevelColor } from '@/lib/subjectColors'
import StatusBadge from '@/components/StatusBadge'

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

function formatBranchLabel(name: string): string {
  if (!name) return ''
  let cleaned = name.trim()

  // Collapse repetitive "BRANCH" or "branch" tokens
  cleaned = cleaned.replace(/\b(branch)(\s+\1)+\b/gi, 'Branch')

  // Split words and sanitize
  const words = cleaned.split(/\s+/).filter(Boolean)
  const titleCased = words.map(w => {
    if (w.toUpperCase() === 'BRANCH') return 'Branch'
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })

  // Remove consecutive duplicates of 'Branch'
  const result: string[] = []
  for (const word of titleCased) {
    if (word === 'Branch' && result.length > 0 && result[result.length - 1] === 'Branch') {
      continue
    }
    result.push(word)
  }

  return result.join(' ')
}

export default function SuperAdminBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: batchId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialTab = (searchParams.get('tab')?.toUpperCase() || 'OVERVIEW') as 'OVERVIEW' | 'BRANCHES' | 'SUBJECTS' | 'STUDENTS' | 'SETTINGS'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BRANCHES' | 'SUBJECTS' | 'STUDENTS' | 'SETTINGS'>(initialTab)

  const [batchData, setBatchData] = useState<any>(null)
  const [allBranches, setAllBranches] = useState<any[]>([])
  const [allTeachers, setAllTeachers] = useState<any[]>([])
  const [allAssistants, setAllAssistants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Branch Tab Modals
  const [showAddBranchModal, setShowAddBranchModal] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchAddress, setNewBranchAddress] = useState('')
  const [newBranchType, setNewBranchType] = useState('Physical')
  const [submittingBranch, setSubmittingBranch] = useState(false)

  // Subject Tab Modals
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [subjectColour, setSubjectColour] = useState('#2979ff')
  const [subjectDescription, setSubjectDescription] = useState('')
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [submittingSubject, setSubmittingSubject] = useState(false)

  // Add Teacher Modal (per branch)
  const [teacherModal, setTeacherModal] = useState<{
    show: boolean
    subjectId: string
    branchId: string
    branchName: string
    subjectName: string
  }>({ show: false, subjectId: '', branchId: '', branchName: '', subjectName: '' })
  const [teacherIdToAssign, setTeacherIdToAssign] = useState('')

  // Assign Assistant Modal (per teacher per subject per branch)
  const [assistantModal, setAssistantModal] = useState<{
    show: boolean
    subjectBranchTeacherId: string
    teacherName: string
    subjectName: string
    branchName: string
    existingAssistantId?: string
    existingPermissions?: string[]
  }>({ show: false, subjectBranchTeacherId: '', teacherName: '', subjectName: '', branchName: '' })

  const [selectedAssistantId, setSelectedAssistantId] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [submittingAssistant, setSubmittingAssistant] = useState(false)

  // Student Tab state
  const [branchFilter, setBranchFilter] = useState<string>('ALL')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [bulkAssignSubjectId, setBulkAssignSubjectId] = useState('')
  const [changeBranchTarget, setChangeBranchTarget] = useState<any | null>(null)
  const [selectedNewBranchId, setSelectedNewBranchId] = useState<string>('')
  const [updatingBranch, setUpdatingBranch] = useState(false)

  // Settings Tab state
  const [editName, setEditName] = useState('')
  const [editAcademicLevel, setEditAcademicLevel] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    fetchBatchDetail()
    fetchMetadata()
  }, [batchId])

  const fetchBatchDetail = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/batches/${batchId}`)
      if (res.ok) {
        const data = await res.json()
        setBatchData(data.batch)
        setEditName(data.batch.name)
        setEditAcademicLevel(data.batch.academicLevel)
        setEditDescription(data.batch.description || '')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchMetadata = async () => {
    try {
      const [branchesRes, teachersRes, assistantsRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/users?role=TEACHER'),
        fetch('/api/users?role=ASSISTANT')
      ])
      if (branchesRes.ok) setAllBranches((await branchesRes.json()).branches || [])
      if (teachersRes.ok) setAllTeachers((await teachersRes.json()).users || [])
      if (assistantsRes.ok) setAllAssistants((await assistantsRes.json()).users || [])
    } catch (e) {
      console.error('Failed to fetch metadata', e)
    }
  }

  // --- BRANCH TAB HANDLERS ---
  const handleAddBranchToBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingBranch(true)
    try {
      const body = selectedBranchId
        ? { branchId: selectedBranchId }
        : { name: newBranchName, address: newBranchAddress, type: newBranchType }

      const res = await fetch(`/api/batches/${batchId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        showToast('Branch added to batch', 'success')
        setShowAddBranchModal(false)
        setSelectedBranchId('')
        setNewBranchName('')
        setNewBranchAddress('')
        fetchBatchDetail()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to add branch', 'error')
      }
    } finally {
      setSubmittingBranch(false)
    }
  }

  const handleRemoveBranch = async (branchId: string, branchName: string) => {
    // First preview affected counts
    try {
      const prevRes = await fetch(`/api/batches/${batchId}/branches?branchId=${branchId}&preview=true`, { method: 'DELETE' })
      const prevData = await prevRes.json()

      const warningMsg = `This will unenrol ${prevData.affectedStudentsCount || 0} students and remove ${prevData.affectedTeachersCount || 0} teacher assignments. Continue?`
      if (!confirm(warningMsg)) return

      const res = await fetch(`/api/batches/${batchId}/branches?branchId=${branchId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast(`Branch "${branchName}" removed from batch`, 'success')
        fetchBatchDetail()
      }
    } catch {
      showToast('Error removing branch', 'error')
    }
  }

  // --- SUBJECT TAB HANDLERS ---
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectName.trim()) return
    setSubmittingSubject(true)
    try {
      if (editingSubject) {
        const res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: subjectName.trim(), colour: subjectColour, description: subjectDescription.trim() })
        })
        if (res.ok) {
          showToast(`Subject "${subjectName}" updated`, 'success')
          setShowAddSubjectModal(false)
          setEditingSubject(null)
          fetchBatchDetail()
        }
      } else {
        const res = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            name: subjectName.trim(),
            colour: subjectColour,
            description: subjectDescription.trim()
          })
        })
        if (res.ok) {
          showToast(`Subject "${subjectName}" added`, 'success')
          setShowAddSubjectModal(false)
          setSubjectName('')
          setSubjectDescription('')
          fetchBatchDetail()
        } else {
          const data = await res.json()
          showToast(data.error || 'Failed to add subject', 'error')
        }
      }
    } finally {
      setSubmittingSubject(false)
    }
  }

  const handleDeleteSubject = async (subject: any) => {
    if (!confirm(`Are you sure you want to remove subject "${subject.name}"?`)) return
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast(`Subject "${subject.name}" deleted`, 'success')
        fetchBatchDetail()
      }
    } catch {
      showToast('Error deleting subject', 'error')
    }
  }

  // Teacher assignment to Subject-Branch
  const handleAssignTeacher = async () => {
    if (!teacherIdToAssign || !teacherModal.subjectId || !teacherModal.branchId) return
    try {
      const res = await fetch('/api/subject-branch-teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: teacherModal.subjectId,
          branchId: teacherModal.branchId,
          teacherId: teacherIdToAssign
        })
      })
      if (res.ok) {
        showToast('Teacher assigned', 'success')
        setTeacherModal({ show: false, subjectId: '', branchId: '', branchName: '', subjectName: '' })
        setTeacherIdToAssign('')
        fetchBatchDetail()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to assign teacher', 'error')
      }
    } catch {
      showToast('Error assigning teacher', 'error')
    }
  }

  const handleRemoveTeacher = async (sbtId: string, teacherName: string) => {
    // Check if only teacher
    try {
      const checkRes = await fetch(`/api/subject-branch-teachers?id=${sbtId}&checkOnly=true`, { method: 'DELETE' })
      const checkData = await checkRes.json()

      if (checkData.isOnlyTeacher) {
        const warn = `This is the only teacher for this subject at this branch. Removing them will leave the subject unassigned. Continue?`
        if (!confirm(warn)) return
      } else {
        if (!confirm(`Remove ${teacherName} from this subject branch?`)) return
      }

      const res = await fetch(`/api/subject-branch-teachers?id=${sbtId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Teacher removed', 'success')
        fetchBatchDetail()
      }
    } catch {
      showToast('Error removing teacher', 'error')
    }
  }

  // Assistant Assignment Handlers
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
        showToast('Assistant assignment saved', 'success')
        setAssistantModal({ show: false, subjectBranchTeacherId: '', teacherName: '', subjectName: '', branchName: '' })
        fetchBatchDetail()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to save assistant', 'error')
      }
    } finally {
      setSubmittingAssistant(false)
    }
  }

  const handleRemoveAssistant = async (assistantAssignmentId: string) => {
    if (!confirm('Remove assistant from this teacher assignment?')) return
    try {
      const res = await fetch(`/api/subject-branch-teachers/assistant?id=${assistantAssignmentId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Assistant removed', 'success')
        fetchBatchDetail()
      }
    } catch {
      showToast('Error removing assistant', 'error')
    }
  }

  const handleChangeBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeBranchTarget || !selectedNewBranchId) return
    setUpdatingBranch(true)
    try {
      const res = await fetch('/api/student-enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: changeBranchTarget.id,
          action: 'CHANGE_BRANCH',
          newBranchId: selectedNewBranchId
        })
      })

      if (res.ok) {
        showToast(`Student ${changeBranchTarget.student.name} moved to new branch`, 'success')
        setChangeBranchTarget(null)
        setSelectedNewBranchId('')
        fetchBatchDetail()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to change branch', 'error')
      }
    } catch {
      showToast('Network error while changing branch', 'error')
    } finally {
      setUpdatingBranch(false)
    }
  }

  // --- SETTINGS HANDLERS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editAcademicLevel !== batchData.academicLevel) {
      const confirmed = confirm('Changing the academic level will affect how the AI chatbot responds to students in this batch. Continue?')
      if (!confirmed) return
    }

    setSavingSettings(true)
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          academicLevel: editAcademicLevel,
          description: editDescription
        })
      })
      if (res.ok) {
        showToast('Batch updated', 'success')
        setBatchData((prev: any) => prev ? { ...prev, name: editName, academicLevel: editAcademicLevel, description: editDescription } : prev)
        fetchBatchDetail()
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const handleToggleArchive = async () => {
    const newStatus = batchData.status === 'archived' ? 'active' : 'archived'
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        showToast(`Batch is now ${newStatus}`, 'success')
        fetchBatchDetail()
      }
    } catch {
      showToast('Error updating batch status', 'error')
    }
  }

  const handleDeleteBatch = async () => {
    const confirmInput = prompt(`Type "${batchData.name}" to confirm permanent deletion:`)
    if (confirmInput !== batchData.name) {
      if (confirmInput !== null) showToast('Name mismatch', 'error')
      return
    }

    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: confirmInput })
      })
      if (res.ok) {
        showToast('Batch deleted', 'success')
        router.push('/dashboard/super-admin/batches')
      }
    } catch {
      showToast('Error deleting batch', 'error')
    }
  }

  if (loading || !batchData) {
    return <div className="pulse" style={{ padding: '3rem', fontWeight: 800, color: '#64748b' }}>Loading batch detail console...</div>
  }

  const levelColor = getAcademicLevelColor(editAcademicLevel || batchData.academicLevel)

  // Filtered Students
  const filteredStudents = (batchData.studentEnrollments || []).filter((e: any) => {
    if (branchFilter === 'ALL') return true
    return e.branchId === branchFilter
  })

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/super-admin/batches" className="btn-back">
          <ArrowLeft size={16} /> Back to Batches
        </Link>
      </div>

      {/* Batch Header Banner */}
      <div className="card" style={{
        padding: '2rem',
        marginBottom: '2rem',
        background: levelColor,
        color: '#ffffff',
        border: '3px solid #1a1a2e',
        borderRadius: '20px',
        boxShadow: '6px 6px 0px #1a1a2e'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#ffffff',
                color: levelColor,
                fontWeight: 900,
                border: '2px solid #1a1a2e',
                boxShadow: '2px 2px 0px #1a1a2e',
                padding: '0.35rem 0.85rem',
                borderRadius: '50px',
                fontSize: '0.85rem'
              }}>
                {batchData.academicLevel}
              </span>

              {batchData.batchBranches.map((bb: any) => (
                <span key={bb.branch.id} style={{
                  backgroundColor: bb.branch.colour || '#ffffff',
                  color: '#ffffff',
                  border: '2px solid #1a1a2e',
                  boxShadow: '2px 2px 0px #1a1a2e',
                  fontWeight: 900,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '50px',
                  fontSize: '0.85rem'
                }}>
                  📍 {formatBranchLabel(bb.branch.name)}
                </span>
              ))}
            </div>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', margin: 0 }}>
              {batchData.name}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 800, fontSize: '1.05rem', marginTop: '0.5rem' }}>
              {batchData.stats.totalBranches} branches • {batchData.stats.totalSubjects} subjects • {batchData.stats.totalStudents} students • {batchData.stats.totalTeachers} teachers • {batchData.stats.totalAssistants} assistants
            </p>
          </div>
        </div>
      </div>

      {/* 5 COMIC PILL TABS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: <Layers size={18} /> },
          { id: 'BRANCHES', label: 'Branches', count: batchData.stats.totalBranches, icon: <Building2 size={18} /> },
          { id: 'SUBJECTS', label: 'Subjects', count: batchData.stats.totalSubjects, icon: <BookOpen size={18} /> },
          { id: 'STUDENTS', label: 'Students', count: batchData.stats.totalStudents, icon: <Users size={18} /> },
          { id: 'SETTINGS', label: 'Settings', icon: <Settings size={18} /> },
        ].map(tab => {
          const isSelected = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: isSelected ? '#1a1a2e' : '#ffffff',
                color: isSelected ? '#ffffff' : '#1a1a2e',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
                borderRadius: '50px',
                padding: '0.65rem 1.25rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  background: isSelected ? '#ffffff' : '#1a1a2e',
                  color: isSelected ? '#1a1a2e' : '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '50px'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="fade-in">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.25rem' }}>Branch Performance Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {batchData.branchSummary.map((bs: any) => (
              <div key={bs.branchId} className="card" style={{
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e',
                padding: '1.5rem',
                borderTop: `8px solid ${bs.branchColour || '#2979ff'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{formatBranchLabel(bs.branchName)}</h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#f1f5f9', border: '1.5px solid #1a1a2e', padding: '0.2rem 0.6rem', borderRadius: '50px' }}>
                    {bs.branchType}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.95rem', fontWeight: 800 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                    <span>Enrolled Students:</span>
                    <span style={{ color: '#00c853' }}>👥 {bs.studentCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                    <span>Running Subjects:</span>
                    <span style={{ color: '#2979ff' }}>📚 {bs.subjectCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                    <span>Assigned Teachers:</span>
                    <span style={{ color: '#aa00ff' }}>👨‍🏫 {bs.teacherCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BRANCHES */}
      {activeTab === 'BRANCHES' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Branches Running This Batch</h2>
            <button
              onClick={() => setShowAddBranchModal(true)}
              style={{
                padding: '0.65rem 1.25rem',
                fontWeight: 800,
                background: '#00c853',
                color: '#ffffff',
                borderRadius: '50px',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Plus size={18} /> + Add branch
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {batchData.batchBranches.map((bb: any) => {
              const b = bb.branch
              const branchSummary = batchData.branchSummary.find((s: any) => s.branchId === b.id)

              return (
                <div key={b.id} className="card" style={{
                  padding: '1.75rem',
                  border: '3px solid #1a1a2e',
                  borderRadius: '16px',
                  boxShadow: '5px 5px 0px #1a1a2e',
                  borderLeft: `8px solid ${b.colour || '#00c853'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{formatBranchLabel(b.name)}</h3>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#e2e8f0', color: '#1a1a2e', border: '1.5px solid #1a1a2e', padding: '0.2rem 0.6rem', borderRadius: '50px', display: 'inline-block', marginTop: '0.35rem' }}>
                        {b.type}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveBranch(b.id, b.name)}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}
                      title="Remove branch from batch"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', fontSize: '0.9rem', fontWeight: 800 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Enrolled Students:</span>
                      <span style={{ color: '#00c853' }}>👥 {branchSummary?.studentCount || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Running Subjects:</span>
                      <span style={{ color: '#2979ff' }}>📚 {branchSummary?.subjectCount || 0}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SUBJECTS */}
      {activeTab === 'SUBJECTS' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Batch Subjects & Teacher Breakdown</h2>
            <button
              onClick={() => {
                setEditingSubject(null)
                setSubjectName('')
                setSubjectColour('#2979ff')
                setSubjectDescription('')
                setShowAddSubjectModal(true)
              }}
              style={{
                padding: '0.65rem 1.25rem',
                fontWeight: 800,
                background: '#00c853',
                color: '#ffffff',
                borderRadius: '50px',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Plus size={18} /> + Add subject
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {batchData.subjects.map((sub: any) => (
              <div key={sub.id} className="card" style={{
                padding: 0,
                overflow: 'hidden',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e'
              }}>
                {/* Subject Banner Header */}
                <div style={{
                  padding: '1.25rem 1.75rem',
                  background: sub.colour || '#2979ff',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '3px solid #1a1a2e'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.45rem', fontWeight: 900, margin: 0, color: '#ffffff' }}>{sub.name}</h3>
                    {sub.description && <p style={{ fontSize: '0.85rem', margin: '0.2rem 0 0 0', opacity: 0.9, fontWeight: 700 }}>{sub.description}</p>}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setEditingSubject(sub)
                        setSubjectName(sub.name)
                        setSubjectColour(sub.colour || '#2979ff')
                        setSubjectDescription(sub.description || '')
                        setShowAddSubjectModal(true)
                      }}
                      style={{ background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Edit subject
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(sub)}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Branch-by-Branch Teacher Breakdown */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {batchData.batchBranches.map((bb: any) => {
                    const branch = bb.branch
                    const branchTeachers = sub.branchTeachers.filter((bt: any) => bt.branchId === branch.id)

                    return (
                      <div key={branch.id} style={{ background: '#f8fafc', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                            📍 {formatBranchLabel(branch.name)}
                          </h4>
                          <button
                            onClick={() => {
                              setTeacherModal({
                                show: true,
                                subjectId: sub.id,
                                branchId: branch.id,
                                branchName: branch.name,
                                subjectName: sub.name
                              })
                            }}
                            style={{
                              padding: '0.35rem 0.85rem',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: '#00c853',
                              color: '#ffffff',
                              borderRadius: '50px',
                              border: '2px solid #1a1a2e',
                              boxShadow: '2px 2px 0px #1a1a2e',
                              cursor: 'pointer'
                            }}
                          >
                            + Add teacher
                          </button>
                        </div>

                        {branchTeachers.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {branchTeachers.map((bt: any) => {
                              const assistantObj = bt.assistants[0]

                              return (
                                <div key={bt.id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: '#ffffff',
                                  border: '2px solid #1a1a2e',
                                  borderRadius: '10px',
                                  padding: '0.75rem 1rem',
                                  flexWrap: 'wrap',
                                  gap: '0.75rem'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                                      → {bt.teacher.name}
                                    </span>

                                    {/* Assistant Badge */}
                                    {assistantObj ? (
                                      <span style={{
                                        background: '#f3e8ff',
                                        color: '#7e22ce',
                                        border: '1.5px solid #1a1a2e',
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '50px',
                                        fontSize: '0.78rem',
                                        fontWeight: 800
                                      }}>
                                        🤝 {assistantObj.assistant.name} — assistant
                                      </span>
                                    ) : (
                                      <span style={{
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        border: '1.5px solid #cbd5e1',
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '50px',
                                        fontSize: '0.78rem',
                                        fontWeight: 800
                                      }}>
                                        No assistant
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                      onClick={() => {
                                        let perms: string[] = []
                                        try {
                                          perms = assistantObj ? JSON.parse(assistantObj.permissions) : []
                                        } catch { perms = [] }

                                        setSelectedAssistantId(assistantObj ? assistantObj.assistant.id : '')
                                        setSelectedPermissions(perms)

                                        setAssistantModal({
                                          show: true,
                                          subjectBranchTeacherId: bt.id,
                                          teacherName: bt.teacher.name,
                                          subjectName: sub.name,
                                          branchName: branch.name,
                                          existingAssistantId: assistantObj?.id
                                        })
                                      }}
                                      style={{
                                        padding: '0.3rem 0.75rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: '#ffffff',
                                        color: '#1a1a2e',
                                        border: '2px solid #1a1a2e',
                                        borderRadius: '50px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Edit Assistant
                                    </button>

                                    <button
                                      onClick={() => handleRemoveTeacher(bt.id, bt.teacher.name)}
                                      style={{
                                        padding: '0.3rem 0.75rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        border: '2px solid #1a1a2e',
                                        borderRadius: '50px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, fontStyle: 'italic' }}>
                            No teachers assigned to this subject at {formatBranchLabel(branch.name)} yet.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: STUDENTS */}
      {activeTab === 'STUDENTS' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Enrolled Students List</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, margin: '0.2rem 0 0 0' }}>All students enrolled in this batch across branches.</p>
            </div>

            <Link
              href={`/dashboard/super-admin/student-import?batchId=${batchId}`}
              style={{
                padding: '0.65rem 1.25rem',
                fontWeight: 900,
                background: '#00c853',
                color: '#ffffff',
                borderRadius: '50px',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Plus size={18} /> + Add student
            </Link>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setBranchFilter('ALL')}
              style={{
                background: branchFilter === 'ALL' ? '#1a1a2e' : '#ffffff',
                color: branchFilter === 'ALL' ? '#ffffff' : '#1a1a2e',
                border: '2px solid #1a1a2e',
                boxShadow: '2px 2px 0px #1a1a2e',
                padding: '0.35rem 0.85rem',
                borderRadius: '50px',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              All Branches
            </button>
            {batchData.batchBranches.map((bb: any) => {
              const isSelected = branchFilter === bb.branch.id
              return (
                <button
                  key={bb.branch.id}
                  onClick={() => setBranchFilter(bb.branch.id)}
                  style={{
                    background: isSelected ? '#1a1a2e' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#1a1a2e',
                    border: '2px solid #1a1a2e',
                    boxShadow: '2px 2px 0px #1a1a2e',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '50px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  📍 {formatBranchLabel(bb.branch.name)}
                </button>
              )
            })}
          </div>

          {/* Students Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff' }}>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '3px solid #1a1a2e', textAlign: 'left' }}>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900 }}>Student</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900 }}>Branch</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900 }}>Enrolled subject</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900 }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900 }}>Payment</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 900 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((e: any) => (
                    <tr key={e.id} style={{ borderBottom: '2px solid #1a1a2e' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 900, color: '#0f172a' }}>
                        <div>{e.student.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{e.student.email}</div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          background: e.branch?.colour || '#00c853',
                          color: '#ffffff',
                          border: '1.5px solid #1a1a2e',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 900
                        }}>
                          📍 {formatBranchLabel(e.branch?.name)}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          background: e.subject.colour || '#2979ff',
                          color: '#ffffff',
                          border: '1.5px solid #1a1a2e',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          textTransform: 'capitalize'
                        }}>
                          📚 {e.subject.name}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <StatusBadge status={e.status} size="sm" />
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, fontSize: '0.85rem' }}>
                        💳 {e.student.profile?.paymentStatus || 'Pending'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setChangeBranchTarget(e)
                            setSelectedNewBranchId(e.branchId || '')
                          }}
                          style={{
                            background: '#ffffff',
                            color: '#1a1a2e',
                            border: '2px solid #1a1a2e',
                            boxShadow: '2px 2px 0px #1a1a2e',
                            borderRadius: '50px',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          Change branch
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
                        No enrolled students found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="fade-in" style={{ maxWidth: '650px' }}>
          <div className="card" style={{ padding: '2rem', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.25rem' }}>Batch Settings</h2>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Batch name</label>
                <input
                  type="text"
                  className="input-field"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Academic level</label>
                <select
                  className="input-field"
                  value={editAcademicLevel}
                  onChange={e => setEditAcademicLevel(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                >
                  <option value="O Level">O Level (#00c853)</option>
                  <option value="AS Level">AS Level (#2979ff)</option>
                  <option value="A Level">A Level (#aa00ff)</option>
                  <option value="Grade 11">Grade 11 (#ff6d00)</option>
                  <option value="Grade 12">Grade 12 (#f50057)</option>
                  <option value="Grade 13">Grade 13 (#00bcd4)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>Description</label>
                <textarea
                  className="input-field"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', border: '2px solid #1a1a2e', padding: '0.6rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={savingSettings}
                  style={{
                    padding: '0.65rem 1.5rem',
                    fontWeight: 800,
                    background: '#00c853',
                    color: '#ffffff',
                    borderRadius: '50px',
                    border: '3px solid #1a1a2e',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    cursor: 'pointer'
                  }}
                >
                  {savingSettings ? 'Saving...' : 'Save settings'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleArchive}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontWeight: 800,
                    background: '#ffffff',
                    color: '#1a1a2e',
                    borderRadius: '50px',
                    border: '3px solid #1a1a2e',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    cursor: 'pointer'
                  }}
                >
                  {batchData.status === 'archived' ? 'Unarchive batch' : 'Archive batch'}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ padding: '2rem', border: '3px solid #dc2626', borderRadius: '16px', boxShadow: '5px 5px 0px #dc2626', background: '#fff5f5' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', margin: 0 }}>Danger Zone</h3>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', fontWeight: 700, margin: '0.35rem 0 1.25rem 0' }}>
              Deleting a batch permanently removes all associated subjects, teacher links, and student enrollments. This action is irreversible.
            </p>

            <button
              onClick={handleDeleteBatch}
              style={{
                padding: '0.65rem 1.25rem',
                fontWeight: 900,
                background: '#dc2626',
                color: '#ffffff',
                borderRadius: '50px',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
                cursor: 'pointer'
              }}
            >
              Delete batch
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD BRANCH TO BATCH */}
      {showAddBranchModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e', position: 'relative' }}>
            <button onClick={() => setShowAddBranchModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 1rem 0' }}>Add branch to batch</h3>

            <form onSubmit={handleAddBranchToBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Select existing branch</label>
                <select
                  className="input-field"
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                >
                  <option value="">-- Or create new branch inline --</option>
                  {allBranches.map(b => (
                    <option key={b.id} value={b.id}>📍 {b.name} ({b.type})</option>
                  ))}
                </select>
              </div>

              {!selectedBranchId && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Branch name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Kohuwala Branch, City Campus"
                      value={newBranchName}
                      onChange={e => setNewBranchName(e.target.value)}
                      style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Branch type</label>
                    <select
                      className="input-field"
                      value={newBranchType}
                      onChange={e => setNewBranchType(e.target.value)}
                      style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                    >
                      <option value="Physical">Physical</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddBranchModal(false)} style={{ borderRadius: '50px', border: '3px solid #1a1a2e' }}>Cancel</button>
                <button type="submit" disabled={submittingBranch} style={{ background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', borderRadius: '50px', padding: '0.6rem 1.25rem', fontWeight: 800 }}>Save branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUBJECT */}
      {showAddSubjectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e', position: 'relative' }}>
            <button onClick={() => setShowAddSubjectModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 1rem 0' }}>{editingSubject ? 'Edit Subject' : 'Add Subject'}</h3>

            <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Subject name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Biology, Chemistry, Mathematics"
                  required
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Subject color badge</label>
                <input
                  type="color"
                  value={subjectColour}
                  onChange={e => setSubjectColour(e.target.value)}
                  style={{ width: '100%', height: '44px', border: '2px solid #1a1a2e', borderRadius: '8px', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  className="input-field"
                  value={subjectDescription}
                  onChange={e => setSubjectDescription(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', border: '2px solid #1a1a2e', padding: '0.6rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddSubjectModal(false)} style={{ borderRadius: '50px', border: '3px solid #1a1a2e' }}>Cancel</button>
                <button type="submit" disabled={submittingSubject} style={{ background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', borderRadius: '50px', padding: '0.6rem 1.25rem', fontWeight: 800 }}>Save subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TEACHER TO SUBJECT BRANCH */}
      {teacherModal.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e', position: 'relative' }}>
            <button onClick={() => setTeacherModal({ show: false, subjectId: '', branchId: '', branchName: '', subjectName: '' })} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.5rem 0' }}>Assign teacher</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '1.25rem' }}>
              Subject: <strong>{teacherModal.subjectName}</strong> at <strong>{teacherModal.branchName}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Select teacher</label>
                <select
                  className="input-field"
                  value={teacherIdToAssign}
                  onChange={e => setTeacherIdToAssign(e.target.value)}
                  style={{ width: '100%', minHeight: '42px', border: '2px solid #1a1a2e' }}
                >
                  <option value="">Select teacher from dropdown...</option>
                  {allTeachers.map(t => (
                    <option key={t.id} value={t.id}>👨‍🏫 {t.name} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTeacherModal({ show: false, subjectId: '', branchId: '', branchName: '', subjectName: '' })} style={{ borderRadius: '50px', border: '3px solid #1a1a2e' }}>Cancel</button>
                <button onClick={handleAssignTeacher} disabled={!teacherIdToAssign} style={{ background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', borderRadius: '50px', padding: '0.6rem 1.25rem', fontWeight: 800 }}>Assign teacher</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN ASSISTANT (WITH 8 PERMISSION CHECKBOXES) */}
      {assistantModal.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e', position: 'relative' }}>
            <button onClick={() => setAssistantModal({ show: false, subjectBranchTeacherId: '', teacherName: '', subjectName: '', branchName: '' })} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.35rem 0' }}>Assign assistant</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '1.25rem' }}>
              Teacher: <strong>{assistantModal.teacherName}</strong> | {assistantModal.subjectName} ({assistantModal.branchName})
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
                  <option value="">Select user with Assistant role...</option>
                  {allAssistants.map(ast => (
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
                <button type="button" className="btn-secondary" onClick={() => setAssistantModal({ show: false, subjectBranchTeacherId: '', teacherName: '', subjectName: '', branchName: '' })} style={{ borderRadius: '50px', border: '3px solid #1a1a2e' }}>Cancel</button>
                <button type="submit" disabled={submittingAssistant || !selectedAssistantId} style={{ background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', borderRadius: '50px', padding: '0.6rem 1.25rem', fontWeight: 800 }}>Save assistant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE BRANCH MODAL (Fix 3) */}
      {changeBranchTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '480px', padding: '2rem', border: '3px solid #1a1a2e',
            borderRadius: '16px', boxShadow: '6px 6px 0px #1a1a2e', background: '#ffffff', position: 'relative'
          }}>
            <button
              onClick={() => setChangeBranchTarget(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.35rem', color: '#0f172a' }}>
              Change Student Branch
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem', fontWeight: 600 }}>
              Move <strong style={{ color: '#0f172a' }}>{changeBranchTarget.student?.name}</strong> from <strong>{formatBranchLabel(changeBranchTarget.branch?.name)}</strong> to:
            </p>

            <form onSubmit={handleChangeBranchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#0f172a' }}>
                  Target branch
                </label>
                <select
                  className="input-field"
                  value={selectedNewBranchId}
                  onChange={e => setSelectedNewBranchId(e.target.value)}
                  required
                  style={{ width: '100%', minHeight: '44px', border: '2px solid #1a1a2e', borderRadius: '12px', fontWeight: 700 }}
                >
                  <option value="">Select target branch...</option>
                  {allBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      📍 {formatBranchLabel(b.name)} ({b.type})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setChangeBranchTarget(null)}
                  style={{ borderRadius: '50px', border: '2px solid #1a1a2e', fontWeight: 800 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingBranch || !selectedNewBranchId}
                  style={{
                    background: '#00c853',
                    color: '#ffffff',
                    border: '3px solid #1a1a2e',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    borderRadius: '50px',
                    padding: '0.65rem 1.35rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {updatingBranch ? 'Transferring...' : 'Confirm branch transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
