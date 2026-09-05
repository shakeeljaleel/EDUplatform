'use client'

import React, { useState, useEffect } from 'react'

interface PerformanceData {
  id: string
  name: string
  email: string
  level?: string
  studentId: string
  quizAvg: number
  examAvg: number
  overallScore: number
  rank: number
}

export default function PerformanceTab({ batchId }: { batchId: string }) {
  const [performance, setPerformance] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await fetch(`/api/batches/${batchId}/performance`)
        if (res.ok) {
          const data = await res.json()
          setPerformance(data.performance)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchPerformance()
  }, [batchId])

  const filteredData = performance.filter(s => {
    if (filter === 'TOP') return s.overallScore >= 80
    if (filter === 'STRUGGLING') return s.overallScore < 50
    if (filter === 'CONSISTENT') return Math.abs(s.quizAvg - s.examAvg) < 10 && s.overallScore > 60
    return true
  })

  if (loading) return <div className="pulse">Generating advanced insights...</div>

  return (
    <div className="fade-in">
      {/* STATS OVERVIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Batch Average</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {performance.length ? Math.round(performance.reduce((a, b) => a + b.overallScore, 0) / performance.length) : 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Cumulative performance across all assessments</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>High Achievers</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--success)' }}>
            {performance.filter(s => s.overallScore >= 80).length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Students with Distinction (80%+)</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--error)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Academic Risk</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--error)' }}>
            {performance.filter(s => s.overallScore < 50).length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Students needing immediate attention</div>
        </div>
      </div>

      {/* FILTERS & LIST */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Academic Ranking</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ALL', 'TOP', 'CONSISTENT', 'STRUGGLING'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className="btn-secondary"
                style={{ 
                  fontSize: '0.75rem', padding: '0.5rem 1rem',
                  backgroundColor: filter === f ? 'var(--bg-secondary)' : 'transparent',
                  borderColor: filter === f ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: filter === f ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: filter === f ? 800 : 500
                }}
              >
                {f === 'ALL' ? 'All' : f === 'TOP' ? '⭐ Top' : f === 'CONSISTENT' ? '📈 Consistent' : '⚠️ At Risk'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--bg-tertiary)' }}>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Rank</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Quiz Avg</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Exam Avg</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--bg-tertiary)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', 
                      borderRadius: '50%', backgroundColor: s.rank <= 3 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                      color: s.rank <= 3 ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 800
                    }}>
                      {s.rank}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.studentId}</div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>{s.quizAvg}%</td>
                  <td style={{ padding: '1.25rem' }}>{s.examAvg}%</td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 900, color: s.overallScore >= 80 ? 'var(--success)' : s.overallScore < 50 ? 'var(--error)' : 'var(--accent-primary)', fontSize: '1.1rem' }}>{s.overallScore}%</span>
                      <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${s.overallScore}%`, height: '100%', backgroundColor: s.overallScore >= 80 ? 'var(--success)' : s.overallScore < 50 ? 'var(--error)' : 'var(--accent-primary)' }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
