'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { SyllabusIcon, RoughFilter } from '@/components/HandDrawnIcons'

export default function StudentSyllabusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [subject, setSubject] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSyllabus()
  }, [])

  const fetchSyllabus = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/syllabus`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
      
      const subRes = await fetch(`/api/subjects/${id}`)
      if (subRes.ok) {
        const subData = await subRes.json()
        setSubject(subData.subject)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="content-wrapper pulse" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <h2 style={{ fontWeight: 900 }}>Synthesizing Syllabus Roadmap...</h2>
    </div>
  )

  const taught = sessions.filter(s => s.isCovered).length
  const total = sessions.length
  const pct = total > 0 ? Math.round((taught / total) * 100) : 0

  return (
    <div className="content-wrapper fade-in">
      <RoughFilter />
      <div style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 900, textTransform: 'uppercase' }}>
            ← Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <SyllabusIcon size={48} color="var(--accent-primary)" />
            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>{subject?.name}</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>Track your curriculum coverage and exam readiness.</p>
        </div>
        
        <div className="premium-card-v2" style={{ padding: '2rem 3rem', textAlign: 'center', minWidth: '240px' }}>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0.5rem', letterSpacing: '0.1em' }}>Coverage Status</div>
        </div>
      </div>

      <div className="sketch-table-container" style={{ marginBottom: '4rem' }}>
        <table className="sketch-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '180px' }}>Objective Code</th>
              <th style={{ textAlign: 'left' }}>Curriculum Description</th>
              <th style={{ textAlign: 'center', width: '200px' }}>Readiness</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((objective, idx) => (
              <tr key={objective.id} style={{ backgroundColor: objective.isCovered ? 'rgba(16, 185, 129, 0.03)' : 'transparent' }}>
                <td style={{ color: 'var(--accent-primary)', fontWeight: 900, fontSize: '1.1rem' }}>{objective.code}</td>
                <td>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: objective.isCovered ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {objective.description}
                  </div>
                  {objective.isCovered && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem', fontWeight: 800 }}>✓ TAUGHT IN CLASS</div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ 
                    display: 'inline-block',
                    padding: '8px 20px',
                    borderRadius: '12px',
                    border: '2px solid var(--text-primary)',
                    backgroundColor: objective.isCovered ? 'var(--accent-primary)' : 'white',
                    color: objective.isCovered ? 'white' : 'var(--text-secondary)',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    boxShadow: objective.isCovered ? '4px 4px 0 var(--text-primary)' : 'none'
                  }}>
                    {objective.isCovered ? 'Mastered' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sessions.length === 0 && (
          <div style={{ padding: '5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧪</div>
            <h3 style={{ fontWeight: 900, color: 'var(--text-secondary)' }}>No objectives logged for this subject yet.</h3>
            <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Curriculum roadmap will appear once uploaded by the instructor.</p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
        <Link href={`/dashboard/student/subjects/${id}/adaptive-path`} className="sketch-button-v2">
          🪄 Launch AI Study Path
        </Link>
        <Link href={`/dashboard/student/subjects/${id}/grading`} className="sketch-button-v2" style={{ background: 'var(--dna-pink)' }}>
          🤖 Get AI Marking
        </Link>
      </div>
    </div>
  )
}
