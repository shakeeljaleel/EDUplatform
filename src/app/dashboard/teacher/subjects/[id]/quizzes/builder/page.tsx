'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function QuizBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = React.use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialLinkedSessionId = searchParams.get('linkedSessionId') || ''
  const initialTopic = searchParams.get('topic') || ''

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<any[]>([])

  // Section A — Quiz Setup
  const [title, setTitle] = useState(initialTopic ? `Quiz: ${initialTopic}` : '')
  const [topic, setTopic] = useState(initialTopic)
  const [description, setDescription] = useState('')
  const [linkedSessionId, setLinkedSessionId] = useState(initialLinkedSessionId)
  const [dueDate, setDueDate] = useState('')
  const [hasTimeLimit, setHasTimeLimit] = useState(false)
  const [timeLimitMins, setTimeLimitMins] = useState(30)
  const [showAnswersAfterSubmission, setShowAnswersAfterSubmission] = useState(true)
  const [allowOneAttempt, setAllowOneAttempt] = useState(true)
  const [markingMode, setMarkingMode] = useState<'AUTO_AI' | 'MANUAL_ONLY'>('AUTO_AI')

  // Section B — Questions
  const [questions, setQuestions] = useState<any[]>([
    {
      type: 'MCQ',
      text: 'Which organelle is known as the powerhouse of the cell?',
      maxMarks: 10,
      options: [
        { id: 'opt_1', text: 'Mitochondria', is_correct: true, imageUrl: '' },
        { id: 'opt_2', text: 'Nucleus', is_correct: false, imageUrl: '' },
        { id: 'opt_3', text: 'Ribosome', is_correct: false, imageUrl: '' },
        { id: 'opt_4', text: 'Golgi Apparatus', is_correct: false, imageUrl: '' }
      ],
      correctOption: 0,
      markScheme: '',
      hasWordLimit: false,
      wordLimit: 100
    }
  ])

  const [showPublishModal, setShowPublishModal] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        if (initialLinkedSessionId) {
          const match = data.sessions.find((s: any) => s.id === initialLinkedSessionId)
          if (match) {
            if (!title) setTitle(`Quiz: ${match.title}`)
            if (!topic) setTopic(match.title)
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleLessonSelect = (sessId: string) => {
    setLinkedSessionId(sessId)
    if (sessId) {
      const sess = sessions.find(s => s.id === sessId)
      if (sess) {
        setTitle(`Quiz: ${sess.title}`)
        setTopic(sess.title)
      }
    }
  }

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        type: 'MCQ',
        text: '',
        maxMarks: 10,
        options: [
          { id: `opt_${Date.now()}_1`, text: '', is_correct: true, imageUrl: '' },
          { id: `opt_${Date.now()}_2`, text: '', is_correct: false, imageUrl: '' },
          { id: `opt_${Date.now()}_3`, text: '', is_correct: false, imageUrl: '' },
          { id: `opt_${Date.now()}_4`, text: '', is_correct: false, imageUrl: '' }
        ],
        correctOption: 0,
        markScheme: '',
        hasWordLimit: false,
        wordLimit: 100
      }
    ])
  }

  const removeQuestion = (idx: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setQuestions(prev => prev.filter((_, i) => i !== idx))
    }
  }

  const duplicateQuestion = (idx: number) => {
    const target = questions[idx]
    const clone = JSON.parse(JSON.stringify(target))
    setQuestions(prev => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)])
  }

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    if (idx + dir < 0 || idx + dir >= questions.length) return
    const updated = [...questions]
    const temp = updated[idx]
    updated[idx] = updated[idx + dir]
    updated[idx + dir] = temp
    setQuestions(updated)
  }

  const updateQuestion = (idx: number, field: string, val: any) => {
    setQuestions(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      return updated
    })
  }

  const updateMcqOption = (qIdx: number, optIdx: number, text: string, imageUrl: string = '') => {
    setQuestions(prev => {
      const updated = [...prev]
      const opts = [...updated[qIdx].options]
      opts[optIdx] = { ...opts[optIdx], text, imageUrl }
      updated[qIdx].options = opts
      return updated
    })
  }

  const setCorrectMcqOption = (qIdx: number, optIdx: number) => {
    setQuestions(prev => {
      const updated = [...prev]
      updated[qIdx].correctOption = optIdx
      updated[qIdx].options = updated[qIdx].options.map((o: any, i: number) => ({
        ...o,
        is_correct: i === optIdx
      }))
      return updated
    })
  }

  const totalMarks = questions.reduce((acc, q) => acc + (parseInt(q.maxMarks) || 0), 0)

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    setShowPublishModal(false)
    setLoading(true)
    setError('')
    try {
      const payload = {
        subjectId,
        linkedSessionId: linkedSessionId || null,
        title: title || 'Untitled Quiz',
        topic,
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        timeLimitMins: hasTimeLimit ? Number(timeLimitMins) : null,
        allowOneAttempt,
        showAnswersAfterSubmission,
        markingMode,
        status,
        questions
      }

      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/dashboard/teacher/subjects/${subjectId}/quizzes`)
      } else {
        setError(data.error || 'Failed to save quiz')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const palette = ['#00c853', '#2979ff', '#aa00ff', '#ff6d00', '#f50057']

  return (
    <div className="content-wrapper" style={{ maxWidth: '1100px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a2e' }}>Quiz & Assessment Builder</h2>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Design topic quizzes with instant MCQ grading and AI mark-scheme evaluation.</p>
        </div>
        <Link
          href={`/dashboard/teacher/subjects/${subjectId}/quizzes`}
          style={{
            background: '#ffffff',
            color: '#1a1a2e',
            border: '2.5px solid #1a1a2e',
            borderRadius: '50px',
            boxShadow: '3px 3px 0px #1a1a2e',
            padding: '0.6rem 1.4rem',
            fontWeight: 800,
            textDecoration: 'none'
          }}
        >
          ← Back to quizzes
        </Link>
      </div>

      {/* Step Indicator Tabs — Fix 4: Comic treatment */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { num: 1, title: '1. Quiz setup' },
          { num: 2, title: '2. Question builder' },
          { num: 3, title: '3. Review & publish' }
        ].map(s => {
          const isCompleted = step > s.num
          const isCurrent = step === s.num

          let tabBg = '#ffffff'
          let tabColor = '#64748b'
          let tabShadow = 'none'

          if (isCompleted) {
            tabBg = '#00c853'
            tabColor = '#ffffff'
            tabShadow = '3px 3px 0px #1a1a2e'
          } else if (isCurrent) {
            tabBg = '#1a1a2e'
            tabColor = '#ffffff'
            tabShadow = '4px 4px 0px #2979ff'
          }

          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num as any)}
              style={{
                flex: 1,
                padding: '0.85rem 1rem',
                background: tabBg,
                color: tabColor,
                border: '2px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: tabShadow,
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              {s.title} {isCompleted ? '✓' : ''}
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#d32f2f', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 800, border: '2px solid #1a1a2e' }}>
          ⚠️ {error}
        </div>
      )}

      {/* STEP 1: QUIZ SETUP */}
      {step === 1 && (
        <div className="card" style={{ padding: '2rem', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '6px 6px 0px #1a1a2e' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1.5rem' }}>Quiz setup</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Fix 6: Comic inputs with focus styles */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Quiz title <span style={{ color: '#f50057' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Mitochondria & Respiration Assessment"
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Topic name
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Advanced Mitochondrial Research"
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Link to lesson (Optional)
              </label>
              <select
                value={linkedSessionId}
                onChange={e => handleLessonSelect(e.target.value)}
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              >
                <option value="">-- Standalone Quiz (Not linked to specific lesson) --</option>
                {sessions.map(s => {
                  const dateStr = new Date(s.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                  return (
                    <option key={s.id} value={s.id}>
                      {dateStr} — {s.title}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Due date & time <span style={{ color: '#f50057' }}>*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              />
            </div>

            {/* Time Limit Toggle */}
            <div style={{ background: '#ffffff', padding: '1.25rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasTimeLimit ? '1rem' : 0 }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#1a1a2e' }}>Enable time limit</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Set a countdown timer for students taking this quiz</div>
                </div>
                {/* Fix 8: Toggle switch component */}
                <div
                  onClick={() => setHasTimeLimit(!hasTimeLimit)}
                  style={{
                    width: '48px',
                    height: '26px',
                    background: hasTimeLimit ? '#00c853' : '#d1d5db',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    background: '#ffffff',
                    border: '1.5px solid #1a1a2e',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: hasTimeLimit ? '24px' : '2px',
                    transition: 'left 0.2s ease'
                  }} />
                </div>
              </div>

              {hasTimeLimit && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[15, 30, 45, 60, 90].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTimeLimitMins(mins)}
                      style={{
                        padding: '0.4rem 1rem',
                        background: timeLimitMins === mins ? '#2979ff' : '#ffffff',
                        color: timeLimitMins === mins ? '#ffffff' : '#1a1a2e',
                        border: '2px solid #1a1a2e',
                        borderRadius: '50px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fix 7: Grading Method toggle with white section background */}
            <div style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 800, color: '#1a1a2e', marginBottom: '0.75rem' }}>
                Grading method
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setMarkingMode('AUTO_AI')}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background: markingMode === 'AUTO_AI' ? '#00c853' : '#ffffff',
                    color: markingMode === 'AUTO_AI' ? '#ffffff' : '#1a1a2e',
                    border: '3px solid #1a1a2e',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  🤖 Auto MCQ + AI Short/Essay
                </button>
                <button
                  type="button"
                  onClick={() => setMarkingMode('MANUAL_ONLY')}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background: markingMode === 'MANUAL_ONLY' ? '#aa00ff' : '#ffffff',
                    color: markingMode === 'MANUAL_ONLY' ? '#ffffff' : '#1a1a2e',
                    border: '3px solid #1a1a2e',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  👤 Teacher manual marking only
                </button>
              </div>
            </div>

            {/* Fix 8: Sliding toggle switches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                onClick={() => setShowAnswersAfterSubmission(!showAnswersAfterSubmission)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.85rem 1rem', border: '2px solid #1a1a2e', borderRadius: '12px', cursor: 'pointer' }}
              >
                <span style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '0.9rem' }}>Show correct answers after submission</span>
                <div
                  style={{
                    width: '48px',
                    height: '26px',
                    background: showAnswersAfterSubmission ? '#00c853' : '#d1d5db',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    position: 'relative',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    background: '#ffffff',
                    border: '1.5px solid #1a1a2e',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: showAnswersAfterSubmission ? '24px' : '2px',
                    transition: 'left 0.2s ease'
                  }} />
                </div>
              </div>

              <div
                onClick={() => setAllowOneAttempt(!allowOneAttempt)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.85rem 1rem', border: '2px solid #1a1a2e', borderRadius: '12px', cursor: 'pointer' }}
              >
                <span style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '0.9rem' }}>Allow one attempt only</span>
                <div
                  style={{
                    width: '48px',
                    height: '26px',
                    background: allowOneAttempt ? '#00c853' : '#d1d5db',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    position: 'relative',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    background: '#ffffff',
                    border: '1.5px solid #1a1a2e',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: allowOneAttempt ? '24px' : '2px',
                    transition: 'left 0.2s ease'
                  }} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Instructions for students (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Instructions for students taking this assessment..."
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                if (!title) { setError('Please enter a quiz title'); return; }
                if (!dueDate) { setError('Please set a due date and time'); return; }
                setError('');
                setStep(2);
              }}
              style={{
                background: '#00c853',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: '4px 4px 0px #1a1a2e',
                padding: '0.75rem 2rem',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Continue to question builder →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: QUESTION BUILDER */}
      {step === 2 && (
        <div>
          {/* Fix 1: White background section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#ffffff', color: '#1a1a2e', padding: '1.25rem 1.5rem', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e' }}>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1a1a2e' }}>Question builder</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{questions.length} Question{questions.length !== 1 ? 's' : ''} added</p>
            </div>
            <div style={{ background: '#00c853', color: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.4rem 1.2rem', fontWeight: 900, fontSize: '0.95rem' }}>
              Total: {totalMarks} marks
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {questions.map((q, idx) => {
              const color = palette[idx % palette.length]
              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '3px solid #1a1a2e',
                    borderRadius: '16px',
                    boxShadow: '4px 4px 0px #1a1a2e',
                    padding: '1.5rem',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Fix 10: 40px diameter circle number badge */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: color, color: '#ffffff', border: '2px solid #1a1a2e', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', boxShadow: '2px 2px 0px #1a1a2e' }}>
                        Q{idx + 1}
                      </div>

                      {/* Fix 2: Clear active / unselected question type pills */}
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {[
                          { id: 'MCQ', label: 'MCQ' },
                          { id: 'SHORT_ANSWER', label: 'Short Answer' },
                          { id: 'ESSAY', label: 'Essay' }
                        ].map(t => {
                          const isSelected = q.type === t.id
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updateQuestion(idx, 'type', t.id)}
                              style={{
                                padding: '0.4rem 0.9rem',
                                background: isSelected ? '#1a1a2e' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#64748b',
                                border: '2px solid #1a1a2e',
                                borderRadius: '50px',
                                boxShadow: isSelected ? '2px 2px 0px #1a1a2e' : 'none',
                                fontWeight: 900,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Fix 5: Action icons styling */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>Marks:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.maxMarks}
                        onChange={e => updateQuestion(idx, 'maxMarks', parseInt(e.target.value) || 1)}
                        style={{ width: '70px', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '6px 10px', fontWeight: 800, color: '#1a1a2e' }}
                      />

                      <button
                        type="button"
                        title="Move Up"
                        onClick={() => moveQuestion(idx, -1)}
                        disabled={idx === 0}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', border: '2px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Move Down"
                        onClick={() => moveQuestion(idx, 1)}
                        disabled={idx === questions.length - 1}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', border: '2px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        title="Duplicate"
                        onClick={() => duplicateQuestion(idx)}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', border: '2px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        📋
                      </button>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => removeQuestion(idx)}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f50057', color: '#ffffff', border: '2px solid #1a1a2e', boxShadow: '2px 2px 0px #1a1a2e', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>
                      Question text <span style={{ color: '#f50057' }}>*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={q.text}
                      onChange={e => updateQuestion(idx, 'text', e.target.value)}
                      placeholder="Enter question text..."
                      style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '10px', color: '#1a1a2e', fontWeight: 700 }}
                    />
                  </div>

                  {/* Fix 3: Dynamic switching between MCQ / Short Answer / Essay layouts */}
                  {q.type === 'MCQ' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                      <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>Options (Select radio for correct answer):</label>
                      {q.options?.map((opt: any, optIdx: number) => {
                        const optLabel = String.fromCharCode(65 + optIdx)
                        const isCorrect = q.correctOption === optIdx
                        return (
                          <div
                            key={optIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              background: isCorrect ? '#dcfce7' : '#ffffff',
                              padding: '0.5rem 0.85rem',
                              border: '2px solid #1a1a2e',
                              borderRadius: '50px',
                              boxShadow: '3px 3px 0px #1a1a2e'
                            }}
                          >
                            <input
                              type="radio"
                              name={`mcq_correct_${idx}`}
                              checked={isCorrect}
                              onChange={() => setCorrectMcqOption(idx, optIdx)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00c853' }}
                            />
                            <span style={{ fontWeight: 900, color: '#1a1a2e', width: '24px' }}>{optLabel}.</span>
                            <input
                              type="text"
                              required
                              value={opt.text}
                              onChange={e => updateMcqOption(idx, optIdx, e.target.value, opt.imageUrl)}
                              placeholder={`Option ${optLabel}...`}
                              style={{ flex: 1, border: 'none', background: 'transparent', fontWeight: 700, color: '#1a1a2e', outline: 'none' }}
                            />
                            {isCorrect && (
                              <span style={{ fontSize: '0.75rem', background: '#00c853', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.1rem 0.5rem', fontWeight: 900 }}>
                                Correct
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {q.type === 'SHORT_ANSWER' && (
                    <div style={{ background: '#f8fafc', padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>
                        Write the ideal answer — AI will grade against this
                      </label>
                      <textarea
                        rows={3}
                        value={q.markScheme || ''}
                        onChange={e => updateQuestion(idx, 'markScheme', e.target.value)}
                        placeholder="Write the exact model answer or key required points..."
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '10px', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>
                  )}

                  {q.type === 'ESSAY' && (
                    <div style={{ background: '#f8fafc', padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>
                        List the key points AI should look for, one per line
                      </label>
                      <textarea
                        rows={4}
                        value={q.markScheme || ''}
                        onChange={e => updateQuestion(idx, 'markScheme', e.target.value)}
                        placeholder="Key point 1&#10;Key point 2&#10;Key point 3"
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '10px', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Fix 9: Comic treatment for action buttons */}
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={addQuestion}
              className="btn-bob"
              style={{
                background: '#2979ff',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: '4px 4px 0px #1a1a2e',
                padding: '0.75rem 1.8rem',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              + Add question
            </button>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: '#ffffff', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.75rem 1.5rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  background: '#f50057',
                  color: '#ffffff',
                  border: '3px solid #1a1a2e',
                  borderRadius: '50px',
                  boxShadow: '4px 4px 0px #1a1a2e',
                  padding: '0.75rem 2rem',
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Review & publish →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & PUBLISH */}
      {step === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
          
          {/* Main Review Section */}
          <div className="card" style={{ padding: '2rem', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '6px 6px 0px #1a1a2e' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1.5rem' }}>Section C — Review & publish</h3>

            <div style={{ background: '#f8fafc', border: '3px solid #1a1a2e', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Quiz title</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e' }}>{title}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Questions</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2979ff' }}>{questions.length} Questions</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total marks</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#00c853' }}>{totalMarks} Marks</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave('DRAFT')}
                style={{
                  flex: 1,
                  background: '#ffffff',
                  color: '#1a1a2e',
                  border: '3px solid #1a1a2e',
                  borderRadius: '50px',
                  boxShadow: '4px 4px 0px #1a1a2e',
                  padding: '0.85rem 1.5rem',
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Save as draft
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPublishModal(true)}
                style={{
                  flex: 2,
                  background: '#00c853',
                  color: '#ffffff',
                  border: '3px solid #1a1a2e',
                  borderRadius: '50px',
                  boxShadow: '4px 4px 0px #1a1a2e',
                  padding: '0.85rem 1.5rem',
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                🚀 Publish quiz
              </button>
            </div>
          </div>

          {/* Live Student Preview Panel */}
          <div style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '6px 6px 0px #1a1a2e', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1rem' }}>Live student preview</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e', marginBottom: '0.5rem' }}>
                    Q{idx + 1}. {q.text || 'Question text'} ({q.maxMarks} marks)
                  </div>
                  {q.type === 'MCQ' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {q.options?.map((opt: any, oIdx: number) => (
                        <div key={oIdx} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', fontWeight: 700 }}>
                          {String.fromCharCode(65 + oIdx)}. {opt.text || `Option ${oIdx + 1}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Confirmation Modal */}
      {showPublishModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ maxWidth: '450px', width: '100%', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚀</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>Publish this quiz?</h3>
            <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>
              All enrolled students in this subject and branch will be notified immediately.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => handleSave('PUBLISHED')}
                disabled={loading}
                style={{ flex: 1, background: '#00c853', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.75rem', fontWeight: 900, cursor: 'pointer' }}
              >
                {loading ? 'Publishing...' : 'Yes, Publish now'}
              </button>
              <button
                onClick={() => setShowPublishModal(false)}
                style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '3px solid #1a1a2e', borderRadius: '50px', padding: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
