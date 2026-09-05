'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function StudentResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="pulse">Loading resources library...</div>

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '1rem' }}>Resources Library</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Access all uploaded notes, past papers, marking schemes, and video links for this subject.</p>
      </div>

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
              {m.type} shared by {m.author.name}
            </div>
            <div style={{ marginTop: 'auto' }}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: '100%', display: 'inline-flex', justifyContent: 'center' }}>
                Access Resource
              </a>
            </div>
          </div>
        ))}
        {materials.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <p>Your teacher hasn't uploaded any resources here yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
