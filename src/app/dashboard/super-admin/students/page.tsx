'use client'

import { useState, useEffect } from 'react'
import Breadcrumbs from '@/components/Breadcrumbs'
import { showToast } from '@/components/ToastContainer'

export default function StudentImportPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
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

  const handleImportFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedBatch) {
      showToast('Please select a file and a target batch', 'error')
      return
    }

    setLoading(true)
    setMessage('')

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

      <div className="card" style={{ maxWidth: '620px', padding: '1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        
        {/* SEGMENTED TABS DESIGN (PROMPT 5 SPECIFICATION) */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem' }}>
          <button 
            type="button" 
            onClick={() => { setMode('pdf'); setFile(null); setMessage(''); }}
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
            onClick={() => { setMode('csv'); setFile(null); setMessage(''); }}
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
            onClick={() => { setMode('manual'); setMessage(''); }}
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

        {/* 16PX CONSISTENT GAP FORM LAYOUT */}
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

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>PDF roster document</label>
                <input 
                  type="file" 
                  accept=".pdf"
                  className="input-field" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', minHeight: '42px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading || !file || !selectedBatch} style={{ minHeight: '42px', fontWeight: 800, background: '#10b981' }}>
                {loading ? 'Reading PDF...' : 'Import PDF'}
              </button>
            </form>
          )}

          {mode === 'csv' && (
            <form onSubmit={handleImportFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.825rem', color: '#475569', lineHeight: 1.5 }}>
                CSV headers supported: <code style={{ background: '#e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#0f172a', fontWeight: 700 }}>name, email, password, address, phone</code>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>CSV spreadsheet file</label>
                <input 
                  type="file" 
                  accept=".csv"
                  className="input-field" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', minHeight: '42px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading || !file || !selectedBatch} style={{ minHeight: '42px', fontWeight: 800, background: '#10b981' }}>
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

              {/* SOLID BUTTON WITH SENTENCE CASE (PROMPT 5 SPECIFICATION) */}
              <button type="submit" className="btn-primary" disabled={loading || !selectedBatch} style={{ minHeight: '42px', fontWeight: 800, background: '#10b981', border: 'none' }}>
                {loading ? 'Adding student...' : 'Add student'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
