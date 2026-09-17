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

  // Setup Form
  const [title, setTitle] = useState(initialTopic ? `Quiz: ${initialTopic}` : '')
  const [topic, setTopic] = useState(initialTopic)
  const [description, setDescription] = useState('')
  const [linkedSessionId, setLinkedSessionId] = useState(initialLinkedSessionId)
  const [dueDate, setDueDate] = useState('')
  const [showAnswersAfterSubmission, setShowAnswersAfterSubmission] = useState(true)

  // Questions
  const [questions, setQuestions] = useState<any[]>([
    {
      type: 'MCQ',
      text: 'Which organelle is known as the powerhouse of the cell?',
      maxMarks: 10,
      options: [
        { id: 'opt_1', text: 'Mitochondria', is_correct: true },
        { id: 'opt_2', text: 'Nucleus', is_correct: false },
        { id: 'opt_3', text: 'Ribosome', is_correct: false },
        { id: 'opt_4', text: 'Golgi Apparatus', is_correct: false }
      ],
      correctOption: 0,
      markScheme: ''
    }
  ])

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
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
          { id: `opt_${Date.now()}_1`, text: '', is_correct: true },
          { id: `opt_${Date.now()}_2`, text: '', is_correct: false },
          { id: `opt_${Date.now()}_3`, text: '', is_correct: false },
          { id: `opt_${Date.now()}_4`, text: '', is_correct: false }
        ],
        correctOption: 0,
        markScheme: ''
      }
    ])
  }

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
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

  const updateMcqOption = (qIdx: number, optIdx: number, text: string) => {
    setQuestions(prev => {
      const updated = [...prev]
      const opts = [...updated[qIdx].options]
      opts[optIdx] = { ...opts[optIdx], text }
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
    setLoading(true)
    setError('')
    try {
      const payload = {
        subjectId,
        linkedSessionId: linkedSessionId || null,
        title: title || 'Untitled Quiz',
        topic,
        description,
        dueDate,
        showAnswersAfterSubmission,
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
    <div className="content-wrapper" style={{ maxWidth: '900px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1a1a2e' }}>Quiz & Assessment Builder</h2>
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

      {/* Stepper Header */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { num: 1, title: '1. Quiz setup' },
          { num: 2, title: '2. Question builder' },
          { num: 3, title: '3. Review & publish' }
        ].map(s => {
          const active = step === s.num
          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num as any)}
              style={{
                flex: 1,
                padding: '0.85rem 1rem',
                background: active ? '#1a1a2e' : '#ffffff',
                color: active ? '#ffffff' : '#1a1a2e',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: active ? '4px 4px 0px #2979ff' : '2px 2px 0px #1a1a2e',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              {s.title}
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
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1.5rem' }}>Step 1 — Quiz Setup</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Quiz Title <span style={{ color: '#f50057' }}>*</span>
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
                Topic Name
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
                Link to Lesson Session (Optional)
              </label>
              <select
                value={linkedSessionId}
                onChange={e => handleLessonSelect(e.target.value)}
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              >
                <option value="">-- Standalone Quiz (Not linked to specific lesson) --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} — {s.title}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 600 }}>
                Linking auto-populates title and integrates quiz into Lesson Planner.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#1a1a2e' }}>
                Instructions / Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Instructions for students taking this assessment..."
                style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '0.9rem' }}>Show correct answers to students after submission</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>If enabled, students can see model answers right after submitting</div>
              </div>
              <input
                type="checkbox"
                checked={showAnswersAfterSubmission}
                onChange={e => setShowAnswersAfterSubmission(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#00c853' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                if (!title) { setError('Please enter a quiz title'); return; }
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#1a1a2e', color: '#ffffff', padding: '1rem 1.5rem', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '4px 4px 0px #2979ff' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Question Builder</h4>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{questions.length} Question{questions.length !== 1 ? 's' : ''} added</p>
            </div>
            <div style={{ background: '#00c853', color: '#ffffff', border: '2px solid #ffffff', borderRadius: '50px', padding: '0.4rem 1.2rem', fontWeight: 900, fontSize: '0.95rem' }}>
              Total marks: {totalMarks}
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
                    borderRadius: '20px',
                    boxShadow: '6px 6px 0px #1a1a2e',
                    padding: '1.5rem',
                    position: 'relative'
                  }}
                >
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: color, color: '#ffffff', border: '2px solid #1a1a2e', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '2px 2px 0px #1a1a2e' }}>
                        Q{idx + 1}
                      </div>
                      <select
                        value={q.type}
                        onChange={e => updateQuestion(idx, 'type', e.target.value)}
                        style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '50px', padding: '0.4rem 1rem', fontWeight: 800, color: '#1a1a2e', fontSize: '0.85rem' }}
                      >
                        <option value="MCQ">Multiple Choice (MCQ)</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="ESSAY">Essay</option>
                      </select>
                    </div>

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
                        onClick={() => moveQuestion(idx, -1)}
                        disabled={idx === 0}
                        style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '4px 8px', fontWeight: 900, cursor: 'pointer' }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 1)}
                        disabled={idx === questions.length - 1}
                        style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '4px 8px', fontWeight: 900, cursor: 'pointer' }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateQuestion(idx)}
                        style={{ background: '#e0f2fe', color: '#0284c7', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '4px 8px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        📋
                      </button>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          style={{ background: '#ffebee', color: '#d32f2f', border: '2px solid #1a1a2e', borderRadius: '8px', padding: '4px 8px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>
                      Question Text <span style={{ color: '#f50057' }}>*</span>
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

                  {/* MCQ Options */}
                  {q.type === 'MCQ' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                      <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>Options (Select radio button for correct answer):</label>
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
                              onChange={e => updateMcqOption(idx, optIdx, e.target.value)}
                              placeholder={`Option ${optLabel}...`}
                              style={{ flex: 1, border: 'none', background: 'transparent', fontWeight: 700, color: '#1a1a2e', outline: 'none' }}
                            />
                            {isCorrect && (
                              <span style={{ fontSize: '0.75rem', background: '#00c853', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.1rem 0.5rem', fontWeight: 900 }}>
                                Correct Answer
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Short Answer / Essay Mark Scheme */}
                  {(q.type === 'SHORT_ANSWER' || q.type === 'ESSAY') && (
                    <div style={{ background: '#f8fafc', padding: '1rem', border: '2px solid #1a1a2e', borderRadius: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#1a1a2e' }}>
                        {q.type === 'SHORT_ANSWER' ? 'Mark Scheme / Model Answer (AI Grading Target)' : 'Marking Criteria (Bullet points for AI Grading)'}
                      </label>
                      <textarea
                        rows={3}
                        value={q.markScheme || ''}
                        onChange={e => updateQuestion(idx, 'markScheme', e.target.value)}
                        placeholder={q.type === 'SHORT_ANSWER' ? 'Write the exact model answer or key required points...' : 'List key arguments, facts or structures AI should check for...'}
                        style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '10px', padding: '10px', color: '#1a1a2e', fontWeight: 700 }}
                      />
                    </div>
                  )}

                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={addQuestion}
              style={{
                background: '#ffffff',
                color: '#1a1a2e',
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
                style={{ background: '#ffffff', color: '#1a1a2e', border: '3px solid #1a1a2e', borderRadius: '50px', padding: '0.75rem 1.5rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  background: '#2979ff',
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
                Preview & review →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & PUBLISH */}
      {step === 3 && (
        <div className="card" style={{ padding: '2rem', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '6px 6px 0px #1a1a2e' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1.5rem' }}>Step 3 — Review and Publish</h3>

          {/* Summary Box */}
          <div style={{ background: '#f8fafc', border: '3px solid #1a1a2e', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Quiz Title</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e' }}>{title}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Topic</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e' }}>{topic || 'General'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Questions</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2979ff' }}>{questions.length} Questions</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Marks</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#00c853' }}>{totalMarks} Marks</div>
            </div>
          </div>

          {/* Questions Preview */}
          <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1rem' }}>Student Preview</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {questions.map((q, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: '0.5rem' }}>
                  Q{idx + 1}. {q.text} ({q.maxMarks} marks)
                </div>
                {q.type === 'MCQ' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {q.options?.map((opt: any, oIdx: number) => (
                      <div key={oIdx} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', background: oIdx === q.correctOption ? '#dcfce7' : '#f8fafc', border: '1.5px solid #1a1a2e', borderRadius: '50px', fontWeight: 700 }}>
                        {String.fromCharCode(65 + oIdx)}. {opt.text} {oIdx === q.correctOption && '✓'}
                      </div>
                    ))}
                  </div>
                )}
                {q.type !== 'MCQ' && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    Target Mark Scheme: {q.markScheme || 'Model answer evaluation'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave('DRAFT')}
              style={{
                flex: 1,
                background: '#ffab00',
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
              onClick={() => handleSave('PUBLISHED')}
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
              {loading ? 'Publishing...' : '🚀 Publish quiz to active students'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
