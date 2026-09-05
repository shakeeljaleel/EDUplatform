'use client'

import { useState, useEffect, use } from 'react'

export default function TeacherResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  
  const [formData, setFormData] = useState({ title: '', url: '', type: 'LINK' })

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/resources`)
      if (res.ok) setMaterials((await res.json()).materials)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`/api/subjects/${id}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    if (res.ok) {
      setShowAdd(false)
      setFormData({ title: '', url: '', type: 'LINK' })
      fetchMaterials()
    }
  }

  if (loading) return <div className="pulse">Loading resources...</div>

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Resources Library</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload notes, past papers, marking schemes, and YouTube links.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add Resource'}
        </button>
      </div>

      {showAdd && (
        <div className="card fade-in" style={{ marginBottom: '2rem', background: 'rgba(16, 185, 129, 0.03)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Upload New Material</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 250px' }}>
                <label className="label">Title / Topic</label>
                <input type="text" className="input-field" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Mitosis Summary PDF" />
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label className="label">Type</label>
                <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="LINK">External Link</option>
                  <option value="YOUTUBE">YouTube Video</option>
                  <option value="PDF">PDF Document</option>
                  <option value="DOC">Word / Doc</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">URL / File Link</label>
              <input type="url" className="input-field" required value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." />
            </div>
            <div>
              <button type="submit" className="btn-primary">Save Resource</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {materials.map((m, idx) => (
          <div key={m.id} className={`card stagger-${(idx % 5) + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                background: m.type === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.1)' : m.type === 'PDF' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                color: m.type === 'YOUTUBE' ? '#ef4444' : m.type === 'PDF' ? '#f59e0b' : '#3b82f6'
              }}>
                {m.type === 'YOUTUBE' ? '▶️' : m.type === 'PDF' ? '📄' : '🔗'}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                {new Date(m.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{m.title}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', wordBreak: 'break-all' }}>
              {m.url.length > 50 ? m.url.substring(0, 50) + '...' : m.url}
            </div>
            <div style={{ marginTop: 'auto' }}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ width: '100%', display: 'inline-flex', justifyContent: 'center' }}>
                Open Resource
              </a>
            </div>
          </div>
        ))}
        {materials.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <p>No resources uploaded yet. Start building your library!</p>
          </div>
        )}
      </div>
    </div>
  )
}
