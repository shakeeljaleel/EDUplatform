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
        {materials.map((m, idx) => {
          const typeLower = (m.type || '').toLowerCase()
          const titleLower = (m.title || '').toLowerCase()

          let theme = { bg: 'linear-gradient(135deg, #00c853, #69f0ae)', border: '#00c853', icon: '📝', label: 'Notes' }
          if (typeLower.includes('youtube') || typeLower.includes('video') || titleLower.includes('video')) {
            theme = { bg: 'linear-gradient(135deg, #ff1744, #ff5252)', border: '#ff1744', icon: '▶️', label: 'YouTube Video' }
          } else if (typeLower.includes('pdf') || titleLower.includes('pdf')) {
            theme = { bg: 'linear-gradient(135deg, #2979ff, #448aff)', border: '#2979ff', icon: '📄', label: 'PDF Document' }
          } else if (titleLower.includes('past paper') || titleLower.includes('paper') || titleLower.includes('exam')) {
            theme = { bg: 'linear-gradient(135deg, #ff6d00, #ffd180)', border: '#ff6d00', icon: '📚', label: 'Past Paper' }
          }

          return (
            <div key={m.id} className={`card stagger-${(idx % 5) + 1}`} style={{
              display: 'flex', flexDirection: 'column',
              borderLeft: `6px solid ${theme.border}`,
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: `0 4px 14px ${theme.border}22`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ 
                  width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                  background: theme.bg, color: 'white', boxShadow: `0 4px 10px ${theme.border}44`
                }}>
                  {theme.icon}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.border, background: 'rgba(0,0,0,0.04)', padding: '0.25rem 0.65rem', borderRadius: '9999px', border: `1px solid ${theme.border}33` }}>
                  {theme.label}
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>{m.title}</h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '1.5rem', wordBreak: 'break-all' }}>
                Shared by {m.author?.name || 'Instructor'} • {new Date(m.createdAt).toLocaleDateString()}
              </div>
              <div style={{ marginTop: 'auto' }}>
                <a href={m.url} target="_blank" rel="noopener noreferrer" style={{
                  width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.25rem', borderRadius: '12px', background: theme.bg, color: 'white',
                  fontWeight: 800, fontSize: '0.875rem', textDecoration: 'none', boxShadow: `0 4px 12px ${theme.border}44`
                }}>
                  Access Resource
                </a>
              </div>
            </div>
          )
        })}
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
