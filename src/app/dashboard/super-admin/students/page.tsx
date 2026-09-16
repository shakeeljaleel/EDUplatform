'use client'

import { useState, useEffect } from 'react'

export default function StudentImportPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const [mode, setMode] = useState<'csv' | 'pdf' | 'manual'>('pdf')
  
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
      setBatches(data.batches)
      if (data.batches.length > 0) {
        setSelectedBatch(data.batches[0].id)
      }
    }
  }

  const handleImportFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedBatch) {
      setMessage('Please select a file and a batch')
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
        setMessage(`Success: Imported and enrolled ${data.count} student(s) into batch!`)
        setFile(null)
      } else {
        setMessage(data.error || 'Failed to import students')
      }
    } catch (err) {
      setMessage('An error occurred during file import')
    } finally {
      setLoading(false)
    }
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBatch) {
      setMessage('Please select a batch')
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
        setMessage(`Success: Added student ${data.user.name}.`)
        setManualData({ name: '', email: '', password: '', address: '', phone: '' })
      } else {
        setMessage(data.error || 'Failed to add student')
      }
    } catch (err) {
      setMessage('An error occurred during manual addition')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: '650px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 900 }}>Add & Import Students to Batch</h2>
        
        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className={`btn-secondary ${mode === 'pdf' ? 'active-tab' : ''}`}
            onClick={() => { setMode('pdf'); setFile(null); setMessage(''); }}
            style={{ 
              borderColor: mode === 'pdf' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              backgroundColor: mode === 'pdf' ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: mode === 'pdf' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 800
            }}
          >
            📄 PDF Document Import
          </button>

          <button 
            type="button" 
            className={`btn-secondary ${mode === 'csv' ? 'active-tab' : ''}`}
            onClick={() => { setMode('csv'); setFile(null); setMessage(''); }}
            style={{ 
              borderColor: mode === 'csv' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              backgroundColor: mode === 'csv' ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: mode === 'csv' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 800
            }}
          >
            📊 CSV Spreadsheet Import
          </button>

          <button 
            type="button" 
            className={`btn-secondary ${mode === 'manual' ? 'active-tab' : ''}`}
            onClick={() => { setMode('manual'); setMessage(''); }}
            style={{ 
              borderColor: mode === 'manual' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              backgroundColor: mode === 'manual' ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: mode === 'manual' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 800
            }}
          >
            ✏️ Manual Entry
          </button>
        </div>

        {message && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', backgroundColor: message.includes('Success') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: message.includes('Success') ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
            {message}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Target Batch</label>
          <select 
            className="input-field"
            value={selectedBatch}
            onChange={e => setSelectedBatch(e.target.value)}
            required
          >
            <option value="" disabled>Select a batch</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>{batch.name} - {batch.academicLevel} {batch.branch ? `(${batch.branch.name})` : ''}</option>
            ))}
          </select>
        </div>

        {mode === 'pdf' && (
          <form onSubmit={handleImportFile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>⚡ Automatic PDF Text Reader:</strong><br />
                Upload any PDF roster or student list. The parser will automatically extract student names, email addresses, and optional contact details from text blocks or tables.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Select PDF Roster Document</label>
              <input 
                type="file" 
                accept=".pdf"
                className="input-field" 
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !file || !selectedBatch} style={{ minHeight: '44px', fontWeight: 800 }}>
              {loading ? 'Reading PDF & Importing...' : '📄 Read PDF & Import Students'}
            </button>
          </form>
        )}

        {mode === 'csv' && (
          <form onSubmit={handleImportFile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Upload a CSV spreadsheet file containing student details. Columns supported: <br />
              <code style={{ background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>name, email, password, address, phone</code>
            </p>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Select CSV File</label>
              <input 
                type="file" 
                accept=".csv"
                className="input-field" 
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !file || !selectedBatch} style={{ minHeight: '44px', fontWeight: 800 }}>
              {loading ? 'Importing CSV...' : '📊 Start CSV Bulk Import'}
            </button>
          </form>
        )}

        {mode === 'manual' && (
          <form onSubmit={handleManualEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Full Name</label>
                <input type="text" className="input-field" required value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Email Address</label>
                <input type="email" className="input-field" required value={manualData.email} onChange={e => setManualData({...manualData, email: e.target.value})} placeholder="e.g. john@student.com" />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Initial Password</label>
              <input type="password" className="input-field" required value={manualData.password} onChange={e => setManualData({...manualData, password: e.target.value})} placeholder="Set initial password" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Phone (Optional)</label>
                <input type="text" className="input-field" value={manualData.phone} onChange={e => setManualData({...manualData, phone: e.target.value})} placeholder="e.g. +44 123 456" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Address (Optional)</label>
                <input type="text" className="input-field" value={manualData.address} onChange={e => setManualData({...manualData, address: e.target.value})} placeholder="e.g. 123 Biology Lane" />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !selectedBatch} style={{ minHeight: '44px', fontWeight: 800 }}>
              {loading ? 'Adding...' : '✏️ Add Student Manually'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
