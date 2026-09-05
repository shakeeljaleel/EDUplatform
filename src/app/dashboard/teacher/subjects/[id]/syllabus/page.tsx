'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function SyllabusTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTracking()
  }, [])

  const fetchTracking = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/syllabus-tracking`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="pulse">Analyzing syllabus coverage...</div>
  if (!data) return <div>Error loading syllabus data.</div>

  const progressColor = data.percentage > 75 ? 'var(--success)' : data.percentage > 40 ? 'var(--accent-primary)' : '#ef4444';

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/dashboard/teacher/subjects/${id}`} style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}>← Back to Subject</Link>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem' }}>Syllabus Tracker</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Automated tracking based on taught class sessions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* PROGRESS GRAPHIC */}
        <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
          <div style={{ position: 'relative', width: '200px', height: '200px', borderRadius: '50%', background: `conic-gradient(${progressColor} ${data.percentage}%, var(--bg-tertiary) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '160px', height: '160px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '3rem', fontWeight: 900 }}>{data.percentage}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Covered</span>
            </div>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.covered} of {data.total} Objectives</div>
          {data.estimatedEndDate && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(124, 58, 237, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ESTIMATED COMPLETION</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {new Date(data.estimatedEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Based on current teaching pace</div>
            </div>
          )}
        </div>

        {/* OBJECTIVES LIST */}
        <div className="card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Learning Objectives</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.objectives.map((obj: any) => (
              <div key={obj.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', backgroundColor: obj.isCovered ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${obj.isCovered ? 'var(--success)' : 'var(--bg-tertiary)'}` }}>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', color: obj.isCovered ? 'var(--success)' : 'var(--text-secondary)' }}>{obj.code}</div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{obj.description}</div>
                  {obj.isCovered ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem', fontWeight: 600 }}>✓ Covered in class</div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Pending</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
