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
                      <button className="btn-primary" style={{ background: '#059669', padding: '0.75rem 2rem' }} onClick={() => hostAction('JUDGE', currentRound.id, true)}>
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
    const assignedIds = new Set(teams.flatMap(t => t.memberIds))
    const unassignedStudents = students.filter(s => !assignedIds.has(s.id))
    const circleColors = ['#2979ff', '#f50057', '#00c853', '#aa00ff', '#ff6d00', '#00bcd4', '#ffab00']

    return (
      <div style={{ maxWidth: '850px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => setView('list')} className="comic-btn-secondary" style={{ background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.4rem 1.2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>← Back</button>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginTop: '1rem', color: '#1a1a2e' }}>Create Buzzer Quiz</h2>
        </div>
        <form onSubmit={createSession} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Session Details */}
          <div className="card" style={{ border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 800, color: '#1a1a2e' }}>Session details</h3>
            <input className="input-field" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Genetics Chapter Buzzer Quiz" style={{ border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: 600 }} />
          </div>

          {/* Questions Section */}
          <div className="card" style={{ border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', fontWeight: 800, color: '#1a1a2e' }}>Questions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {questions.map((q, i) => {
                const color = circleColors[i % circleColors.length]
                return (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color, border: '2px solid #1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, boxShadow: '2px 2px 0px #1a1a2e' }}>
                      Q{i + 1}
                    </div>
                    <input className="input-field" value={q} onChange={e => { const updated = [...questions]; updated[i] = e.target.value; setQuestions(updated) }} placeholder={`Question ${i + 1}`} style={{ flex: 1, border: '2px solid #1a1a2e', borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.95rem' }} />
                    {questions.length > 1 && (
                      <button type="button" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f50057', color: '#ffffff', border: '2px solid #1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer', flexShrink: 0, boxShadow: '2px 2px 0px #1a1a2e' }} title="Delete question">
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" onClick={() => setQuestions([...questions, ''])} style={{ marginTop: '1.25rem', background: '#00c853', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.5rem 1.25rem', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer' }}>
              + Add question
            </button>
          </div>

          {/* Teams Setup */}
          <div className="card" style={{ border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', fontWeight: 800, color: '#1a1a2e' }}>Teams setup</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {teams.map((team, ti) => (
                <div key={ti} style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '14px', border: '2px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <input value={team.name} onChange={e => { const t = [...teams]; t[ti].name = e.target.value; setTeams(t) }} className="input-field" style={{ flex: 1, border: '2px solid #1a1a2e', borderRadius: '8px', padding: '0.5rem 0.75rem', fontWeight: 800, fontSize: '1rem' }} placeholder="Team name" />
                    <input type="color" value={team.color} onChange={e => { const t = [...teams]; t[ti].color = e.target.value; setTeams(t) }} style={{ width: '42px', height: '42px', padding: '2px', borderRadius: '8px', border: '2px solid #1a1a2e', cursor: 'pointer', boxShadow: '2px 2px 0px #1a1a2e' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Assigned students ({team.memberIds.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '44px', padding: '0.5rem', background: '#ffffff', borderRadius: '10px', border: '2px dashed #cbd5e1' }}>
                      {team.memberIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>No students assigned yet</span>
                      ) : (
                        team.memberIds.map(stId => {
                          const st = students.find(s => s.id === stId)
                          if (!st) return null
                          return (
                            <div key={st.id} style={{ background: team.color, color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '2px 2px 0px #1a1a2e', padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{st.name}</span>
                              <button type="button" onClick={() => {
                                const t = [...teams]
                                t[ti].memberIds = t[ti].memberIds.filter(id => id !== st.id)
                                setTeams(t)
                              }} style={{ background: '#1a1a2e', color: '#ffffff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 900 }} title="Remove student">
                                ✕
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Unassigned Students Pool */}
            <div style={{ padding: '1.25rem', background: '#fffbe8', borderRadius: '14px', border: '2px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 800, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unassigned students pool ({unassignedStudents.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {unassignedStudents.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: '#00c853', fontWeight: 700 }}>✅ All students are assigned to teams!</span>
                ) : (
                  unassignedStudents.map(st => (
                    <div key={st.id} style={{ background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '2px 2px 0px #1a1a2e', padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{st.name}</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {teams.map((t, ti) => (
                          <button key={ti} type="button" onClick={() => {
                            const newTeams = [...teams]
                            newTeams[ti].memberIds = [...newTeams[ti].memberIds, st.id]
                            setTeams(newTeams)
                          }} style={{ background: t.color, color: '#ffffff', border: '1px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }} title={`Add to ${t.name}`}>
                            + {t.name.replace('Team ', '')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button type="button" onClick={() => setTeams([...teams, { name: `Team ${String.fromCharCode(65 + teams.length)}`, color: teams.length % 2 === 0 ? '#00bcd4' : '#aa00ff', memberIds: [] }])} style={{ background: '#2979ff', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.5rem 1.25rem', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer' }}>
              + Add team
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" disabled={creating} style={{ background: '#f50057', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '50px', boxShadow: '4px 4px 0px #1a1a2e', padding: '0.85rem 2.5rem', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.15s ease' }}>
              {creating ? 'Creating setup...' : 'Create & launch setup'}
            </button>
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
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a2e' }}>Live Buzzer Quiz</h2>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Create and host real-time buzzer quiz sessions for your class.</p>
        </div>
        <button onClick={() => setView('create')} style={{ background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '50px', boxShadow: '4px 4px 0px #1a1a2e', padding: '0.7rem 1.8rem', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>
          + New session
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {sessions.map((s, idx) => (
          <div key={s.id} className={`card stagger-${(idx % 5) + 1}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', background: '#ffffff', padding: '1.25rem 1.5rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.35rem', fontSize: '1.2rem', fontWeight: 800, color: '#1a1a2e' }}>{s.title}</h3>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, display: 'flex', gap: '1rem' }}>
                <span>{s.teams?.length || 0} teams</span>
                <span>•</span>
                <span>{s.rounds?.length || 0} questions</span>
                <span>•</span>
                <span>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ padding: '0.35rem 0.9rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, border: '2px solid #1a1a2e', background: s.status === 'ENDED' ? '#e2e8f0' : s.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7', color: s.status === 'ENDED' ? '#475569' : s.status === 'ACTIVE' ? '#15803d' : '#b45309' }}>
                {s.status === 'ENDED' ? 'Ended' : s.status === 'ACTIVE' ? 'Active' : 'Setup'}
              </span>
              {s.status !== 'ENDED' && (
                <button onClick={() => openExistingSession(s)} style={{ background: '#2979ff', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer' }}>
                  Host view →
                </button>
              )}
              <button onClick={() => deleteSession(s.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f50057', color: '#ffffff', border: '2px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900 }} title="Delete Session">
                ✕
              </button>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b', border: '3px dashed #1a1a2e', borderRadius: '16px', background: '#f8fafc' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎙</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.5rem' }}>No buzzer sessions yet</h3>
            <p style={{ fontWeight: 600 }}>Create your first interactive buzzer quiz session to engage your students!</p>
          </div>
        )}
      </div>
    </div>
  )
}

