'use client'

import { useState, useEffect } from 'react'
import Breadcrumbs from '@/components/Breadcrumbs'
import { showToast } from '@/components/ToastContainer'

interface ImportedStudent {
  id: string
  name: string
  email: string
  status: string
}

interface ImportResult {
  count: number
  batchName: string
  batchId: string
  students: ImportedStudent[]
}

export default function StudentImportPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  
  const [mode, setMode] = useState<'pdf' | 'csv' | 'manual'>('pdf')
  
  // Manual Entry State
  const [manualData, setManualData] = useState({
    name: '', email: '', password: '', address: '', phone: ''
  })

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    const res = await fetch('/api/batches')
    if (res.ok) {
      const data = await res.json()
      setBatches(data.batches || [])
      if (data.batches?.length > 0) {
        setSelectedBatch(data.batches[0].id)
      }
    }
  }

  const refreshStudentStatus = async () => {
    if (!importResult?.batchId) return
    try {
      const res = await fetch(`/api/batches/${importResult.batchId}/students`)
      if (res.ok) {
        const data = await res.json()
        const updatedStudents = importResult.students.map(s => {
          const found = data.students?.find((st: any) => st.id === s.id || st.email === s.email)
          const subjectStatus = found?.subjectEnrollments?.[0]?.status || found?.status || s.status
          return {
            ...s,
            status: subjectStatus
          }
        })
        setImportResult({ ...importResult, students: updatedStudents })
        showToast('Updated confirmation statuses', 'info')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleImportFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedBatch) {
      showToast('Please select a file and a target batch', 'error')
      return
    }

    setLoading(true)
    setMessage('')
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('batchId', selectedBatch)

    try {
      const res = await fetch('/api/users/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        const msg = `Successfully imported ${data.count} student(s) into batch!`
        setMessage(msg)
        showToast(msg, 'success')
        setFile(null)
        setImportResult({
          count: data.count,
          batchName: data.batchName || 'Selected Batch',
          batchId: selectedBatch,
          students: data.students || []
        })
      } else {
        setMessage(data.error || 'Failed to import students')
        showToast(data.error || 'Failed to import students', 'error')
      }
    } catch (err) {
      setMessage('An error occurred during file import')
      showToast('An error occurred during file import', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBatch) {
      showToast('Please select a batch', 'error')
      return
    }

    setLoading(true)
    setMessage('')
    setImportResult(null)

    try {
      const res = await fetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...manualData, batchId: selectedBatch }),
      })

      const data = await res.json()

      if (res.ok) {
        const msg = `Added student ${data.user.name}`
        setMessage(msg)
        showToast(msg, 'success')
        setManualData({ name: '', email: '', password: '', address: '', phone: '' })
        setImportResult({
          count: 1,
          batchName: data.batchName || 'Selected Batch',
          batchId: selectedBatch,
          students: data.students || [{
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            status: 'ADMIN_APPROVED'
          }]
        })
      } else {
        setMessage(data.error || 'Failed to add student')
        showToast(data.error || 'Failed to add student', 'error')
      }
    } catch (err) {
      setMessage('An error occurred during manual addition')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs items={[{ label: 'Student import' }]} />

      {/* Clean Page Title Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Student import
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', margin: 0 }}>
          Bulk import student rosters or register students manually into target batches.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '620px', padding: '1.75rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff' }}>
        
        {/* SEGMENTED TABS DESIGN (KEPT EXACTLY AS SPECIFIED) */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem' }}>
          <button 
            type="button" 
            onClick={() => { setMode('pdf'); setFile(null); setMessage(''); setImportResult(null); }}
            style={{ 
              padding: '0.65rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: '0.85rem',
              color: mode === 'pdf' ? '#10b981' : '#64748b',
              borderBottom: mode === 'pdf' ? '3px solid #10b981' : '3px solid transparent',
              marginBottom: '-2px', transition: 'all 0.15s ease'
            }}
          >
            📄 PDF import
          </button>

          <button 
            type="button" 
            onClick={() => { setMode('csv'); setFile(null); setMessage(''); setImportResult(null); }}
            style={{ 
              padding: '0.65rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: '0.85rem',
              color: mode === 'csv' ? '#10b981' : '#64748b',
              borderBottom: mode === 'csv' ? '3px solid #10b981' : '3px solid transparent',
              marginBottom: '-2px', transition: 'all 0.15s ease'
            }}
          >
            📊 CSV import
          </button>

          <button 
            type="button" 
            onClick={() => { setMode('manual'); setMessage(''); setImportResult(null); }}
            style={{ 
              padding: '0.65rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: '0.85rem',
              color: mode === 'manual' ? '#10b981' : '#64748b',
              borderBottom: mode === 'manual' ? '3px solid #10b981' : '3px solid transparent',
              marginBottom: '-2px', transition: 'all 0.15s ease'
            }}
          >
            ✏️ Manual entry
          </button>
        </div>

        {message && (
          <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px', backgroundColor: message.includes('Success') || message.includes('Added') || message.includes('imported') ? '#f0fdf4' : '#fef2f2', color: message.includes('Success') || message.includes('Added') || message.includes('imported') ? '#059669' : '#dc2626', border: `1px solid ${message.includes('Success') || message.includes('Added') || message.includes('imported') ? '#10b981' : '#ef4444'}`, fontWeight: 700, fontSize: '0.85rem' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Target batch</label>
            <select 
              className="input-field"
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              style={{ width: '100%', minHeight: '42px', fontSize: '0.9rem' }}
              required
            >
              <option value="" disabled>Select a batch...</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.name} - {batch.academicLevel} {batch.branch ? `(${batch.branch.name})` : ''}</option>
              ))}
            </select>
          </div>

          {mode === 'pdf' && (
            <form onSubmit={handleImportFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.825rem', color: '#475569', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>PDF text reader active:</strong> Upload any PDF document or roster. Names, emails, and contact details will be automatically parsed and enrolled.
              </div>

              {/* Styled Drag-and-Drop Upload Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const droppedFile = e.dataTransfer.files[0]
                    if (!droppedFile.name.toLowerCase().endsWith('.pdf')) {
                      showToast('Please drop a PDF file', 'error')
                      return
                    }
                    setFile(droppedFile)
                  }
                }}
                style={{
                  border: '2px dashed #1a1a2e',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  background: isDragging ? '#f0fdf4' : '#ffffff',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const hiddenInput = document.getElementById('pdf-file-input')
                  hiddenInput?.click()
                }}
              >
                <input 
                  id="pdf-file-input"
                  type="file" 
                  accept=".pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />

                <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📄</div>
                <div style={{ color: '#1a1a2e', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  Drag your PDF here or click to browse
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                  Supports PDF roster documents
                </div>

                <button 
                  type="button"
                  className="btn-secondary"
                  style={{
                    background: '#ffffff',
                    color: '#1a1a2e',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: '3px 3px 0px #1a1a2e'
                  }}
                >
                  {file ? 'Change file' : 'Browse file'}
                </button>

                {file && (
                  <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #00c853', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#00c853' }}>
                    ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* SENTENCE CASE 'Import PDF' BUTTON */}
              <button type="submit" className="btn-primary" disabled={loading || !file || !selectedBatch} style={{ minHeight: '42px', fontWeight: 800, background: '#00c853' }}>
                {loading ? 'Reading PDF...' : 'Import PDF'}
              </button>
            </form>
          )}

          {mode === 'csv' && (
            <form onSubmit={handleImportFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.825rem', color: '#475569', lineHeight: 1.5 }}>
                CSV headers supported: <code style={{ background: '#e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#0f172a', fontWeight: 700 }}>name, email, password, address, phone</code>
              </div>

              {/* Styled Drag-and-Drop Upload Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const droppedFile = e.dataTransfer.files[0]
                    if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
                      showToast('Please drop a CSV file', 'error')
                      return
                    }
                    setFile(droppedFile)
                  }
                }}
                style={{
                  border: '2px dashed #1a1a2e',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  background: isDragging ? '#f0fdf4' : '#ffffff',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const hiddenInput = document.getElementById('csv-file-input')
                  hiddenInput?.click()
                }}
              >
                <input 
                  id="csv-file-input"
                  type="file" 
                  accept=".csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />

                <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📊</div>
                <div style={{ color: '#1a1a2e', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  Drag your CSV here or click to browse
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                  Supports CSV spreadsheet files
                </div>

                <button 
                  type="button"
                  className="btn-secondary"
                  style={{
                    background: '#ffffff',
                    color: '#1a1a2e',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: '3px 3px 0px #1a1a2e'
                  }}
                >
                  {file ? 'Change file' : 'Browse file'}
                </button>

                {file && (
                  <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #00c853', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#00c853' }}>
                    ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* SENTENCE CASE 'Import CSV' BUTTON */}
              <button type="submit" className="btn-primary" disabled={loading || !file || !selectedBatch} style={{ minHeight: '42px', fontWeight: 800, background: '#00c853' }}>
                {loading ? 'Importing CSV...' : 'Import CSV'}
              </button>
            </form>
          )}

          {mode === 'manual' && (
            <form onSubmit={handleManualEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Full name</label>
                  <input type="text" className="input-field" required value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} placeholder="e.g. John Doe" style={{ width: '100%', minHeight: '42px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Email address</label>
                  <input type="email" className="input-field" required value={manualData.email} onChange={e => setManualData({...manualData, email: e.target.value})} placeholder="e.g. john@student.com" style={{ width: '100%', minHeight: '42px' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Initial password</label>
                <input type="password" className="input-field" required value={manualData.password} onChange={e => setManualData({...manualData, password: e.target.value})} placeholder="Set initial password" style={{ width: '100%', minHeight: '42px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Phone (Optional)</label>
                  <input type="text" className="input-field" value={manualData.phone} onChange={e => setManualData({...manualData, phone: e.target.value})} placeholder="e.g. +44 123 456" style={{ width: '100%', minHeight: '42px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Address (Optional)</label>
                  <input type="text" className="input-field" value={manualData.address} onChange={e => setManualData({...manualData, address: e.target.value})} placeholder="e.g. 123 Biology Lane" style={{ width: '100%', minHeight: '42px' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading || !selectedBatch} style={{ minHeight: '42px', fontWeight: 800, background: '#00c853' }}>
                {loading ? 'Adding student...' : 'Add student'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* CONFIRMATION SUMMARY CARD AFTER IMPORT */}
      {importResult && (
        <div className="card" style={{ maxWidth: '620px', marginTop: '1.5rem', padding: '1.75rem', borderRadius: '16px', border: '3px solid #1a1a2e', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎉</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1a1a2e', margin: 0, lineHeight: 1.3 }}>
                {importResult.count} student(s) imported successfully. Awaiting teacher confirmation for {importResult.batchName}.
              </h3>
            </div>
            <button 
              type="button" 
              onClick={refreshStudentStatus}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 12px', flexShrink: 0 }}
            >
              ↻ Refresh status
            </button>
          </div>

          <p style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            Enrolment status set to <strong>ADMIN_APPROVED</strong> (Stage 1 skipped). Automatic notifications sent to assigned subject teachers for Stage 3 confirmation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {importResult.students.map((student) => {
              const isConfirmed = student.status === 'APPROVED' || student.status === 'ACTIVE' || student.status === 'TEACHER_CONFIRMED'
              return (
                <div 
                  key={student.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '2px solid #1a1a2e',
                    background: isConfirmed ? '#f0fdf4' : '#fffbeb',
                    boxShadow: '2px 2px 0px #1a1a2e'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '0.9rem' }}>{student.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{student.email}</div>
                  </div>

                  {isConfirmed ? (
                    <span style={{
                      background: '#00c853',
                      color: '#ffffff',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      padding: '4px 12px',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      boxShadow: '2px 2px 0px #1a1a2e',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ✓ Teacher Confirmed
                    </span>
                  ) : (
                    <span style={{
                      background: '#ffab00',
                      color: '#1a1a2e',
                      border: '2px solid #1a1a2e',
                      borderRadius: '50px',
                      padding: '4px 12px',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      boxShadow: '2px 2px 0px #1a1a2e',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ⏳ Awaiting Teacher Confirmation
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
