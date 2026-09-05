'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { RoughFilter } from '@/components/HandDrawnIcons'

export default function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [exams, setExams] = useState<any[]>([])
  const [performance, setPerformance] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [viewMode, setViewMode] = useState<'SESSIONS' | 'INSIGHTS'>('SESSIONS')
  const [sessions, setSessions] = useState<any[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [sessionMarks, setSessionMarks] = useState<any[]>([])
  
  const [sessionForm, setSessionForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    maxMarks: '100',
    highlights: '',
    lows: '',
    suggestions: '',
    marks: [] as { userId: string; name: string; rawMarks: string; grade: string }[]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [examRes, studentRes, perfRes, sessionRes] = await Promise.all([
        fetch(`/api/subjects/${id}/exams`),
        fetch(`/api/subjects/${id}/students`),
        fetch(`/api/subjects/${id}/performance`),
        fetch(`/api/subjects/${id}/exam-sessions`)
      ])
      
      if (studentRes.ok) {
        const studentList = (await studentRes.json()).students
        setStudents(studentList)
        // Initialize session marks with student list
        setSessionForm(prev => ({
          ...prev,
          marks: studentList.map((s: any) => ({ userId: s.id, name: s.name, rawMarks: '', grade: '' }))
        }))
      }
      if (examRes.ok) setExams((await examRes.json()).exams)
      if (perfRes.ok) setPerformance((await perfRes.json()).performance)
      if (sessionRes.ok) setSessions((await sessionRes.json()).sessions)
    } finally {
      setLoading(false)
    }
  }

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/subjects/${id}/exam-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionForm)
    })
    if (res.ok) {
      setShowAdd(false)
      fetchData()
      setViewMode('SESSIONS')
    }
    setLoading(false)
  }

  const fetchSessionMarks = async (title: string) => {
    try {
      const res = await fetch(`/api/subjects/${id}/exams?title=${encodeURIComponent(title)}`)
      if (res.ok) {
        const { records } = await res.json()
        setSessionMarks(records)
      }
    } catch (err) {
      console.error('Failed to fetch session marks')
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/ai/parse-exam-results', {
        method: 'POST',
        body: fd
      })
      if (res.ok) {
        const { results } = await res.json()
        // Map results to existing students
        const updatedMarks = sessionForm.marks.map(m => {
          const match = results.find((r: any) => 
            r.name.toLowerCase().includes(m.name.toLowerCase()) || 
            m.name.toLowerCase().includes(r.name.toLowerCase())
          )
          return match ? { ...m, rawMarks: match.marks.toString(), grade: match.grade || '' } : m
        })
        setSessionForm({ ...sessionForm, marks: updatedMarks })
      }
    } finally {
      setIsParsing(false)
    }
  }

  const filteredData = performance.filter(s => {
    if (filter === 'TOP') return s.overallScore >= 80
    if (filter === 'STRUGGLING') return s.overallScore < 50
    if (filter === 'CONSISTENT') return Math.abs(s.quizAvg - s.examAvg) < 15 && s.overallScore > 60
    return true
  })

  if (loading && !sessions.length) return (
    <div className="content-wrapper pulse" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <h2 style={{ fontWeight: 900 }}>Synthesizing Performance Analytics...</h2>
    </div>
  )

  return (
    <div className="content-wrapper fade-in">
      <RoughFilter />
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Performance Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>Cumulative student rankings and granular assessment logs.</p>
          <button 
            onClick={() => window.print()} 
            className="btn-secondary" 
            style={{ marginTop: '1.5rem', fontSize: '0.85rem', padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            🖨️ Print Academic Report
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '1.25rem', background: 'var(--text-primary)', padding: '10px', borderRadius: '24px', boxShadow: '8px 8px 0 var(--accent-primary)' }}>
          {[
            { id: 'SESSIONS', label: '🧬 Exam Sessions', icon: '🧬' },
            { id: 'INSIGHTS', label: '📊 Helix Analytics', icon: '📊' }
          ].map(mode => (
            <button 
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              style={{ 
                padding: '1rem 1.75rem', borderRadius: '16px', border: 'none', cursor: 'pointer',
                backgroundColor: viewMode === mode.id ? 'var(--accent-primary)' : 'transparent',
                fontWeight: 900, color: 'white', textTransform: 'uppercase', fontSize: '0.85rem',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'SESSIONS' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>Exam Sessions</h3>
            <button className="sketch-button-v2" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'View History' : '+ Log Session'}</button>
          </div>

          {showAdd ? (
            <div className="premium-card-v2" style={{ marginBottom: '4rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 900 }}>Batch Insight Entry</h3>
              
              <form onSubmit={handleSessionSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                  <div>
                    <label className="label-v2">Exam Name (Unique)</label>
                    <input className="input-field" required value={sessionForm.title} onChange={e => setSessionForm({...sessionForm, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-v2">Exam Date</label>
                    <input type="date" className="input-field" required value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-v2">Total Marks</label>
                    <input type="number" className="input-field" required value={sessionForm.maxMarks} onChange={e => setSessionForm({...sessionForm, maxMarks: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                  <div>
                    <label className="label-v2" style={{ color: 'var(--success)' }}>🟢 Batch Highlights</label>
                    <textarea className="input-field" rows={4} value={sessionForm.highlights} onChange={e => setSessionForm({...sessionForm, highlights: e.target.value})} placeholder="What did the batch excel at?" />
                  </div>
                  <div>
                    <label className="label-v2" style={{ color: 'var(--error)' }}>🔴 Batch Lows</label>
                    <textarea className="input-field" rows={4} value={sessionForm.lows} onChange={e => setSessionForm({...sessionForm, lows: e.target.value})} placeholder="Where did they struggle?" />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label className="label-v2" style={{ color: 'var(--dna-blue)' }}>💡 Examiner Suggestions</label>
                    <textarea className="input-field" rows={3} value={sessionForm.suggestions} onChange={e => setSessionForm({...sessionForm, suggestions: e.target.value})} placeholder="Actionable steps for the next session..." />
                  </div>
                </div>

                <div style={{ borderTop: '3px dashed var(--text-primary)', paddingTop: '3rem', marginTop: '3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Bulk Student Marks</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>AI Auto-Fill (PDF):</span>
                      <input type="file" accept=".pdf" style={{ display: 'none' }} id="pdf-upload" onChange={handlePdfUpload} />
                      <label htmlFor="pdf-upload" className="sketch-button-v2" style={{ fontSize: '0.8rem', padding: '8px 16px', backgroundColor: 'var(--dna-blue)' }}>
                        {isParsing ? 'Parsing...' : 'Upload Results PDF'}
                      </label>
                    </div>
                  </div>

                  <div className="sketch-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="sketch-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Student Name</th>
                          <th style={{ textAlign: 'center' }}>Raw Marks</th>
                          <th style={{ textAlign: 'center' }}>Percentage</th>
                          <th style={{ textAlign: 'center' }}>Grade (Opt)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionForm.marks.map((m, idx) => (
                          <tr key={m.userId}>
                            <td style={{ fontWeight: 900 }}>{m.name}</td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number" 
                                className="input-field" 
                                style={{ width: '80px', textAlign: 'center', margin: '0 auto' }}
                                value={m.rawMarks}
                                onChange={e => {
                                  const newMarks = [...sessionForm.marks]
                                  newMarks[idx].rawMarks = e.target.value
                                  setSessionForm({ ...sessionForm, marks: newMarks })
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 900 }}>
                              {m.rawMarks ? Math.round((parseFloat(m.rawMarks) / parseFloat(sessionForm.maxMarks)) * 100) : 0}%
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="text" 
                                className="input-field" 
                                style={{ width: '60px', textAlign: 'center', margin: '0 auto' }}
                                value={m.grade}
                                onChange={e => {
                                  const newMarks = [...sessionForm.marks]
                                  newMarks[idx].grade = e.target.value
                                  setSessionForm({ ...sessionForm, marks: newMarks })
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem' }}>
                  <button type="submit" className="sketch-button-v2" style={{ flex: 1, padding: '1.5rem' }}>Finalize Session & Log Marks</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '2rem' }}>
              {sessions.map(s => (
                <div key={s.id} className="premium-card-v2" style={{ borderLeft: '10px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{s.title}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(s.createdAt).toLocaleDateString()} • {s.subject?.name || 'Subject Analytics'}</p>
                    </div>
                    <div style={{ background: 'var(--text-primary)', color: 'white', padding: '10px 20px', borderRadius: '12px', fontWeight: 900 }}>
                      SESSION INSIGHTS
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', border: '2px solid var(--success)' }}>
                      <strong style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--success)', textTransform: 'uppercase' }}>Highlights</strong>
                      <p style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>{s.highlights || 'No highlights recorded.'}</p>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '2px solid var(--error)' }}>
                      <strong style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--error)', textTransform: 'uppercase' }}>Lows</strong>
                      <p style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>{s.lows || 'No struggles recorded.'}</p>
                    </div>
                    <div style={{ gridColumn: '1/-1', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '2px solid var(--dna-blue)' }}>
                      <strong style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--dna-blue)', textTransform: 'uppercase' }}>Examiner Suggestions</strong>
                      <p style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>{s.suggestions || 'No specific suggestions yet.'}</p>
                    </div>
                  </div>

                  <div style={{ borderTop: '2px dashed var(--bg-tertiary)', paddingTop: '1.5rem' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        if (expandedSession === s.id) {
                          setExpandedSession(null)
                        } else {
                          setExpandedSession(s.id)
                          fetchSessionMarks(s.title)
                        }
                      }}
                      style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {expandedSession === s.id ? '🔼 Hide Result Sheet' : '📋 View Result Sheet'}
                    </button>

                    {expandedSession === s.id && (
                      <div className="fade-in" style={{ marginTop: '1.5rem' }}>
                        <div className="sketch-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          <table className="sketch-table" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left' }}>Student Name</th>
                                <th style={{ textAlign: 'center' }}>Raw Marks</th>
                                <th style={{ textAlign: 'center' }}>Percentage</th>
                                <th style={{ textAlign: 'center' }}>Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessionMarks.map(m => (
                                <tr key={m.id}>
                                  <td style={{ fontWeight: 900 }}>{m.user?.name || 'Unknown Student'}</td>
                                  <td style={{ textAlign: 'center' }}>{m.marks}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 900 }}>{Math.round((m.marks / m.maxMarks) * 100)}%</td>
                                  <td style={{ textAlign: 'center' }}>{m.grade || '--'}</td>
                                </tr>
                              ))}
                              {sessionMarks.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading marks...</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>No exam sessions logged yet.</div>}
            </div>
          )}
        </div>
      )}

      {viewMode === 'INSIGHTS' && (
        <div className="fade-in">
          {/* STATS OVERVIEW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem', marginBottom: '4rem' }}>
            <div className="premium-card-v2" style={{ borderLeft: '12px solid var(--accent-primary)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Batch Average</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>
                {performance.length ? Math.round(performance.reduce((a, b) => a + b.overallScore, 0) / performance.length) : 0}%
              </div>
            </div>
            <div className="premium-card-v2" style={{ borderLeft: '12px solid var(--dna-blue)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Top Percentile</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: 'var(--dna-blue)' }}>
                {performance.filter(s => s.overallScore >= 80).length} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Students</span>
              </div>
            </div>
            <div className="premium-card-v2" style={{ borderLeft: '12px solid var(--error)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '0.1em' }}>At Risk</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: 'var(--error)' }}>
                {performance.filter(s => s.overallScore < 50).length} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Students</span>
              </div>
            </div>
          </div>

          <div className="sketch-table-container">
            <div style={{ padding: '2.5rem', borderBottom: '3px solid var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem', background: 'var(--bg-accent)' }}>
              <div>
                <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>Academic Ranking</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 600 }}>Weighted: 40% Quizzes | 60% Exams</p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {['ALL', 'TOP', 'CONSISTENT', 'STRUGGLING'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setFilter(f)}
                    style={{ 
                      fontSize: '0.75rem', padding: '10px 20px', borderRadius: '12px', border: '2px solid var(--text-primary)', cursor: 'pointer',
                      backgroundColor: filter === f ? 'var(--text-primary)' : 'white',
                      color: filter === f ? 'white' : 'var(--text-primary)',
                      fontWeight: 900, transition: 'all 0.2s', textTransform: 'uppercase',
                      boxShadow: filter === f ? 'none' : '4px 4px 0 var(--text-primary)'
                    }}
                  >
                    {f === 'ALL' ? 'All' : f === 'TOP' ? '⭐ Top' : f === 'CONSISTENT' ? '📈 Stable' : '⚠️ Risk'}
                  </button>
                ))}
              </div>
            </div>
            
            <table className="sketch-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px', textAlign: 'center' }}>Rank</th>
                  <th style={{ textAlign: 'left' }}>Student Identity</th>
                  <th style={{ textAlign: 'center' }}>Quiz Avg</th>
                  <th style={{ textAlign: 'center' }}>Exam Avg</th>
                  <th style={{ textAlign: 'left' }}>Helix Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((s) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', 
                        borderRadius: '12px', border: '2px solid var(--text-primary)',
                        backgroundColor: s.rank <= 3 ? 'var(--accent-primary)' : 'white',
                        color: s.rank <= 3 ? 'white' : 'var(--text-primary)', 
                        fontWeight: 900, fontSize: '1.2rem',
                        boxShadow: '4px 4px 0 var(--text-primary)'
                      }}>
                        {s.rank}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>ID: {s.studentId}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem' }}>{s.quizAvg}%</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem' }}>{s.examAvg}%</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span style={{ 
                          fontWeight: 900, 
                          color: s.overallScore >= 80 ? 'var(--success)' : s.overallScore < 50 ? 'var(--error)' : 'var(--accent-primary)', 
                          fontSize: '1.4rem', minWidth: '70px'
                        }}>{s.overallScore}%</span>
                        <div style={{ flex: 1, height: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '7px', border: '2px solid var(--text-primary)', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${s.overallScore}%`, height: '100%', 
                            backgroundColor: s.overallScore >= 80 ? 'var(--success)' : s.overallScore < 50 ? 'var(--error)' : 'var(--accent-primary)',
                            boxShadow: 'inset -3px 0 0 rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body, .main-content {
            background: white !important;
            color: #000 !important;
            margin-left: 0 !important;
            padding: 1rem !important;
          }
          .sidebar, 
          header, 
          button, 
          .sketch-button-v2, 
          .btn-secondary, 
          input, 
          label,
          form,
          .dna-container,
          .bio-particle,
          link,
          script {
            display: none !important;
          }
          .card, .premium-card-v2 {
            background: white !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            page-break-inside: avoid;
            margin-bottom: 2rem !important;
          }
          .sketch-table-container {
            border: 2px solid #000 !important;
            box-shadow: none !important;
          }
          .sketch-table th, .sketch-table td {
            border-bottom: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  )
}
