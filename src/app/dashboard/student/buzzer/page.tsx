'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { BuzzerConnection } from '@/lib/buzzer-socket'

export default function StudentBuzzerPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buzzed, setBuzzed] = useState(false)
  const [buzzPending, setBuzzPending] = useState(false)
  const [buzzResult, setBuzzResult] = useState<'first' | 'late' | null>(null)
  const [lastRoundId, setLastRoundId] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  
  // WebSocket / Connection Reliability State
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [studentId, setStudentId] = useState<string | null>(null)
  const buzzerConnRef = useRef<BuzzerConnection | null>(null)

  useEffect(() => {
    fetchMySessions()
    fetch('/api/student/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.id || data?.profile?.userId) {
          setStudentId(data?.user?.id || data?.profile?.userId)
        }
      })
      .catch(() => {})

    return () => {
      if (buzzerConnRef.current) {
        buzzerConnRef.current.destroy()
        buzzerConnRef.current = null
      }
    }
  }, [])

  const fetchMySessions = async () => {
    try {
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  const [sessionIdInput, setSessionIdInput] = useState('')

  const initBuzzerConnection = (sessionId: string) => {
    if (buzzerConnRef.current) {
      buzzerConnRef.current.destroy()
    }

    const conn = new BuzzerConnection(sessionId, {
      onStateUpdate: (state) => {
        if (!state.session) return
        setActiveSession(state.session)

        const currentRound = state.currentRound
        if (currentRound && currentRound.id !== lastRoundId) {
          setLastRoundId(currentRound.id)
          setBuzzed(false)
          setBuzzPending(false)
          setBuzzResult(null)
        }
      },
      onReconnecting: (attempt, max) => {
        setIsReconnecting(true)
        setReconnectAttempt(attempt)
      },
      onReconnected: () => {
        setIsReconnecting(false)
        setReconnectAttempt(0)
      },
      onDisconnected: (reason) => {
        setIsReconnecting(false)
      }
    })

    buzzerConnRef.current = conn
  }

  const joinSession = async () => {
    if (!sessionIdInput.trim()) return
    const id = sessionIdInput.trim()
    const res = await fetch(`/api/buzzer/${id}`)
    if (res.ok) {
      const data = await res.json()
      setActiveSession(data.session)
      initBuzzerConnection(data.session.id)
    } else {
      alert('Session not found. Check the ID.')
    }
  }

  // Direct, immediate buzz action with instant visual feedback and no delays
  const handleBuzz = async () => {
    if (!activeSession || buzzed) return
    const currentRound = activeSession.rounds?.find((r: any) => r.status === 'OPEN')
    if (!currentRound) return

    // Immediate visual feedback on click
    setIsAnimating(true)
    setBuzzed(true)
    setBuzzPending(true)

    // Direct, immediate send via WebSocket / connection manager
    const conn = buzzerConnRef.current
    if (conn) {
      const result = await conn.sendBuzz(currentRound.id, studentId || undefined)
      setIsAnimating(false)
      setBuzzPending(false)

      if (result.ok) {
        setBuzzResult(result.isFirst ? 'first' : 'late')
      } else {
        setBuzzResult('late')
      }
    } else {
      // Fallback direct fetch
      try {
        const res = await fetch(`/api/buzzer/${activeSession.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundId: currentRound.id })
        })
        const data = await res.json()
        setIsAnimating(false)
        setBuzzPending(false)

        if (res.ok) {
          setBuzzResult(data.isFirst ? 'first' : 'late')
        } else {
          setBuzzResult('late')
        }
      } catch {
        setIsAnimating(false)
        setBuzzPending(false)
        setBuzzResult('late')
      }
    }
  }

  if (loading) return <div className="pulse">Loading...</div>

  const currentRound = activeSession?.rounds?.find((r: any) => r.status === 'OPEN')
  const isEnded = activeSession?.status === 'ENDED'
  const isSetup = activeSession?.status === 'SETUP'
  const teams = activeSession?.teams || []

  if (!activeSession) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem 1rem' }}>
        {/* Large Vivid Hero Section */}
        <div style={{
          background: '#f50057',
          color: '#ffffff',
          padding: '3rem 2rem',
          borderRadius: '24px',
          border: '4px solid #1a1a2e',
          boxShadow: '8px 8px 0px #1a1a2e',
          textAlign: 'center',
          marginBottom: '2.5rem'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <h1 style={{ fontSize: '2.75rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
            Speed Buzzer Quiz ⚡
          </h1>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, opacity: 0.95, color: '#ffffff' }}>
            Join your teacher's live quiz session
          </p>
        </div>

        {/* Session ID Join Section */}
        <div style={{
          background: '#ffffff',
          padding: '2rem',
          borderRadius: '20px',
          border: '4px solid #1a1a2e',
          boxShadow: '8px 8px 0px #1a1a2e',
          marginBottom: '3.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <input
            value={sessionIdInput}
            onChange={e => setSessionIdInput(e.target.value)}
            placeholder="Enter session ID..."
            onKeyDown={e => { if (e.key === 'Enter') joinSession() }}
            style={{
              width: '100%',
              padding: '1.25rem 1.5rem',
              fontSize: '1.5rem',
              fontWeight: 800,
              borderRadius: '16px',
              border: '3px solid #1a1a2e',
              outline: 'none',
              color: '#1a1a2e',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.05)'
            }}
          />
          <button
            onClick={joinSession}
            className="buzzer-pulse-btn"
            style={{
              background: '#00c853',
              color: '#ffffff',
              fontSize: '1.2rem',
              fontWeight: 900,
              padding: '16px 48px',
              borderRadius: '50px',
              border: '3px solid #1a1a2e',
              boxShadow: '6px 6px 0px #1a1a2e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.15s ease'
            }}
          >
            ⚡ Join
          </button>
        </div>

        {/* How It Works Section */}
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1.5rem', textAlign: 'center', color: '#1a1a2e' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {/* Card 1 - Green */}
            <div style={{
              background: '#00c853',
              color: '#ffffff',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '3px solid #1a1a2e',
              boxShadow: '5px 5px 0px #1a1a2e'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔑</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff' }}>
                1. Get the code
              </h3>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, opacity: 0.95, color: '#ffffff', lineHeight: 1.4 }}>
                Your teacher shares a session ID at the start of class
              </p>
            </div>

            {/* Card 2 - Blue */}
            <div style={{
              background: '#2979ff',
              color: '#ffffff',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '3px solid #1a1a2e',
              boxShadow: '5px 5px 0px #1a1a2e'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff' }}>
                2. Join the session
              </h3>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, opacity: 0.95, color: '#ffffff', lineHeight: 1.4 }}>
                Enter the code above and wait for the question
              </p>
            </div>

            {/* Card 3 - Red */}
            <div style={{
              background: '#f50057',
              color: '#ffffff',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '3px solid #1a1a2e',
              boxShadow: '5px 5px 0px #1a1a2e'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: '#ffffff' }}>
                3. Hit the buzzer!
              </h3>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, opacity: 0.95, color: '#ffffff', lineHeight: 1.4 }}>
                Tap BUZZ first and answer to win points for your team
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes buzzerPulseGlow {
            0% { boxShadow: 6px 6px 0px #1a1a2e; }
            50% { boxShadow: 0 0 20px rgba(0,200,83,0.5), 6px 6px 0px #1a1a2e; }
            100% { boxShadow: 6px 6px 0px #1a1a2e; }
          }
          .buzzer-pulse-btn {
            animation: buzzerPulseGlow 2s infinite ease-in-out;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
      {/* PART 3: Reconnecting Banner */}
      {isReconnecting && (
        <div style={{
          background: '#ff6d00',
          color: '#ffffff',
          padding: '0.85rem 1.5rem',
          textAlign: 'center',
          fontWeight: 900,
          fontSize: '1rem',
          borderBottom: '3px solid #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          zIndex: 50
        }}>
          <span style={{ fontSize: '1.2rem', animation: 'spin 1.5s linear infinite' }}>🔄</span>
          <span>Reconnecting... (Attempt {reconnectAttempt} of 5)</span>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #ffffff' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Session</div>
          <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 900 }}>{activeSession.title}</h2>
        </div>
        <span style={{ padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 900, background: activeSession.status === 'ACTIVE' ? '#00c853' : '#ff6d00', color: '#ffffff', border: '2px solid #1a1a2e' }}>
          {activeSession.status}
        </span>
      </div>

      {/* Scoreboard */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
        {teams.map((team: any) => (
          <div key={team.id} style={{ flex: '1', minWidth: '140px', padding: '1rem', borderRadius: '16px', background: team.color || '#2979ff', border: '3px solid #1a1a2e', boxShadow: '4px 4px 0px #1a1a2e', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>{team.name}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{team.score}</div>
          </div>
        ))}
      </div>

      {/* Main Buzzer Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', gap: '2rem' }}>
        {isEnded ? (
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🏆</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Session Ended!</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem', fontWeight: 700 }}>
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
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ fontSize: '1.5rem', color: 'white', fontWeight: 900 }}>Waiting for teacher to start...</h2>
          </div>
        ) : currentRound ? (
          <>
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', maxWidth: '600px', width: '100%', textAlign: 'center', border: '4px solid #1a1a2e', boxShadow: '6px 6px 0px #1a1a2e' }}>
              <div style={{ fontSize: '0.75rem', color: '#aa00ff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Current Question</div>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e', lineHeight: 1.4 }}>{currentRound.question}</p>
            </div>

            {/* PART 1: Immediate Buzz Button with immediate visual feedback */}
            <div style={{ position: 'relative' }}>
              {isAnimating && (
                <div style={{ position: 'absolute', inset: '-24px', borderRadius: '50%', background: 'rgba(255,23,68,0.4)', animation: 'ping 0.6s ease-out forwards' }} />
              )}
              <button
                onClick={handleBuzz}
                disabled={buzzed}
                style={{
                  width: '250px',
                  height: '250px',
                  borderRadius: '50%',
                  border: '4px solid #1a1a2e',
                  cursor: buzzed ? 'default' : 'pointer',
                  background: buzzed
                    ? buzzPending
                      ? '#ff9100'
                      : buzzResult === 'first' ? '#00c853' : '#757575'
                    : '#f50057',
                  boxShadow: buzzed && !buzzPending ? 'none' : '6px 6px 0px #1a1a2e',
                  animation: buzzed && !buzzPending ? 'none' : 'pulse 1.5s ease-in-out infinite',
                  transform: isAnimating ? 'scale(0.93)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                <span style={{ fontSize: '4rem' }}>
                  {buzzed
                    ? buzzPending
                      ? '⚡'
                      : buzzResult === 'first' ? '🏆' : '⏱'
                    : '🔔'}
                </span>
                <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.08em', textShadow: '0 2px 8px rgba(0,0,0,0.3)', textAlign: 'center', padding: '0 10px' }}>
                  {buzzed
                    ? buzzPending
                      ? 'BUZZ SENT! ⚡'
                      : buzzResult === 'first' ? 'YOU BUZZED!' : 'TOO LATE'
                    : 'BUZZ!'}
                </span>
              </button>
            </div>

            {buzzPending && (
              <div style={{ background: '#ff9100', color: '#1a1a2e', border: '3px solid #1a1a2e', borderRadius: '16px', padding: '0.75rem 1.5rem', textAlign: 'center', boxShadow: '4px 4px 0px #1a1a2e', fontWeight: 900 }}>
                ⚡ Buzz sent! Checking who buzzed first...
              </div>
            )}
            {buzzResult === 'first' && !buzzPending && (
              <div style={{ background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', padding: '1rem 2rem', textAlign: 'center', boxShadow: '4px 4px 0px #1a1a2e' }}>
                <div style={{ fontWeight: 900, fontSize: '1.25rem' }}>🎉 First buzz! Waiting for teacher's call...</div>
              </div>
            )}
            {buzzResult === 'late' && !buzzPending && (
              <div style={{ background: '#757575', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '16px', padding: '1rem 2rem', textAlign: 'center', boxShadow: '4px 4px 0px #1a1a2e' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Someone buzzed first. Better luck next round!</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏸</div>
            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>Waiting for teacher to open the next question...</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
