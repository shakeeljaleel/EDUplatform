'use client'

import { useState, useEffect, use, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

export default function LessonPlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = use(params)
  const [topic, setTopic] = useState('')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [syllabusId, setSyllabusId] = useState('')
  const [syllabusObjectives, setSyllabusObjectives] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [error, setError] = useState('')
  
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const chatEndRef = useRef<null | HTMLDivElement>(null)

  useEffect(() => {
    fetchPlans()
    fetchSyllabus()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchPlans = async () => {
    const res = await fetch(`/api/subjects/${subjectId}/lesson-plan`)
    if (res.ok) setPlans(await res.json())
  }

  const fetchSyllabus = async () => {
    const res = await fetch(`/api/subjects/${subjectId}/syllabus`)
    if (res.ok) setSyllabusObjectives(await res.json())
  }

  const handleGenerate = async () => {
    if (!topic && !syllabusId) return
    
    const userMsg = { 
      role: 'user', 
      text: `Draft a lesson for: ${topic || 'Syllabus Objective'}. ${teacherNotes ? `Notes: ${teacherNotes}` : ''}` 
    }
    setChatMessages(prev => [...prev, userMsg])
    
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/subjects/${subjectId}/lesson-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: topic || 'New Lesson', 
          syllabusObjectiveId: syllabusId,
          teacherNotes 
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      
      const botMsg = { 
        role: 'assistant', 
        text: `Success! I've generated "${data.title}" strictly aligned with your syllabus requirements.`,
        plan: data
      }
      setChatMessages(prev => [...prev, botMsg])
      setSelectedPlan(data)
      fetchPlans()
      setTopic('')
      setTeacherNotes('')
    } catch (err: any) {
      setError(err.message)
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I encountered an error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToBuzzer = async (planId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/subjects/${subjectId}/buzzer/import-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonPlanId: planId })
      })
      if (res.ok) {
        window.location.href = `/dashboard/teacher/subjects/${subjectId}/buzzer`
      } else {
        const data = await res.json()
        setError(data.error || 'Conversion failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Syllabus-Aligned Assistant</h4>
        <h1>AI Co-Pilot Chat</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', height: 'calc(100vh - 250px)' }}>
        
        {/* Left Sidebar - History & Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Curriculum Mapping</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Syllabus Objective</label>
              <select 
                className="input-field" 
                style={{ fontSize: '0.875rem' }}
                value={syllabusId}
                onChange={e => setSyllabusId(e.target.value)}
              >
                <option value="">-- Generic / Manual --</option>
                {syllabusObjectives.map(obj => (
                  <option key={obj.id} value={obj.id}>[{obj.code}] {obj.description.slice(0, 40)}...</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Topic (Optional)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Specific focus..." 
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Your Class Notes / Context</label>
              <textarea 
                className="input-field" 
                placeholder="Mention specific resources or notes you want to integrate..." 
                style={{ minHeight: '100px', fontSize: '0.875rem' }}
                value={teacherNotes}
                onChange={e => setTeacherNotes(e.target.value)}
              />
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%' }}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? '🪄 Processing...' : '🪄 Generate with AI'}
            </button>
          </div>

          <h3 style={{ fontSize: '1.125rem' }}>Recent Plans</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {plans.map(p => (
              <div 
                key={p.id} 
                className="card" 
                style={{ 
                  padding: '1rem', 
                  cursor: 'pointer', 
                  borderColor: selectedPlan?.id === p.id ? 'var(--accent-primary)' : 'transparent',
                  background: selectedPlan?.id === p.id ? 'var(--bg-accent)' : 'white'
                }}
                onClick={() => {
                  setSelectedPlan(p)
                  setChatMessages([{ role: 'assistant', text: `Viewing: ${p.title}`, plan: p }])
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {p.syllabusObjective ? `[${p.syllabusObjective.code}]` : 'Manual'} • {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Chat & Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          
          {/* Chat Bubble Area */}
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '10%', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '3rem' }}>🧬</span>
                <h3 style={{ marginTop: '1rem' }}>Ready to co-pilot?</h3>
                <p>Select a syllabus objective on the left and I'll build your lesson plan.</p>
              </div>
            )}
            
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-accent)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '1rem 1.5rem',
                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <p style={{ fontSize: '0.95rem' }}>{msg.text}</p>
                
                {msg.plan && (
                  <button 
                    onClick={() => setSelectedPlan(msg.plan)}
                    style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: 'var(--accent-primary)' }}
                  >
                    View Plan Detail ↓
                  </button>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Active Plan Modal/Overlay (Optional, but integrated here for flow) */}
          {selectedPlan && (
            <div style={{ borderTop: '2px solid var(--accent-primary)', padding: '2rem', background: '#f8fafc', height: '60%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2>{selectedPlan.title}</h2>
                <button className="btn-secondary" onClick={() => setSelectedPlan(null)}>✕ Close</button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '2rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Objectives</h4>
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <ReactMarkdown>{selectedPlan.objectives}</ReactMarkdown>
                  </div>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Lesson Content</h4>
                  <div className="prose">
                    <ReactMarkdown>{selectedPlan.content}</ReactMarkdown>
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom: '1rem' }}>Keywords</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                    {selectedPlan.keywords.split(',').map((k: string) => (
                      <span key={k} className="badge" style={{ background: 'var(--dna-purple)', color: 'white' }}>{k.trim()}</span>
                    ))}
                  </div>
                  <h4 style={{ marginBottom: '1rem' }}>Syllabus Code</h4>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-accent)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '2rem' }}>
                    {selectedPlan.syllabusObjective?.code || 'None'}
                  </div>

                  <h4 style={{ marginBottom: '1rem' }}>Quiz Draft</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {JSON.parse(selectedPlan.quizDraft || '[]').map((q: any, i: number) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
                        <strong>Q{i+1}:</strong> {q.question}
                      </div>
                    ))}
                    <button 
                      className="btn-primary" 
                      style={{ marginTop: '1rem', background: 'linear-gradient(135deg, var(--dna-purple), var(--accent-primary))' }}
                      onClick={() => handleConvertToBuzzer(selectedPlan.id)}
                      disabled={loading}
                    >
                      🚀 Convert to Live Buzzer Quiz
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .prose :global(h1), .prose :global(h2), .prose :global(h3) { margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--text-primary); }
        .prose :global(p) { margin-bottom: 1rem; line-height: 1.6; }
        .prose :global(ul) { margin-left: 1.5rem; margin-bottom: 1rem; }
      `}</style>
    </div>
  )
}
