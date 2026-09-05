'use client'

import { useState, useEffect } from 'react'

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [name, setName] = useState('')
  const [academicLevel, setAcademicLevel] = useState('O Level')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    const res = await fetch('/api/batches')
    if (res.ok) {
      const data = await res.json()
      setBatches(data.batches)
    }
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, academicLevel })
    })
    
    if (res.ok) {
      setName('')
      fetchBatches()
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1', minWidth: '300px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Create New Batch</h2>
          <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Batch Name (e.g. Cambridge AS 2026)</label>
              <input 
                type="text" 
                className="input-field" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Academic Level</label>
              <select 
                className="input-field" 
                value={academicLevel} 
                onChange={e => setAcademicLevel(e.target.value)}
              >
                <option value="O Level">O Level</option>
                <option value="AS">AS</option>
                <option value="A Level">A Level</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Batch'}
            </button>
          </form>
        </div>

        <div className="card" style={{ flex: '2', minWidth: '400px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Active Batches</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Academic Level</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(batch => (
                  <tr key={batch.id}>
                    <td>{batch.name}</td>
                    <td><span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>{batch.academicLevel}</span></td>
                    <td>{new Date(batch.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Manage</button>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No batches found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
