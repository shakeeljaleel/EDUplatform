'use client'

import { useState, useEffect } from 'react'

export default function SessionResourceBar({ sessionId }: { sessionId: string }) {
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'PDF' })

  useEffect(() => {
    fetchResources()
  }, [sessionId])

  const fetchResources = async () => {
    const res = await fetch(`/api/sessions/${sessionId}/resources`)
    if (res.ok) setResources(await res.json())
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResource)
      })
      if (res.ok) {
        setNewResource({ title: '', url: '', type: 'PDF' })
        setShowAdd(false)
        fetchResources()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resource?')) return
    const res = await fetch(`/api/sessions/${sessionId}/resources?id=${id}`, { method: 'DELETE' })
    if (res.ok) fetchResources()
  }

  return (
    <div style={{ marginTop: '0.5rem', background: 'rgba(16, 185, 129, 0.03)', padding: '0.75rem', borderRadius: '12px', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
          📂 Pre-Class Resources ({resources.length})
        </span>
        <button 
          onClick={() => setShowAdd(!showAdd)} 
          style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'white', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '4px', cursor: 'pointer' }}
        >
          {showAdd ? '✕ Cancel' : '+ Add Resource'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {resources.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span>{r.type === 'VIDEO' ? '🎥' : r.type === 'PDF' ? '📄' : '🔗'}</span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.title}</a>
            <button onClick={() => handleDelete(r.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 0, marginLeft: '4px' }}>✕</button>
          </div>
        ))}
        {resources.length === 0 && !showAdd && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No resources added yet.</span>}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 100px 60px', gap: '0.5rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.6rem', fontWeight: 700 }}>Title</label>
            <input type="text" className="input-field" style={{ padding: '0.4rem', fontSize: '0.75rem' }} value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} placeholder="e.g. Pre-watch Video" required />
          </div>
          <div>
            <label style={{ fontSize: '0.6rem', fontWeight: 700 }}>URL / Link</label>
            <input type="text" className="input-field" style={{ padding: '0.4rem', fontSize: '0.75rem' }} value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} placeholder="URL..." required />
          </div>
          <div>
            <label style={{ fontSize: '0.6rem', fontWeight: 700 }}>Type</label>
            <select className="input-field" style={{ padding: '0.4rem', fontSize: '0.75rem' }} value={newResource.type} onChange={e => setNewResource({...newResource, type: e.target.value})}>
              <option value="PDF">📄 PDF</option>
              <option value="VIDEO">🎥 Video</option>
              <option value="LINK">🔗 Link</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem' }} disabled={loading}>
            Save
          </button>
        </form>
      )}
    </div>
  )
}
