'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchBranches() }, [])

  const fetchBranches = async () => {
    const res = await fetch('/api/branches')
    if (res.ok) setBranches((await res.json()).branches)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location }),
      })
      if (res.ok) {
        setShowCreate(false); setName(''); setLocation('')
        fetchBranches()
      }
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Branches</h2>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Branch'}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '2rem', maxWidth: '500px' }}>
          <h3 style={{ marginBottom: '1.25rem' }}>Create Branch</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Branch Name</label>
              <input type="text" className="input-field" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lahore Main Branch" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Location (Optional)</label>
              <input type="text" className="input-field" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Gulberg, Lahore" />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>Create Branch</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {branches.map((branch) => (
          <div key={branch.id} className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{branch.name}</h3>
            {branch.location && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>📍 {branch.location}</p>
            )}
            <div className="badge badge-level" style={{ marginBottom: '1.5rem' }}>{branch._count.batches} Batches</div>
            <Link href={`/dashboard/super-admin/branches/${branch.id}`} className="btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
              Manage Branch
            </Link>
          </div>
        ))}
        {branches.length === 0 && !showCreate && (
          <p style={{ color: 'var(--text-secondary)' }}>No branches created yet.</p>
        )}
      </div>
    </div>
  )
}
