'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface LeaderboardEntry {
  id: string
  name: string
  email: string
  stars: number
  goldMedals: number
  silverMedals: number
  bronzeMedals: number
  helixScore: number
  isCurrentStudent: boolean
  rank: number
}

export default function StudentLeaderboard({ currentUserId }: { currentUserId?: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'all_time' | 'month' | 'week'>('all_time')
  const [subjectFilter] = useState<string>('all')
  const [hasScores, setHasScores] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaderboard?timeframe=${timeframe}&subjectId=${subjectFilter}`)
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
        setHasScores(data.hasScores ?? false)
      }
    } finally {
      setLoading(false)
    }
  }, [timeframe, subjectFilter])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  if (loading) return <div className="pulse">Loading leaderboard...</div>

  return (
    <div
      style={{
        border: '3px solid #1a1a2e',
        borderRadius: '16px',
        boxShadow: '5px 5px 0px #1a1a2e',
        background: '#ffffff',
        overflow: 'hidden',
        padding: '1.5rem',
        marginBottom: '3rem'
      }}
    >
      {/* Header & Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏆</span> Batch Leaderboard
          </h2>
          <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
            Real-time standings based on cumulative quiz performance & medals earned.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all_time', label: 'All time' },
            { id: 'month', label: 'This month' },
            { id: 'week', label: 'This week' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id as 'all_time' | 'month' | 'week')}
              style={{
                padding: '0.35rem 0.85rem',
                background: timeframe === t.id ? '#1a1a2e' : '#ffffff',
                color: timeframe === t.id ? '#ffffff' : '#1a1a2e',
                border: '2px solid #1a1a2e',
                borderRadius: '50px',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!hasScores || leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontWeight: 700 }}>
          🧪 No scores yet — be the first to complete a quiz!
        </div>
      ) : (
        <div style={{ border: '2px solid #1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2.5px solid #1a1a2e' }}>
                <th style={{ width: '90px', textAlign: 'center', padding: '0.85rem', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Rank</th>
                <th style={{ textAlign: 'left', padding: '0.85rem', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Student Name</th>
                <th style={{ width: '130px', textAlign: 'center', padding: '0.85rem', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Stars ⭐</th>
                <th style={{ width: '160px', textAlign: 'center', padding: '0.85rem', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>Medals 🏅</th>
                <th style={{ width: '150px', textAlign: 'center', padding: '0.85rem', fontWeight: 900, color: '#1a1a2e', fontSize: '0.85rem' }}>HELIX Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((s) => {
                const isRank1 = s.rank === 1
                const isRank2 = s.rank === 2
                const isRank3 = s.rank === 3
                const isCurrent = s.isCurrentStudent || s.id === currentUserId

                let rowBg = '#ffffff'
                let borderLeft = 'none'

                if (isRank1) { rowBg = '#fffbeb'; borderLeft = '6px solid #ffd700' }
                else if (isRank2) { rowBg = '#f8f8f8'; borderLeft = '6px solid #c0c0c0' }
                else if (isRank3) { rowBg = '#fdf4ee'; borderLeft = '6px solid #cd7f32' }

                if (isCurrent) { rowBg = '#f0fdf4' }

                return (
                  <tr key={s.id} style={{ backgroundColor: rowBg, borderLeft, borderBottom: '1.5px solid #e2e8f0' }}>
                    <td style={{ textAlign: 'center', padding: '0.85rem' }}>
                      {isRank1 ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ffd700', border: '3px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900 }}>🏆</div>
                      ) : isRank2 ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#c0c0c0', border: '3px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900 }}>🥈</div>
                      ) : isRank3 ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#cd7f32', border: '3px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900 }}>🥉</div>
                      ) : (
                        <div style={{ width: '32px', height: '32px', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', color: '#1a1a2e' }}>
                          #{s.rank}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem', fontWeight: 900, fontSize: '1.05rem', color: '#1a1a2e' }}>
                      {s.name}
                      {isCurrent && (
                        <span style={{ marginLeft: '0.5rem', background: '#00c853', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 900 }}>
                          YOU
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center', padding: '0.85rem', fontWeight: 900, color: '#ffd700', fontSize: '1.1rem' }}>
                      ⭐ {s.stars}
                    </td>

                    <td style={{ textAlign: 'center', padding: '0.85rem', fontWeight: 800, fontSize: '0.9rem' }}>
                      {s.goldMedals > 0 && <span style={{ marginRight: '0.3rem' }}>🥇×{s.goldMedals}</span>}
                      {s.silverMedals > 0 && <span style={{ marginRight: '0.3rem' }}>🥈×{s.silverMedals}</span>}
                      {s.bronzeMedals > 0 && <span>🥉×{s.bronzeMedals}</span>}
                      {s.goldMedals === 0 && s.silverMedals === 0 && s.bronzeMedals === 0 && <span style={{ color: '#94a3b8' }}>-</span>}
                    </td>

                    <td style={{ textAlign: 'center', padding: '0.85rem', fontWeight: 900, color: '#00c853', fontSize: '1.2rem' }}>
                      {s.helixScore} pts
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
