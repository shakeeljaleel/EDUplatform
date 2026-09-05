'use client'

import { useState, useEffect } from 'react'

export default function StudentImportPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const [mode, setMode] = useState<'csv' | 'manual'>('manual')
  
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

  const handleImportCSV = async (e: React.FormEvent) => {
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
        setMessage(`Success: Imported ${data.count} students.`)
        setFile(null)
      } else {
        setMessage(data.error || 'Failed to import')
      }
    } catch (err) {
      setMessage('An error occurred during import')
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
      <div className="card" style={{ maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Add Students to Batch</h2>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            type="button" 
            className={`btn-secondary ${mode === 'manual' ? 'active-tab' : ''}`}
            onClick={() => { setMode('manual'); setMessage(''); }}
            style={{ borderColor: mode === 'manual' ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
          >
            Manual Entry
          </button>
          <button 
            type="button" 
            className={`btn-secondary ${mode === 'csv' ? 'active-tab' : ''}`}
            onClick={() => { setMode('csv'); setMessage(''); }}
            style={{ borderColor: mode === 'csv' ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
          >
            CSV Bulk Import
          </button>
        </div>

        {message && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', backgroundColor: message.includes('Success') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: message.includes('Success') ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
            {message}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Target Batch</label>
          <select 
            className="input-field"
            value={selectedBatch}
            onChange={e => setSelectedBatch(e.target.value)}
            required
          >
            <option value="" disabled>Select a batch</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>{batch.name} - {batch.academicLevel}</option>
            ))}
          </select>
        </div>

        {mode === 'csv' ? (
          <form onSubmit={handleImportCSV} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Upload a CSV file containing student details. The file must have the following headers exactly: <br />
              <code style={{ background: 'var(--bg-tertiary)', padding: '0.2rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.5rem', color: 'var(--text-primary)' }}>name, email, password, address, phone</code>
            </p>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>CSV File</label>
              <input 
                type="file" 
                accept=".csv"
                className="input-field" 
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !file || !selectedBatch}>
              {loading ? 'Importing...' : 'Start Bulk Import'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleManualEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Full Name</label>
                <input type="text" className="input-field" required value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email Address</label>
                <input type="email" className="input-field" required value={manualData.email} onChange={e => setManualData({...manualData, email: e.target.value})} placeholder="e.g. john@student.com" />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Initial Password</label>
              <input type="password" className="input-field" required value={manualData.password} onChange={e => setManualData({...manualData, password: e.target.value})} placeholder="Set initial password" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Phone (Optional)</label>
                <input type="text" className="input-field" value={manualData.phone} onChange={e => setManualData({...manualData, phone: e.target.value})} placeholder="e.g. +44 123 456" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Address (Optional)</label>
                <input type="text" className="input-field" value={manualData.address} onChange={e => setManualData({...manualData, address: e.target.value})} placeholder="e.g. 123 Biology Lane" />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !selectedBatch}>
              {loading ? 'Adding...' : 'Add Student Manually'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
