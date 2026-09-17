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
    <div style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #1a1a2e', boxShadow: '3px 3px 0px #1a1a2e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1a1a2e', letterSpacing: '0.02em' }}>
          📂 Pre-class resources ({resources.length})
        </span>
        <button 
          onClick={() => setShowAdd(!showAdd)} 
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.85rem', background: showAdd ? '#f50057' : '#00c853', border: '2px solid #1a1a2e', color: '#ffffff', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0px #1a1a2e' }}
        >
          {showAdd ? '✕ Cancel' : '+ Add resource'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        {resources.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#ffffff', padding: '0.4rem 0.8rem', borderRadius: '50px', border: '2px solid #1a1a2e', fontSize: '0.8rem', boxShadow: '2px 2px 0px #1a1a2e' }}>
            <span>{r.type === 'VIDEO' ? '🎥' : r.type === 'PDF' ? '📄' : '🔗'}</span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a2e', fontWeight: 700, textDecoration: 'none' }}>{r.title}</a>
            <button
              onClick={() => handleDelete(r.id)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#f50057',
                color: '#ffffff',
                border: '2px solid #1a1a2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: 'pointer',
                marginLeft: '4px',
                boxShadow: '1px 1px 0px #1a1a2e',
                padding: 0
              }}
              title="Delete resource"
            >
              ✕
            </button>
          </div>
        ))}
        {resources.length === 0 && !showAdd && <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>No pre-class resources added yet.</span>}
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
