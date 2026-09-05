'use client'

import { useState, useEffect, use } from 'react'
import { SyllabusIcon, RoughFilter } from '@/components/HandDrawnIcons'

export default function StudentCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)

        const now = new Date()
        data.sessions.forEach(async (s: any) => {
          const start = new Date(s.scheduledDate)
          const end = new Date(start.getTime() + s.durationMins * 60000)
          const bufferStart = new Date(start.getTime() - 30 * 60 * 1000)
          if (now >= bufferStart && now <= end && s.status !== 'CANCELLED') {
            await fetch(`/api/sessions/${s.id}/ping`, { method: 'POST' })
          }
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div className="pulse" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Sketching your roadmap...</div>
    </div>
  )

  return (
    <div style={{ maxWidth: '850px', padding: '1rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SyllabusIcon size={40} color="var(--text-primary)" />
          Lesson Plan & Roadmap
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>Your step-by-step journey through the curriculum.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
        {sessions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', border: '3px solid var(--text-primary)', filter: 'url(#rough-edge)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>No classes scheduled yet for this subject. Enjoy the break! 🌴</p>
          </div>
        )}

        {sessions.map((s, idx) => {
          const isPast = new Date(s.scheduledDate) < new Date()
          const isNext = !isPast && (idx === 0 || new Date(sessions[idx-1].scheduledDate) < new Date())
          
          return (
            <div key={s.id} className="premium-card" style={{ 
              display: 'flex', 
              gap: '2rem', 
              opacity: s.status === 'CANCELLED' ? 0.6 : 1,
              border: '3px solid var(--text-primary)',
              filter: 'url(#rough-edge)',
              boxShadow: isNext ? '12px 12px 0 var(--accent-primary)' : '8px 8px 0 var(--text-primary)',
              position: 'relative',
              background: isNext ? 'var(--bg-primary)' : 'rgba(255,255,255,0.4)',
              transform: isNext ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              marginTop: isNext ? '2rem' : '0',
              padding: isNext ? '2.5rem 2rem 2rem' : '2rem'
            }}>
              {isNext && (
                <div style={{ 
                  position: 'absolute', top: '-18px', left: '1.5rem', 
                  background: 'var(--accent-primary)', color: 'white', 
                  padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', 
                  fontWeight: 900, border: '2px solid var(--text-primary)',
                  boxShadow: '4px 4px 0 var(--text-primary)',
                  zIndex: 10
                }}>
                  UPCOMING NEXT
                </div>
              )}

              <div style={{ 
                textAlign: 'center', 
                minWidth: '100px', 
                paddingRight: '1.5rem', 
                borderRight: '2px solid var(--text-primary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {new Date(s.scheduledDate).toLocaleString('en-GB', { month: 'short' })}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, margin: '4px 0' }}>
                  {new Date(s.scheduledDate).getDate()}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  {new Date(s.scheduledDate).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{s.title}</h3>
                  <span style={{ 
                    background: s.status === 'TAUGHT' ? 'var(--success-light)' : s.status === 'SCHEDULED' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: s.status === 'TAUGHT' ? 'var(--success)' : s.status === 'SCHEDULED' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: '2px solid var(--text-primary)'
                  }}>
                    {s.status}
                  </span>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                  {s.description || 'No detailed plan provided.'}
                </p>
                
                {s.status === 'CANCELLED' && (
                  <div style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 800, marginTop: '1rem' }}>
                    ⚠️ This class has been cancelled. {s.cancelReason && `Reason: ${s.cancelReason}`}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <RoughFilter />
    </div>
  )
}
