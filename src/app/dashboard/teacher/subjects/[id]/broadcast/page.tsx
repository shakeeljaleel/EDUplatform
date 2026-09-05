'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function BroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchBroadcasts()
  }, [])

  const fetchBroadcasts = async () => {
    try {
      // In Phase 5, we added announcements. We'll use the same subjects/[id]/announcements API or create one.
      // Wait, there might not be a specific GET route for announcements yet. We can query the main subject API or just mock it here.
      // Let's create an API call for announcements. For now, since we haven't built the explicit GET /api/subjects/[id]/announcements,
      // we'll just show the UI and implement the POST which saves an announcement.
      // For this demo, let's assume the API exists or we will create it next.
      const res = await fetch(`/api/subjects/${id}/announcements`)
      if (res.ok) {
        setAnnouncements((await res.json()).announcements)
      } else {
        setAnnouncements([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const res = await fetch(`/api/subjects/${id}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })

      if (res.ok) {
        setTitle('')
        setContent('')
        fetchBroadcasts()
        alert('Broadcast successfully sent to all students and parents!')
      } else {
        alert('Failed to send broadcast.')
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="pulse">Loading broadcasts...</div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Teacher Broadcast</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Send an announcement that immediately alerts all students and parents in this batch.</p>
      </div>

      <div className="card fade-in" style={{ marginBottom: '3rem', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'linear-gradient(145deg, rgba(255,255,255,1), rgba(240,253,244,0.5))' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📢</span> Compose Broadcast
        </h3>
        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Announcement Title</label>
            <input type="text" className="input-field" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Important: Schedule Change Next Week" />
          </div>
          <div>
            <label className="label">Message Body</label>
            <textarea className="input-field" required value={content} onChange={e => setContent(e.target.value)} placeholder="Write your message here..." style={{ minHeight: '120px', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      </div>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Previous Broadcasts</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {announcements.map((a: any) => (
          <div key={a.id} className="card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '1.1rem' }}>{a.title}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(a.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{a.content}</div>
          </div>
        ))}
        {announcements.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
            No broadcasts sent yet.
          </p>
        )}
      </div>
    </div>
  )
}
