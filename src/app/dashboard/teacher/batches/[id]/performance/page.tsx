'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function BatchPerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [performance, setPerformance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // ALL, TOP, STRUGGLING, CONSISTENT

  useEffect(() => {
    fetchPerformance()
  }, [])

  const fetchPerformance = async () => {
    try {
      const res = await fetch(`/api/batches/${id}/performance`)
      if (res.ok) {
        const data = await res.json()
        setPerformance(data.performance)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredData = performance.filter(s => {
    if (filter === 'TOP') return s.overallScore >= 80
    if (filter === 'STRUGGLING') return s.overallScore < 50
    if (filter === 'CONSISTENT') return Math.abs(s.quizAvg - s.examAvg) < 10 && s.overallScore > 60
    return true
  })

  if (loading) return <div className="pulse">Analyzing performance data...</div>

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/teacher/batches/${id}`} style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}>← Back to Batch</Link>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem' }}>Performance Insight</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Advanced ranking and academic health monitoring.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Students', color: 'var(--accent-primary)' },
            { id: 'TOP', label: '⭐ Top Performers', color: 'var(--success)' },
            { id: 'CONSISTENT', label: '📈 Consistent', color: 'var(--dna-blue)' },
            { id: 'STRUGGLING', label: '⚠️ Needs Attention', color: 'var(--error)' }
          ].map((f) => (
            <button 
              key={f.id}
              onClick={() => setFilter(f.id)} 
              className="btn-secondary"
              style={{ 
                backgroundColor: filter === f.id ? 'var(--bg-secondary)' : 'transparent',
                borderColor: filter === f.id ? f.color : 'var(--bg-tertiary)',
                color: filter === f.id ? f.color : 'var(--text-secondary)',
                fontWeight: filter === f.id ? 800 : 500,
                padding: '0.5rem 1rem',
                fontSize: '0.85rem'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Avg Composite</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
            {performance.length ? Math.round(performance.reduce((a, b) => a + b.overallScore, 0) / performance.length) : 0}%
          </div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Distinction (80+)</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)' }}>
            {performance.filter(s => s.overallScore >= 80).length}
          </div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>At Risk (&lt;50)</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--error)' }}>
            {performance.filter(s => s.overallScore < 50).length}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--bg-tertiary)' }}>
              <th style={{ padding: '1.25rem', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Rank</th>
              <th style={{ padding: '1.25rem', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Student</th>
              <th style={{ padding: '1.25rem', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Level</th>
              <th style={{ padding: '1.25rem', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Quiz Avg</th>
              <th style={{ padding: '1.25rem', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Exam Avg</th>
              <th style={{ padding: '1.25rem', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Overall Score</th>
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.studentId || 'N/A'}</div>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <span className="badge badge-level">{s.level || 'Unassigned'}</span>
                </td>
                <td style={{ padding: '1.25rem', fontWeight: 600 }}>{s.quizAvg}%</td>
                <td style={{ padding: '1.25rem', fontWeight: 600 }}>{s.examAvg}%</td>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      fontWeight: 900, 
                      color: s.overallScore >= 80 ? 'var(--success)' : s.overallScore < 50 ? 'var(--error)' : 'var(--accent-primary)', 
                      fontSize: '1.1rem',
                      width: '50px'
                    }}>
                      {s.overallScore}%
                    </span>
                    <div style={{ width: '100px', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${s.overallScore}%`, 
                        height: '100%', 
                        backgroundColor: s.overallScore >= 80 ? 'var(--success)' : s.overallScore < 50 ? 'var(--error)' : 'var(--accent-primary)' 
                      }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No students found matching the current criteria.
          </div>
        )}
      </div>
    </div>
  )
}
