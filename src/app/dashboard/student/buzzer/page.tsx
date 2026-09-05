'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

export default function StudentBuzzerPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buzzed, setBuzzed] = useState(false)
  const [buzzResult, setBuzzResult] = useState<'first' | 'late' | null>(null)
  const [lastRoundId, setLastRoundId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Find active sessions I'm enrolled in
  useEffect(() => {
    fetchMySessions()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const fetchMySessions = async () => {
    try {
      // Students see sessions via their subject. We'll fetch all active sessions.
      // In practice, a student would navigate here from their subject page.
      // For now, we show a UI to enter a session ID or scan a code.
      setLoading(false)
    } catch { setLoading(false) }
  }

  const [sessionIdInput, setSessionIdInput] = useState('')

  const joinSession = async () => {
    if (!sessionIdInput.trim()) return
    const res = await fetch(`/api/buzzer/${sessionIdInput.trim()}`)
    if (res.ok) {
      const data = await res.json()
      setActiveSession(data.session)
      startPolling(data.session.id)
    } else {
      alert('Session not found. Check the ID.')
    }
  }

  const pollSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/buzzer/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        const s = data.session
        setActiveSession(s)

        // Auto-stop polling when session ends
        if (s.status === 'ENDED' && pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }

        const currentRound = s.rounds?.find((r: any) => r.status === 'OPEN')
        if (currentRound && currentRound.id !== lastRoundId) {
          setLastRoundId(currentRound.id)
          setBuzzed(false)
          setBuzzResult(null)
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, [lastRoundId])

  const startPolling = (sessionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => pollSession(sessionId), 1000)
  }

  const handleBuzz = async () => {
    if (!activeSession || buzzed) return
    const currentRound = activeSession.rounds?.find((r: any) => r.status === 'OPEN')
    if (!currentRound) return

    setIsAnimating(true)
    setBuzzed(true)

    const res = await fetch(`/api/buzzer/${activeSession.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: currentRound.id })
    })

    setTimeout(() => setIsAnimating(false), 600)

    if (res.ok) {
      setBuzzResult('first')
    } else {
      setBuzzResult('late')
    }
  }

  if (loading) return <div className="pulse">Loading...</div>

  const currentRound = activeSession?.rounds?.find((r: any) => r.status === 'OPEN')
  const isEnded = activeSession?.status === 'ENDED'
  const isSetup = activeSession?.status === 'SETUP'
  const teams = activeSession?.teams || []

  if (!activeSession) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎙</div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Join Buzzer Quiz</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Your teacher will share a Session ID. Enter it below to join the live quiz!</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input className="input-field" value={sessionIdInput} onChange={e => setSessionIdInput(e.target.value)} placeholder="Paste Session ID here..." onKeyDown={e => { if (e.key === 'Enter') joinSession() }} />
          <button className="btn-primary" onClick={joinSession}>Join</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, #0a1628, #052e16)' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Session</div>
          <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800 }}>{activeSession.title}</h2>
        </div>
        <span style={{ padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, background: activeSession.status === 'ACTIVE' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)', color: activeSession.status === 'ACTIVE' ? '#6ee7b7' : '#fcd34d' }}>
          {activeSession.status}
        </span>
      </div>

      {/* Scoreboard */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
        {teams.map((team: any) => (
          <div key={team.id} style={{ flex: '1', minWidth: '140px', padding: '1rem', borderRadius: '12px', background: `${team.color}22`, border: `1px solid ${team.color}55`, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: team.color, marginBottom: '0.25rem' }}>{team.name}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{team.score}</div>
          </div>
        ))}
      </div>

      {/* Main Buzzer Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', gap: '2rem' }}>
        {isEnded ? (
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🏆</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Session Ended!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
              {(() => {
                const sorted = [...teams].sort((a: any, b: any) => b.score - a.score)
                const topScore = sorted[0]?.score || 0
                const winners = sorted.filter(t => t.score === topScore)
                if (winners.length > 1 && topScore > 0) {
                  return <>🤝 It's a Draw: <strong style={{ color: '#fcd34d' }}>{winners.map(w => w.name).join(' & ')}</strong></>
                }
                if (topScore === 0) return "No points awarded."
                return <>🏆 Winner: <strong style={{ color: '#fcd34d' }}>{winners[0]?.name}</strong></>
              })()}
            </p>
          </div>
        ) : isSetup ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ fontSize: '1.5rem', color: 'white' }}>Waiting for teacher to start...</h2>
          </div>
        ) : currentRound ? (
          <>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2rem', maxWidth: '600px', width: '100%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Current Question</div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', lineHeight: 1.4 }}>{currentRound.question}</p>
            </div>

            {/* Big Buzzer Button */}
            <div style={{ position: 'relative' }}>
              {isAnimating && (
                <div style={{ position: 'absolute', inset: '-20px', borderRadius: '50%', background: 'rgba(16,185,129,0.3)', animation: 'ping 0.6s ease-out forwards' }} />
              )}
              <button
                onClick={handleBuzz}
                disabled={buzzed}
                style={{
                  width: '200px', height: '200px', borderRadius: '50%', border: 'none', cursor: buzzed ? 'default' : 'pointer',
                  background: buzzed
                    ? buzzResult === 'first' ? 'linear-gradient(145deg, #059669, #047857)' : 'linear-gradient(145deg, #6b7280, #4b5563)'
                    : 'linear-gradient(145deg, #ef4444, #dc2626)',
                  boxShadow: buzzed ? 'none' : '0 8px 40px rgba(239,68,68,0.6), 0 0 0 8px rgba(239,68,68,0.15)',
                  transform: isAnimating ? 'scale(0.93)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px'
                }}>
                <span style={{ fontSize: '3rem' }}>{buzzed ? (buzzResult === 'first' ? '✅' : '❌') : '🔔'}</span>
                <span style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em' }}>
                  {buzzed ? (buzzResult === 'first' ? 'YOU BUZZED!' : 'TOO LATE') : 'BUZZ!'}
                </span>
              </button>
            </div>

            {buzzResult === 'first' && (
              <div style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '12px', padding: '1rem 2rem', textAlign: 'center' }}>
                <div style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '1.25rem' }}>🎉 First buzz! Waiting for teacher's call...</div>
              </div>
            )}
            {buzzResult === 'late' && (
              <div style={{ background: 'rgba(107,114,128,0.2)', border: '1px solid rgba(107,114,128,0.4)', borderRadius: '12px', padding: '1rem 2rem', textAlign: 'center' }}>
                <div style={{ color: '#9ca3af', fontWeight: 700, fontSize: '1rem' }}>Someone buzzed first. Better luck next round!</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏸</div>
            <p>Waiting for teacher to open the next question...</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }
      `}</style>
    </div>
  )
}
