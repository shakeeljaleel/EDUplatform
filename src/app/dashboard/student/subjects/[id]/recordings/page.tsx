'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'

// Simple device fingerprint using browser info
function getDeviceId(): string {
  const key = ['ua', navigator.userAgent, navigator.language, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|')
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return `dev_${Math.abs(hash).toString(16)}`
}

export default function StudentRecordingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [recordings, setRecordings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [watchingId, setWatchingId] = useState<string | null>(null)
  const [watchError, setWatchError] = useState('')

  useEffect(() => { fetchRecordings() }, [])

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/recordings`)
      if (res.ok) {
        setRecordings((await res.json()).recordings)
      } else {
        const d = await res.json()
        setError(d.error || 'Failed to load recordings')
      }
    } finally { setLoading(false) }
  }

  const startWatch = async (recordingId: string) => {
    setWatchError('')
    const deviceId = getDeviceId()

    // Get geolocation
    let lat: number | null = null
    let lng: number | null = null
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      })
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch {
      // Geolocation denied or unavailable — allow but log
    }

    const res = await fetch(`/api/recordings/${recordingId}/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, lat, lng, completed: false })
    })

    if (res.ok) {
      setWatchingId(recordingId)
    } else {
      const d = await res.json()
      setWatchError(d.error || 'Access denied')
    }
  }

  const markComplete = async (recordingId: string) => {
    const deviceId = getDeviceId()
    await fetch(`/api/recordings/${recordingId}/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, completed: true })
    })
    setWatchingId(null)
    fetchRecordings() // refresh to show completed status
  }

  if (loading) return <div className="pulse">Loading recordings...</div>

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '1rem' }}>Class Recordings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Recordings are available for <strong>one-time watch only</strong>. Streaming is protected — no downloads or sharing.</p>
      </div>

      {error && (
        <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: 'var(--error)', marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Access Restricted</strong>
          {error}
        </div>
      )}

      {watchError && (
        <div style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: 'var(--error)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <strong>Security Alert:</strong> {watchError}
          </div>
        </div>
      )}

      {watchingId && (
        <div className="card fade-in" style={{ marginBottom: '2rem', border: '2px solid var(--accent-primary)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Now Watching</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '0.25rem 0.75rem', borderRadius: '99px' }}>🔴 LIVE STREAM</span>
              <button onClick={() => markComplete(watchingId)} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                Mark as Finished ✓
              </button>
            </div>
          </div>

          {(() => {
            const rec = recordings.find(r => r.id === watchingId)
            if (!rec) return null
            const url = rec.videoUrl

            // Detect embed type
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              const ytId = url.match(/(?:youtu\.be\/|v=)([^&\n?#]+)/)?.[1]
              return <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`} style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', border: 'none' }} allowFullScreen />
            }
            if (url.includes('vimeo.com')) {
              const vId = url.match(/vimeo\.com\/(\d+)/)?.[1]
              return <iframe src={`https://player.vimeo.com/video/${vId}?dnt=1`} style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', border: 'none' }} allowFullScreen />
            }
            // For Zoom/direct links — show in restricted iframe
            return (
              <div style={{ background: '#000', borderRadius: '12px', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>🎥</div>
                <p style={{ textAlign: 'center', maxWidth: '400px', fontSize: '0.9rem', color: '#ccc' }}>This recording is hosted on Zoom Cloud. Click below to open in a secure viewer.</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">Open Secure Recording ↗</a>
              </div>
            )
          })()}

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span>
            <span>Recording is streaming-only. Screen recording, downloading, or sharing this link is a violation of our terms. Sessions are monitored.</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {recordings.map((r, idx) => {
          const access = r.accesses?.[0]
          const isCompleted = access?.completed
          const hasStarted = !!access?.watchedAt
          const isCurrentlyWatching = watchingId === r.id

          return (
            <div key={r.id} className={`card stagger-${(idx % 5) + 1}`} style={{ opacity: isCompleted && !isCurrentlyWatching ? 0.7 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', background: isCompleted ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    {isCompleted ? '✅' : '🎥'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{r.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>📅 {new Date(r.classDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {r.duration > 0 && <span>⏱ {Math.floor(r.duration / 60)} min</span>}
                    </div>
                  </div>
                </div>
                <div>
                  {isCompleted ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>✅ Watched</span>
                  ) : isCurrentlyWatching ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 700 }}>▶ Watching now…</span>
                  ) : (
                    <button className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }} onClick={() => startWatch(r.id)}>
                      ▶ Watch Now
                    </button>
                  )}
                </div>
              </div>

              {isCompleted && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(16,185,129,0.05)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                  One-time watch used on {new Date(access.watchedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )
        })}
        {recordings.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
            <p>No class recordings uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
