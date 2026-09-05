'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function AdaptivePathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = use(params)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Flashcards state
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [cardsError, setCardsError] = useState('')

  useEffect(() => {
    fetchPath()
  }, [])

  const fetchPath = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/student/performance/${subjectId}/adaptive-path`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to fetch path')
      setData(d)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateFlashcards = async () => {
    setLoadingCards(true)
    setCardsError('')
    setIsFlipped(false)
    setCurrentCardIndex(0)
    try {
      const res = await fetch(`/api/student/performance/${subjectId}/flashcards`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to generate flashcards')
      setFlashcards(d.flashcards || [])
    } catch (err: any) {
      setCardsError(err.message)
    } finally {
      setLoadingCards(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: '60px', height: '60px', border: '5px solid var(--bg-accent)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ marginTop: '2rem', fontWeight: 600 }}>Analyzing your performance with AI...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div className="content-wrapper">
      <Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem', display: 'inline-block' }}>← Back to Dashboard</Link>
      <div className="card" style={{ color: 'var(--error)', borderLeft: '10px solid var(--error)' }}>
        <h3>Analysis Error</h3>
        <p>{error}</p>
      </div>
    </div>
  )

  if (data?.message) return (
    <div className="content-wrapper">
      <Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem', display: 'inline-block' }}>← Back to Dashboard</Link>
      <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
        <span style={{ fontSize: '3rem' }}>📉</span>
        <h3 style={{ margin: '1rem 0' }}>Not Enough Data</h3>
        <p>{data.message}</p>
      </div>
    </div>
  )

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '3rem' }}>
        <Link href="/dashboard/student" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', display: 'inline-block' }}>← Back to Dashboard</Link>
        <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personalized Guidance</h4>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Your AI Study Path</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>Based on your quiz and exam results, here is your custom biological roadmap.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start', marginBottom: '4rem' }}>
        
        {/* Left Column - Analysis & Weak Spots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div className="premium-card-v2" style={{ borderLeft: '12px solid var(--accent-primary)' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', fontWeight: 900 }}>
              🧠 Performance Insights
            </h3>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--text-primary)', fontWeight: 700 }}>{data.analysis}</p>
            <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', borderLeft: '5px solid var(--accent-primary)', border: '2px solid rgba(16, 185, 129, 0.15)', borderLeftWidth: '6px' }}>
              <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.25rem' }}>💡 HELIX STUDY TIP</strong>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{data.encouragement}</span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--error)', fontSize: '1.5rem', fontWeight: 900 }}>🔍 Focus Topics (Weak Spots)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {data.weakTopics.map((topic: string) => (
                <span key={topic} className="sketch-badge" style={{ borderColor: 'var(--error)', boxShadow: '3px 3px 0 var(--error)', color: 'var(--error)', padding: '8px 16px', fontSize: '0.85rem' }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Recommendations */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 900 }}>🛠️ Recommended Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.recommendedActions.map((action: any, idx: number) => (
              <div key={idx} style={{ 
                padding: '1.25rem', 
                background: 'white', 
                borderRadius: '16px', 
                border: '2px solid var(--text-primary)',
                boxShadow: '4px 4px 0 var(--text-primary)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <div style={{ 
                  width: '36px', height: '36px', 
                  borderRadius: '50%', 
                  background: action.priority === 'High' ? 'var(--error)' : 'var(--dna-blue)',
                  border: '2px solid var(--text-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  flexShrink: 0
                }}>
                  {idx + 1}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900 }}>{action.topic}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: action.priority === 'High' ? 'var(--error)' : 'var(--dna-blue)', background: action.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${action.priority === 'High' ? 'var(--error)' : 'var(--dna-blue)'}` }}>
                      {action.priority} Priority
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{action.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* AI FLASHCARDS SECTION */}
      <div style={{ borderTop: '3px dashed var(--text-primary)', paddingTop: '4rem', marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem' }}>🪄 DNA Study Decks</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', fontWeight: 600 }}>
            Generate interactive AI revision flashcards customized exactly to your learning pace and weakest subject topics.
          </p>
          <button 
            className="sketch-button-v2" 
            style={{ marginTop: '2rem', background: 'var(--accent-primary)', fontSize: '1rem', padding: '1rem 2.5rem' }} 
            onClick={generateFlashcards}
            disabled={loadingCards}
          >
            {loadingCards ? '🧬 Synthesizing Deck...' : flashcards.length > 0 ? '🔄 Regenerate Flashcards' : '🔮 Generate Revision Flashcards'}
          </button>
        </div>

        {loadingCards && (
          <div style={{ textAlign: 'center', padding: '3rem' }} className="pulse">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧬</div>
            <h3 style={{ fontWeight: 900 }}>Gemini is constructing your flashcard deck...</h3>
          </div>
        )}

        {cardsError && (
          <div className="card" style={{ color: 'var(--error)', maxWidth: '500px', margin: '0 auto', borderLeft: '10px solid var(--error)' }}>
            <strong>Error:</strong> {cardsError}
          </div>
        )}

        {flashcards.length > 0 && !loadingCards && (
          <div className="fade-in">
            {/* 3D Flashcard Wrapper */}
            <div className="card-container">
              <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                {/* Front Side */}
                <div className="card-face card-front">
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.1em', marginBottom: '1.5rem', border: '2px solid var(--accent-primary)', padding: '4px 12px', borderRadius: '8px' }}>
                    {flashcards[currentCardIndex].category}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.4, margin: '0 1rem' }}>
                    {flashcards[currentCardIndex].front}
                  </h3>
                  <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    👆 Click to flip card
                  </div>
                </div>

                {/* Back Side */}
                <div className="card-face card-back">
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--dna-blue)', letterSpacing: '0.1em', marginBottom: '1.5rem', border: '2px solid var(--dna-blue)', padding: '4px 12px', borderRadius: '8px' }}>
                    EXPLANATION
                  </div>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                    {flashcards[currentCardIndex].back}
                  </p>
                  <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    👆 Click to flip back
                  </div>
                </div>
              </div>
            </div>

            {/* Deck Navigation Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginTop: '3rem' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.75rem 1.5rem', fontWeight: 900 }}
                onClick={() => {
                  if (currentCardIndex > 0) {
                    setIsFlipped(false)
                    setTimeout(() => setCurrentCardIndex(currentCardIndex - 1), 150)
                  }
                }}
                disabled={currentCardIndex === 0}
              >
                ◀ Prev
              </button>

              <span style={{ fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Card {currentCardIndex + 1} of {flashcards.length}
              </span>

              <button 
                className="btn-secondary" 
                style={{ padding: '0.75rem 1.5rem', fontWeight: 900 }}
                onClick={() => {
                  if (currentCardIndex < flashcards.length - 1) {
                    setIsFlipped(false)
                    setTimeout(() => setCurrentCardIndex(currentCardIndex + 1), 150)
                  }
                }}
                disabled={currentCardIndex === flashcards.length - 1}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Embedded 3D card flipping CSS */}
      <style>{`
        .card-container {
          perspective: 1000px;
          width: 100%;
          max-width: 550px;
          height: 320px;
          margin: 0 auto;
        }
        .flashcard {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .flashcard.flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border: var(--sketch-border);
          border-radius: var(--radius-md);
          box-shadow: var(--sketch-shadow);
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          transition: border-color 0.3s;
        }
        .card-front {
          background: white;
          color: var(--text-primary);
        }
        .card-front:hover {
          border-color: var(--accent-primary);
        }
        .card-back {
          background: var(--bg-accent);
          color: var(--text-primary);
          transform: rotateY(180deg);
        }
        .card-back:hover {
          border-color: var(--dna-blue);
        }
      `}</style>
    </div>
  )
}
