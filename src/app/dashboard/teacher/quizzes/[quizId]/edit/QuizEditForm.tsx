'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuizEditFormProps {
  quiz: any
  initialQuestions: any[]
  sessions: any[]
}

export default function QuizEditForm({ quiz, initialQuestions, sessions }: QuizEditFormProps) {
  const router = useRouter()
  const isPublished = quiz.status === 'PUBLISHED'

  const [status, setStatus] = useState<string>(quiz.status)
  const [unpublishing, setUnpublishing] = useState(false)
  const [unpublishError, setUnpublishError] = useState('')

  // Form State Pre-populated with existing data
  const [title, setTitle] = useState(quiz.title || '')
  const [topic, setTopic] = useState(quiz.topic || '')
  const [description, setDescription] = useState(quiz.description || '')
  const [linkedSessionId, setLinkedSessionId] = useState(quiz.linkedSessionId || '')
  const [dueDate, setDueDate] = useState(
    quiz.dueDate ? new Date(quiz.dueDate).toISOString().slice(0, 16) : ''
  )
  const [hasTimeLimit, setHasTimeLimit] = useState(!!quiz.timeLimitMins)
  const [timeLimitMins, setTimeLimitMins] = useState(quiz.timeLimitMins || 30)
  const [allowOneAttempt, setAllowOneAttempt] = useState(quiz.allowOneAttempt ?? true)
  const [showAnswersAfterSubmission, setShowAnswersAfterSubmission] = useState(
    quiz.showAnswersAfterSubmission ?? true
  )
  const [markingMode, setMarkingMode] = useState<'AUTO_AI' | 'MANUAL_ONLY'>(
    quiz.markingMode === 'MANUAL_ONLY' ? 'MANUAL_ONLY' : 'AUTO_AI'
  )

  const [questions, setQuestions] = useState<any[]>(
    initialQuestions.length > 0
      ? initialQuestions
      : [
          {
            type: 'MCQ',
            text: '',
            maxMarks: 10,
            options: [
              { id: 'opt_1', text: '', is_correct: true, imageUrl: '' },
              { id: 'opt_2', text: '', is_correct: false, imageUrl: '' },
              { id: 'opt_3', text: '', is_correct: false, imageUrl: '' },
              { id: 'opt_4', text: '', is_correct: false, imageUrl: '' }
            ],
            correctOption: 0,
            markScheme: '',
            hasWordLimit: false,
            wordLimit: 100
          }
        ]
  )

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const backUrl = quiz.subjectId
    ? `/dashboard/teacher/subjects/${quiz.subjectId}/quizzes`
    : '/dashboard/teacher'

  // Handler to unpublish if quiz is currently published
  const handleUnpublish = async () => {
    setUnpublishing(true)
    setUnpublishError('')
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT' })
      })
      if (res.ok) {
        setStatus('DRAFT')
      } else {
        const data = await res.json()
        setUnpublishError(data.error || 'Failed to unpublish quiz')
      }
    } catch (err: any) {
      setUnpublishError(err.message || 'Network error unpublishing quiz')
    } finally {
      setUnpublishing(false)
    }
  }

  // Question manipulation helpers
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
    clone.id = `q_${Date.now()}`
    setQuestions(prev => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)])
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

  const totalMarks = questions.reduce(
    (acc, q) => acc + (parseInt(q.maxMarks) || parseInt(q.points) || 10),
    0
  )

  // On submit: UPDATE the quiz via PUT /api/quizzes/[id]
  const handleUpdate = async (newStatus: 'DRAFT' | 'PUBLISHED') => {
    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const payload = {
        title: title.trim() || 'Untitled Quiz',
        topic: topic.trim() || null,
        description: description.trim() || null,
        linkedSessionId: linkedSessionId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        timeLimitMins: hasTimeLimit ? Number(timeLimitMins) : null,
        allowOneAttempt,
        showAnswersAfterSubmission,
        markingMode,
        status: newStatus,
        questions: questions.map((q, idx) => ({
          type: q.type || 'MCQ',
          text: q.text,
          maxMarks: parseInt(q.maxMarks) || 10,
          points: parseInt(q.maxMarks) || 10,
          options: q.type === 'MCQ' ? q.options : null,
          correctOption: q.type === 'MCQ' ? q.correctOption : null,
          markScheme: q.markScheme || null,
          wordLimit: q.hasWordLimit ? Number(q.wordLimit) : null,
          orderIndex: idx
        }))
      }

      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMsg('Quiz updated successfully!')
        setTimeout(() => {
          router.push(backUrl)
        }, 800)
      } else {
        setError(data.error || 'Failed to update quiz')
      }
    } catch (err: any) {
      setError(err.message || 'Network error updating quiz')
    } finally {
      setLoading(false)
    }
  }

  // Published Quiz Overlay / Notice
  if (status === 'PUBLISHED') {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1rem' }}>
        <div
          style={{
            background: '#ffffff',
            border: '4px solid #1a1a2e',
            borderRadius: '24px',
            boxShadow: '8px 8px 0px #1a1a2e',
            padding: '3rem 2rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.75rem' }}>
            Quiz is Currently Published
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#d32f2f',
              background: '#ffebee',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              border: '2px solid #ef5350',
              display: 'inline-block',
              margin: '0 0 1.5rem 0'
            }}
          >
            Unpublish the quiz first to edit it.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600, marginBottom: '2rem' }}>
            Editing questions while students may be taking the quiz is locked to preserve assessment fairness.
          </p>

          {unpublishError && (
            <div
              style={{
                color: '#d32f2f',
                fontWeight: 700,
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}
            >
              {unpublishError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleUnpublish}
              disabled={unpublishing}
              style={{
                background: '#ff9100',
                color: '#1a1a2e',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                padding: '0.85rem 2rem',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: unpublishing ? 'not-allowed' : 'pointer',
                boxShadow: '4px 4px 0px #1a1a2e',
                transition: 'all 0.15s ease'
              }}
            >
              {unpublishing ? 'Unpublishing...' : '🔓 Unpublish Quiz to Edit'}
            </button>
            <Link
              href={backUrl}
              style={{
                background: '#f1f5f9',
                color: '#1a1a2e',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                padding: '0.85rem 2rem',
                fontWeight: 800,
                fontSize: '1rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: '4px 4px 0px #1a1a2e'
              }}
            >
              ← Back to Quizzes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem 4rem 1rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                background: '#ff9100',
                color: '#1a1a2e',
                fontSize: '0.75rem',
                fontWeight: 900,
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                border: '2px solid #1a1a2e'
              }}
            >
              DRAFT
            </span>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: '#1a1a2e' }}>
              Edit Quiz & Assessment
            </h1>
          </div>
          <p style={{ color: '#64748b', fontWeight: 600, margin: 0 }}>
            Editing existing quiz. Update questions, marks, and settings below.
          </p>
        </div>
        <Link
          href={backUrl}
          style={{
            background: '#ffffff',
            color: '#1a1a2e',
            border: '2px solid #1a1a2e',
            padding: '0.6rem 1.25rem',
            borderRadius: '50px',
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '3px 3px 0px #1a1a2e',
            fontSize: '0.9rem'
          }}
        >
          ← Cancel & Back
        </Link>
      </div>

      {error && (
        <div
          style={{
            background: '#ffebee',
            color: '#c62828',
            border: '3px solid #1a1a2e',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontWeight: 800,
            boxShadow: '4px 4px 0px #1a1a2e'
          }}
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: '#e8f5e9',
            color: '#2e7d32',
            border: '3px solid #1a1a2e',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontWeight: 800,
            boxShadow: '4px 4px 0px #1a1a2e'
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Step Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '14px',
            border: '3px solid #1a1a2e',
            background: step === 1 ? '#2979ff' : '#ffffff',
            color: step === 1 ? '#ffffff' : '#1a1a2e',
            fontWeight: 900,
            fontSize: '1.05rem',
            cursor: 'pointer',
            boxShadow: '4px 4px 0px #1a1a2e'
          }}
        >
          1. Quiz Details & Settings
        </button>
        <button
          onClick={() => setStep(2)}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '14px',
            border: '3px solid #1a1a2e',
            background: step === 2 ? '#00c853' : '#ffffff',
            color: step === 2 ? '#ffffff' : '#1a1a2e',
            fontWeight: 900,
            fontSize: '1.05rem',
            cursor: 'pointer',
            boxShadow: '4px 4px 0px #1a1a2e'
          }}
        >
          2. Questions ({questions.length}) • {totalMarks} Marks
        </button>
      </div>

      {/* STEP 1: Quiz Details */}
      {step === 1 && (
        <div
          style={{
            background: '#ffffff',
            border: '4px solid #1a1a2e',
            borderRadius: '20px',
            boxShadow: '6px 6px 0px #1a1a2e',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          <div>
            <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.4rem', color: '#1a1a2e' }}>
              Quiz Title *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Unit 3: Cellular Respiration Review"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '3px solid #1a1a2e',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#1a1a2e'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.4rem', color: '#1a1a2e' }}>
                Topic / Chapter
              </label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Mitochondria & Krebs Cycle"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '3px solid #1a1a2e',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#1a1a2e'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.4rem', color: '#1a1a2e' }}>
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '3px solid #1a1a2e',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#1a1a2e'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.4rem', color: '#1a1a2e' }}>
              Linked Class Session (Optional)
            </label>
            <select
              value={linkedSessionId}
              onChange={e => setLinkedSessionId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '3px solid #1a1a2e',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#1a1a2e',
                background: '#ffffff'
              }}
            >
              <option value="">-- No specific linked session --</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : 'Scheduled'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.4rem', color: '#1a1a2e' }}>
              Description / Student Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide context or instructions for your students..."
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '3px solid #1a1a2e',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#1a1a2e'
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              padding: '1.25rem',
              background: '#f8fafc',
              borderRadius: '14px',
              border: '2px solid #cbd5e1'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowOneAttempt}
                onChange={e => setAllowOneAttempt(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#2979ff' }}
              />
              One Attempt Only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAnswersAfterSubmission}
                onChange={e => setShowAnswersAfterSubmission(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#00c853' }}
              />
              Show Answers on Submit
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasTimeLimit}
                onChange={e => setHasTimeLimit(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#ff6d00' }}
              />
              Set Time Limit
            </label>
            {hasTimeLimit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={timeLimitMins}
                  onChange={e => setTimeLimitMins(Number(e.target.value))}
                  style={{
                    width: '80px',
                    padding: '0.4rem',
                    borderRadius: '8px',
                    border: '2px solid #1a1a2e',
                    fontWeight: 800
                  }}
                />
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>mins</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={() => setStep(2)}
              style={{
                background: '#2979ff',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                padding: '0.85rem 2.5rem',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '4px 4px 0px #1a1a2e'
              }}
            >
              Continue to Questions →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Questions */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.map((q, qIdx) => (
            <div
              key={q.id || `q_${qIdx}`}
              style={{
                background: '#ffffff',
                border: '4px solid #1a1a2e',
                borderRadius: '20px',
                boxShadow: '6px 6px 0px #1a1a2e',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      background: '#1a1a2e',
                      color: '#ffffff',
                      borderRadius: '50px',
                      padding: '0.35rem 1rem',
                      fontWeight: 900,
                      fontSize: '0.85rem'
                    }}
                  >
                    Question {qIdx + 1}
                  </span>
                  <select
                    value={q.type}
                    onChange={e => updateQuestion(qIdx, 'type', e.target.value)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #1a1a2e',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      background: '#ffffff'
                    }}
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="SHORT_ANSWER">Short Answer (AI Graded)</option>
                    <option value="ESSAY">Essay / Long Answer</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Marks:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.maxMarks}
                      onChange={e => updateQuestion(qIdx, 'maxMarks', Number(e.target.value))}
                      style={{
                        width: '60px',
                        padding: '0.3rem',
                        borderRadius: '8px',
                        border: '2px solid #1a1a2e',
                        fontWeight: 900,
                        textAlign: 'center'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => duplicateQuestion(qIdx)}
                    style={{
                      background: '#f1f5f9',
                      border: '2px solid #1a1a2e',
                      borderRadius: '8px',
                      padding: '0.35rem 0.65rem',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}
                    title="Duplicate"
                  >
                    📄 Copy
                  </button>
                  {questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      style={{
                        background: '#ffebee',
                        color: '#d32f2f',
                        border: '2px solid #1a1a2e',
                        borderRadius: '8px',
                        padding: '0.35rem 0.65rem',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '0.8rem'
                      }}
                      title="Delete"
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <input
                  value={q.text}
                  onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                  placeholder="Enter the question prompt here..."
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '3px solid #1a1a2e',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#1a1a2e'
                  }}
                />
              </div>

              {/* MCQ Options */}
              {q.type === 'MCQ' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
                    Select the radio button next to the correct answer:
                  </div>
                  {q.options?.map((opt: any, optIdx: number) => (
                    <div
                      key={opt.id || optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: q.correctOption === optIdx ? '#e8f5e9' : '#ffffff',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '12px',
                        border: `2px solid ${q.correctOption === optIdx ? '#00c853' : '#cbd5e1'}`
                      }}
                    >
                      <input
                        type="radio"
                        name={`correct_${qIdx}`}
                        checked={q.correctOption === optIdx}
                        onChange={() => setCorrectMcqOption(qIdx, optIdx)}
                        style={{ width: '22px', height: '22px', accentColor: '#00c853', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 900, minWidth: '24px' }}>
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      <input
                        value={opt.text}
                        onChange={e => updateMcqOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: '2px solid #1a1a2e',
                          fontWeight: 700,
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Non-MCQ Mark Scheme */}
              {q.type !== 'MCQ' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.3rem', color: '#1a1a2e' }}>
                    Mark Scheme & Grading Criteria (For AI / Teacher evaluation)
                  </label>
                  <textarea
                    rows={3}
                    value={q.markScheme}
                    onChange={e => updateQuestion(qIdx, 'markScheme', e.target.value)}
                    placeholder="Describe acceptable answers, keywords, and mark allocation..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '2px solid #1a1a2e',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add Question Button */}
          <button
            onClick={addQuestion}
            style={{
              padding: '1rem',
              borderRadius: '16px',
              border: '3px dashed #1a1a2e',
              background: '#f8fafc',
              color: '#1a1a2e',
              fontWeight: 900,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            ➕ Add Another Question
          </button>

          {/* Action Footer */}
          <div
            style={{
              background: '#ffffff',
              border: '4px solid #1a1a2e',
              borderRadius: '20px',
              boxShadow: '6px 6px 0px #1a1a2e',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginTop: '1rem'
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>
                Total: {questions.length} Question{questions.length === 1 ? '' : 's'} • {totalMarks} Marks
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                Status: <strong>DRAFT</strong> (Save as Draft or Publish when ready)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                disabled={loading}
                onClick={() => handleUpdate('DRAFT')}
                style={{
                  background: '#ffffff',
                  color: '#1a1a2e',
                  border: '3px solid #1a1a2e',
                  borderRadius: '50px',
                  padding: '0.75rem 1.75rem',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '3px 3px 0px #1a1a2e'
                }}
              >
                💾 Save as Draft
              </button>
              <button
                disabled={loading}
                onClick={() => handleUpdate('PUBLISHED')}
                style={{
                  background: '#00c853',
                  color: '#ffffff',
                  border: '3px solid #1a1a2e',
                  borderRadius: '50px',
                  padding: '0.75rem 2rem',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '4px 4px 0px #1a1a2e'
                }}
              >
                🚀 Update & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
