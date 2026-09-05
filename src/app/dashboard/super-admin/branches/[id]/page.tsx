'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [batches, setBatches] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [academicLevel, setAcademicLevel] = useState('O Level')
  const [loading, setLoading] = useState(false)

  // Subject management panel state
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [newSubjectName, setNewSubjectName] = useState('')
  const [showAddSubject, setShowAddSubject] = useState(false)
  
  // Teacher assignment state
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [subjectTeachers, setSubjectTeachers] = useState<any[]>([])
  const [assignUserId, setAssignUserId] = useState('')

  useEffect(() => {
    fetchBatches()
    fetchTeachers()
  }, [])

  const fetchBatches = async () => {
    const res = await fetch(`/api/branches/${id}/batches`)
    if (res.ok) setBatches((await res.json()).batches)
  }

  const fetchTeachers = async () => {
    // Fetch all users with TEACHER role
    const res = await fetch('/api/users?role=TEACHER')
    if (res.ok) setTeachers((await res.json()).users)
  }

  const fetchSubjects = async (batchId: string) => {
    const res = await fetch(`/api/batches/${batchId}/subjects`)
    if (res.ok) setSubjects((await res.json()).subjects)
  }

  const fetchSubjectTeachers = async (subjectId: string) => {
    const res = await fetch(`/api/subjects/${subjectId}/teachers`)
    if (res.ok) setSubjectTeachers((await res.json()).teachers)
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/branches/${id}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: batchName, academicLevel }),
      })
      if (res.ok) {
        setShowCreateBatch(false); setBatchName('')
        fetchBatches()
      }
    } finally { setLoading(false) }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBatch || !newSubjectName.trim()) return
    const res = await fetch(`/api/batches/${selectedBatch.id}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubjectName }),
    })
    if (res.ok) {
      setNewSubjectName(''); setShowAddSubject(false)
      fetchSubjects(selectedBatch.id)
    }
  }

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubject || !assignUserId) return
    const res = await fetch(`/api/subjects/${selectedSubject.id}/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: assignUserId }),
    })
    if (res.ok) {
      setAssignUserId('')
      fetchSubjectTeachers(selectedSubject.id)
    }
  }

  const selectBatch = (batch: any) => {
    setSelectedBatch(batch)
    setSelectedSubject(null)
    setSubjectTeachers([])
    fetchSubjects(batch.id)
  }

  const selectSubject = (subject: any) => {
    setSelectedSubject(subject)
    fetchSubjectTeachers(subject.id)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
      {/* Left: Batch List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Batches</h3>
          <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setShowCreateBatch(!showCreateBatch)}>+ New</button>
        </div>

        {showCreateBatch && (
          <form onSubmit={handleCreateBatch} style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
            <input type="text" className="input-field" style={{ padding: '0.5rem' }} required value={batchName} onChange={e => setBatchName(e.target.value)} placeholder="Batch name" />
            <select className="input-field" style={{ padding: '0.5rem' }} value={academicLevel} onChange={e => setAcademicLevel(e.target.value)}>
              <option>O Level</option><option>AS</option><option>A Level</option>
            </select>
            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.5rem' }}>Create</button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {batches.map(batch => (
            <button key={batch.id} onClick={() => selectBatch(batch)}
              style={{
                padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer',
                backgroundColor: selectedBatch?.id === batch.id ? 'var(--accent-light)' : 'var(--bg-secondary)',
                border: selectedBatch?.id === batch.id ? '2px solid var(--accent-primary)' : '2px solid var(--bg-tertiary)',
                fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              <div>{batch.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{batch.academicLevel}</div>
            </button>
          ))}
          {batches.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No batches yet.</p>}
        </div>
      </div>

      {/* Right: Subject + Teacher management */}
      {selectedBatch ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Subjects */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>{selectedBatch.name} — Subjects</h3>
              <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setShowAddSubject(!showAddSubject)}>+ Subject</button>
            </div>

            {showAddSubject && (
              <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type="text" className="input-field" style={{ padding: '0.5rem' }} required value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Biology" />
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Add</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {subjects.map(subject => (
                <button key={subject.id} onClick={() => selectSubject(subject)}
                  style={{
                    padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer',
                    backgroundColor: selectedSubject?.id === subject.id ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    border: selectedSubject?.id === subject.id ? '2px solid var(--accent-primary)' : '2px solid var(--bg-tertiary)',
                    fontWeight: 600, transition: 'all 0.2s'
                  }}
                >
                  {subject.name}
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({subject._count?.quizzes || 0} quizzes)</span>
                </button>
              ))}
              {subjects.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No subjects in this batch.</p>}
            </div>
          </div>

          {/* Teacher assignment for selected subject */}
          {selectedSubject && (
            <div>
              <h3 style={{ marginBottom: '1rem' }}>Teachers for {selectedSubject.name}</h3>

              <form onSubmit={handleAssignTeacher} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <select className="input-field" style={{ padding: '0.5rem' }} value={assignUserId} onChange={e => setAssignUserId(e.target.value)} required>
                  <option value="">Assign a teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>Assign</button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {subjectTeachers.map(st => (
                  <div key={st.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {st.user.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{st.user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{st.user.email}</div>
                    </div>
                  </div>
                ))}
                {subjectTeachers.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No teachers assigned yet.</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Select a batch to manage its subjects and teachers.
        </div>
      )}
    </div>
  )
}
