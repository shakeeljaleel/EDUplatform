'use client'

import { useState, useEffect, use } from 'react'

export default function TeacherRecordingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [recordings, setRecordings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', classDate: '', videoUrl: '', duration: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchRecordings() }, [])

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/recordings`)
      if (res.ok) setRecordings((await res.json()).recordings)
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch(`/api/subjects/${id}/recordings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, duration: parseInt(form.duration) || 0 })
      })
      if (res.ok) {
        setMsg('Recording uploaded successfully!')
        setForm({ title: '', classDate: '', videoUrl: '', duration: '' })
        setShowForm(false)
        fetchRecordings()
      } else {
        const d = await res.json()
        setMsg(d.error || 'Failed to upload')
      }
    } finally { setSaving(false) }
  }

  if (loading) return <div className="pulse">Loading recordings...</div>

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Class Recordings</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload Zoom or video recordings linked to specific class dates. Students with paid access can watch once.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Upload Recording'}
        </button>
      </div>

      {msg && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: msg.includes('success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '8px', color: msg.includes('success') ? 'var(--success)' : 'var(--error)', fontSize: '0.9rem' }}>{msg}</div>}

      {showForm && (
        <div className="card fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎥</span> Upload New Recording
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Recording Title</label>
              <input className="input-field" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cell Division – Class 3 – 21 Apr 2026" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Class Date</label>
              <input className="input-field" type="datetime-local" required value={form.classDate} onChange={e => setForm({ ...form, classDate: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Video URL (Zoom Cloud / YouTube / Vimeo)</label>
              <input className="input-field" required value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://zoom.us/rec/..." />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Duration (seconds, optional)</label>
              <input className="input-field" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 3600 for 1 hour" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Uploading...' : 'Upload Recording'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {recordings.map((r, idx) => (
          <div key={r.id} className={`card stagger-${(idx % 5) + 1}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🎥</div>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{r.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>📅 {new Date(r.classDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {r.duration > 0 && <span>⏱ {Math.floor(r.duration / 60)}m {r.duration % 60}s</span>}
                  <span>👁 {Array.isArray(r.accesses) ? r.accesses.length : 0} views</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '99px', fontWeight: 700 }}>🔒 Secure Stream Only</span>
              <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>Preview ↗</a>
            </div>
          </div>
        ))}
        {recordings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
            <p>No recordings uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
