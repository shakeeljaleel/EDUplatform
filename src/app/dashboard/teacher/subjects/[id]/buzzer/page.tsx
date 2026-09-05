'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'

export default function TeacherBuzzerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'create' | 'host'>('list')

  // Create session form
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<string[]>(['', '', ''])
  const [teams, setTeams] = useState([
    { name: 'Team Alpha', color: '#059669', memberIds: [] as string[] },
    { name: 'Team Beta', color: '#2563eb', memberIds: [] as string[] }
  ])
  const [students, setStudents] = useState<any[]>([])
  const [creating, setCreating] = useState(false)

  // Host view
  const [liveSession, setLiveSession] = useState<any>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchSessions()
    fetchStudents()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/buzzer`)
      if (res.ok) setSessions((await res.json()).sessions)
    } finally { setLoading(false) }
  }

  const fetchStudents = async () => {
    const res = await fetch(`/api/users?role=STUDENT`)
    if (res.ok) setStudents((await res.json()).users || [])
  }

  const fetchLiveSession = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/buzzer/${sessionId}`)
    if (res.ok) setLiveSession((await res.json()).session)
  }, [])

  const startPolling = (sessionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => fetchLiveSession(sessionId), 1500)
  }

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch(`/api/subjects/${id}/buzzer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, teams, questions: questions.filter(q => q.trim()) })
      })
      if (res.ok) {
        const data = await res.json()
        setActiveSession(data.session)
        await fetchLiveSession(data.session.id)
        startPolling(data.session.id)
        setView('host')
        fetchSessions()
      }
    } finally { setCreating(false) }
  }

  const hostAction = async (action: string, roundId?: string, correct?: boolean) => {
    if (!liveSession) return
    const res = await fetch(`/api/buzzer/${liveSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, roundId, correct })
    })
    if (res.ok) setLiveSession((await res.json()).session)
  }

  const openExistingSession = async (s: any) => {
    setActiveSession(s)
    await fetchLiveSession(s.id)
    startPolling(s.id)
    setView('host')
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return
    const res = await fetch(`/api/buzzer/${sessionId}`, { method: 'DELETE' })
    if (res.ok) fetchSessions()
  }

  if (loading) return <div className="pulse">Loading buzzer sessions...</div>

  // ── HOST VIEW ──────────────────────────────────────────────────────────────
  if (view === 'host' && liveSession) {
    const currentRound = liveSession.rounds?.find((r: any) => r.status === 'OPEN')
    const firstBuzz = currentRound?.buzzes?.[0]
    const isEnded = liveSession.status === 'ENDED'

    return (
      <div style={{ maxWidth: '100%', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900 }}>🎙 {liveSession.title}</h1>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, background: liveSession.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: liveSession.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)' }}>
                {liveSession.status}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--bg-accent)', padding: '0.35rem 1rem', borderRadius: '99px' }}>
                Join Code: <strong style={{ letterSpacing: '0.05em' }}>{liveSession.joinCode || liveSession.id.slice(0, 8)}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {liveSession.status === 'SETUP' && <button className="btn-primary" onClick={() => hostAction('START')}>🚀 Start Session</button>}
            {liveSession.status === 'ACTIVE' && <button className="btn-secondary" style={{ borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => hostAction('END')}>End Session</button>}
            <button className="btn-secondary" onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setView('list') }}>← Back</button>
          </div>
        </div>

        {/* Scoreboard */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${liveSession.teams?.length || 2}, 1fr)`, gap: '1rem', marginBottom: '2rem' }}>
          {liveSession.teams?.map((team: any, i: number) => (
            <div key={team.id} className="card" style={{ textAlign: 'center', background: `linear-gradient(145deg, ${team.color}22, ${team.color}11)`, borderLeft: `4px solid ${team.color}` }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: team.color, marginBottom: '0.5rem' }}>{team.name}</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>{team.score}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>pts</div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {team.members?.map((m: any) => m.user.name).join(', ') || 'No members'}
              </div>
            </div>
          ))}
        </div>

        {isEnded ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'linear-gradient(145deg, #fef3c7, #fde68a)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
            <h2 style={{ fontSize: '2rem', color: '#92400e' }}>Session Ended!</h2>
            <div style={{ fontSize: '1.25rem', marginTop: '1rem', color: '#78350f' }}>
              {(() => {
                const sorted = [...liveSession.teams].sort((a: any, b: any) => b.score - a.score)
                const topScore = sorted[0]?.score || 0
                const winners = sorted.filter(t => t.score === topScore)
                if (winners.length > 1 && topScore > 0) {
                  return <>🤝 It's a Draw: <strong>{winners.map(w => w.name).join(' & ')}</strong></>
                }
                if (topScore === 0) return <>No points awarded this session.</>
                return <>🏆 Winner: <strong>{winners[0]?.name}</strong></>
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* Current Buzzer */}
            {currentRound && (
              <div className="card fade-in" style={{ marginBottom: '2rem', padding: '2rem', background: 'linear-gradient(145deg, #f0fdf4, #eff6ff)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Round Open — Students can buzz!</div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{currentRound.question}</h2>

                {firstBuzz ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>
                      🔔 First Buzz: <strong>{firstBuzz.user.name}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      at {new Date(firstBuzz.buzzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                      <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '0.75rem 2rem' }} onClick={() => hostAction('JUDGE', currentRound.id, true)}>
                        ✅ Correct (+{currentRound.points} pts)
                      </button>
                      <button className="btn-secondary" style={{ borderColor: 'var(--error)', color: 'var(--error)', padding: '0.75rem 2rem' }} onClick={() => hostAction('JUDGE', currentRound.id, false)}>
                        ❌ Incorrect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Waiting for students to buzz...</div>
                )}
              </div>
            )}

            {/* Round List */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {liveSession.rounds?.map((round: any, i: number) => (
                  <div key={round.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: round.status === 'OPEN' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.5)', borderRadius: '8px', border: `1px solid ${round.status === 'OPEN' ? 'var(--accent-primary)' : 'var(--bg-tertiary)'}` }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Q{i + 1}</span>
                      <span style={{ fontSize: '0.95rem' }}>{round.question}</span>
                      {round.status === 'JUDGED' && (
                        <span style={{ fontSize: '0.75rem', color: round.correct ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>
                          {round.correct ? '✅' : '❌'} {round.winner?.name || '—'}
                        </span>
                      )}
                    </div>
                    {liveSession.status === 'ACTIVE' && round.status === 'PENDING' && (
                      <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 1rem' }} onClick={() => hostAction('OPEN_ROUND', round.id)}>
                        Open
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── CREATE VIEW ────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>← Back</button>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '1rem' }}>Create Buzzer Quiz</h2>
        </div>
        <form onSubmit={createSession} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Session Details</h3>
            <input className="input-field" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Genetics Chapter Buzzer Quiz" />
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Questions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {questions.map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)', minWidth: '24px', fontSize: '0.9rem' }}>Q{i + 1}</span>
                  <input className="input-field" value={q} onChange={e => { const updated = [...questions]; updated[i] = e.target.value; setQuestions(updated) }} placeholder={`Question ${i + 1}`} />
                  {questions.length > 1 && <button type="button" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setQuestions([...questions, ''])} className="btn-secondary" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>+ Add Question</button>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Teams</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {teams.map((team, ti) => (
                <div key={ti} style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '12px', border: `2px solid ${team.color}33` }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input value={team.name} onChange={e => { const t = [...teams]; t[ti].name = e.target.value; setTeams(t) }} className="input-field" style={{ flex: 1 }} placeholder="Team name" />
                    <input type="color" value={team.color} onChange={e => { const t = [...teams]; t[ti].color = e.target.value; setTeams(t) }} style={{ width: '50px', height: '50px', padding: '4px', borderRadius: '8px', border: '1px solid var(--bg-tertiary)', cursor: 'pointer' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Add Students:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {students.map(s => {
                        const inThisTeam = team.memberIds.includes(s.id)
                        const inOtherTeam = teams.some((t, idx) => idx !== ti && t.memberIds.includes(s.id))
                        return (
                          <button type="button" key={s.id} disabled={inOtherTeam && !inThisTeam} onClick={() => {
                            const t = [...teams]
                            if (inThisTeam) t[ti].memberIds = t[ti].memberIds.filter(id => id !== s.id)
                            else t[ti].memberIds = [...t[ti].memberIds, s.id]
                            setTeams(t)
                          }} style={{ padding: '0.3rem 0.75rem', borderRadius: '99px', border: `1px solid ${inThisTeam ? team.color : 'var(--bg-tertiary)'}`, background: inThisTeam ? `${team.color}22` : 'white', color: inOtherTeam && !inThisTeam ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '0.8rem', cursor: inOtherTeam && !inThisTeam ? 'not-allowed' : 'pointer', opacity: inOtherTeam && !inThisTeam ? 0.4 : 1 }}>
                            {s.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setTeams([...teams, { name: `Team ${String.fromCharCode(65 + teams.length)}`, color: '#7c3aed', memberIds: [] }])} className="btn-secondary" style={{ fontSize: '0.875rem' }}>+ Add Team</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : '🚀 Create & Launch Setup'}</button>
          </div>
        </form>
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Live Buzzer Quiz</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Create and host real-time buzzer quiz sessions for your class.</p>
        </div>
        <button className="btn-primary" onClick={() => setView('create')}>+ New Session</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sessions.map((s, idx) => (
          <div key={s.id} className={`card stagger-${(idx % 5) + 1}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>{s.title}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                <span>{s.teams?.length} teams</span>
                <span>{s.rounds?.length} questions</span>
                <span>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: s.status === 'ENDED' ? 'rgba(156,163,175,0.15)' : s.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.status === 'ENDED' ? '#6b7280' : s.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)' }}>
                {s.status}
              </span>
              {s.status !== 'ENDED' && <button className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }} onClick={() => openExistingSession(s)}>Host View →</button>}
              <button onClick={() => deleteSession(s.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }} title="Delete Session">🗑</button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙</div>
            <p>No buzzer sessions yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
