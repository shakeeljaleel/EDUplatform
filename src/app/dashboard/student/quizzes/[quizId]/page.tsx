'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StudentQuizRunnerPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = React.use(params)
  const router = useRouter()

  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Quiz Execution State
  const [answers, setAnswers] = useState<{ [qId: string]: { selectedOption?: number; answerText?: string } }>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isReviewing, setIsReviewing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)

  useEffect(() => {
    fetchQuiz()
  }, [])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0 && !submissionResult) {
        try {
          localStorage.setItem(`quiz_draft_${quizId}`, JSON.stringify(answers))
        } catch (e) {}
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [answers, quizId, submissionResult])

  // Countdown timer effect
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0 || submissionResult) return
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          handleSubmitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsRemaining, submissionResult])

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`)
      if (res.ok) {
        const data = await res.json()
        setQuiz(data.quiz)

        // Restore draft if available
        try {
          const saved = localStorage.getItem(`quiz_draft_${quizId}`)
          if (saved) setAnswers(JSON.parse(saved))
        } catch (e) {}

        // Set time limit countdown if specified
        if (data.quiz.timeLimitMins && !data.quiz.attempts?.length) {
          setSecondsRemaining(data.quiz.timeLimitMins * 60)
        }

        if (data.quiz.attempts && data.quiz.attempts.length > 0) {
          const att = data.quiz.attempts[0]
          setSubmissionResult({
            score: att.score,
            maxPossibleScore: att.maxPossibleScore,
            percentage: att.percentageScore,
            starsEarned: att.starsAwarded,
            helixPointsEarned: att.helixPointsAwarded,
            medalEarned: att.medalAwarded
          })
          if (att.medalAwarded && att.medalAwarded !== 'none') {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3000)
          }
        }
      } else {
        setError('Failed to load quiz')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMcq = (questionId: string, optIdx: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], selectedOption: optIdx }
    }))
  }

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], answerText: text }
    }))
  }

  const handleSubmitQuiz = async () => {
    setShowConfirmModal(false)
    setSubmitting(true)
    setError('')

    const formattedAnswers = quiz.questions.map((q: any) => ({
      questionId: q.id,
      selectedOption: answers[q.id]?.selectedOption ?? null,
      shortAnswerText: answers[q.id]?.answerText ?? null,
      answerText: answers[q.id]?.answerText ?? null
    }))

    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers })
      })

      const data = await res.json()
      if (res.ok) {
        localStorage.removeItem(`quiz_draft_${quizId}`)
        setSubmissionResult(data)
        if (data.medalEarned && data.medalEarned !== 'none') {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
        }
        fetchQuiz()
      } else {
        setError(data.error || 'Failed to submit quiz')
      }
    } catch (err: any) {
      setError('A network error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="pulse">Loading quiz runner...</div>
  if (error && !quiz) return <div className="card" style={{ padding: '2rem', color: '#d32f2f', fontWeight: 800 }}>⚠️ {error}</div>

  const questions = quiz.questions || []
  const currentQ = questions[currentIndex]
  const totalQuestions = questions.length
  const progressPct = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // SUBMISSION RESULTS VIEW
  if (submissionResult) {
    const score = submissionResult.score ?? 0
    const fallbackMax = questions.reduce((a: number, q: any) => a + (q.maxMarks || q.points || 10), 0) || 100
    const maxScore = submissionResult.maxPossibleScore || fallbackMax
    const pct = submissionResult.percentage ?? Math.round((score / maxScore) * 100)
    const stars = submissionResult.starsEarned ?? (pct >= 90 ? 5 : pct >= 75 ? 4 : pct >= 60 ? 3 : pct >= 40 ? 2 : 1)
    const helix = submissionResult.helixPointsEarned ?? 10

    let mcqScore = 0, mcqMax = 0, shortScore = 0, shortMax = 0, essayScore = 0, essayMax = 0

    questions.forEach((q: any) => {
      const qMax = q.maxMarks || q.points || 10
      const studentAns = quiz.attempts?.[0]?.answers?.find((a: any) => a.questionId === q.id) || {}
      const awarded = studentAns.marksAwarded || 0

      if (q.type === 'MCQ') { mcqScore += awarded; mcqMax += qMax }
      else if (q.type === 'SHORT_ANSWER') { shortScore += awarded; shortMax += qMax }
      else { essayScore += awarded; essayMax += qMax }
    })

    return (
      <div className="content-wrapper" style={{ maxWidth: '850px' }}>
        
        {/* Confetti Banner if medal won */}
        {showConfetti && (
          <div style={{ background: '#ffd700', color: '#1a1a2e', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e', padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
            🎉 CONGRATULATIONS! YOU EARNED A MEDAL! 🎉
          </div>
        )}

        <div className="card" style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>Quiz Completed!</h2>
          <p style={{ color: '#64748b', fontWeight: 700, marginBottom: '2rem' }}>{quiz.title}</p>

          {/* Results Summary Grid */}
          <div style={{ background: '#f8fafc', border: '3px solid #1a1a2e', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e' }}>{score} / {maxScore}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Percentage</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: pct >= 60 ? '#00c853' : '#f50057' }}>{pct}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Stars Earned</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffd700' }}>{'★'.repeat(stars)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>HELIX Points</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#aa00ff' }}>+{helix}</div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {mcqMax > 0 && <span style={{ background: '#e0f2fe', color: '#0284c7', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.4rem 1rem', fontWeight: 800, fontSize: '0.85rem' }}>MCQ: {mcqScore}/{mcqMax}</span>}
            {shortMax > 0 && <span style={{ background: '#fef3c7', color: '#b45309', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.4rem 1rem', fontWeight: 800, fontSize: '0.85rem' }}>Short Answer: {shortScore}/{shortMax}</span>}
            {essayMax > 0 && <span style={{ background: '#fce7f3', color: '#be185d', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.4rem 1rem', fontWeight: 800, fontSize: '0.85rem' }}>Essay: {essayScore}/{essayMax}</span>}
          </div>

          {/* Question Breakdown */}
          {quiz.showAnswersAfterSubmission && (
            <div style={{ textAlign: 'left', marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1rem' }}>Detailed Question Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.map((q: any, i: number) => {
                  const studentAns = quiz.attempts?.[0]?.answers?.find((a: any) => a.questionId === q.id) || {}
                  let opts = []
                  try { if (q.options) opts = JSON.parse(q.options) } catch (e) {}

                  let keyCovered: string[] = []
                  let keyMissed: string[] = []
                  try { if (studentAns.keyPointsCovered) keyCovered = JSON.parse(studentAns.keyPointsCovered) } catch (e) {}
                  try { if (studentAns.keyPointsMissed) keyMissed = JSON.parse(studentAns.keyPointsMissed) } catch (e) {}

                  return (
                    <div key={q.id} style={{ background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1a1a2e' }}>
                          Q{i + 1}. {q.text} ({q.maxMarks || q.points} marks)
                        </div>

                        {/* Marking Method Badge */}
                        {studentAns.overrideByTeacher ? (
                          <span style={{ background: '#aa00ff', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>
                            👤 Teacher reviewed
                          </span>
                        ) : studentAns.gradingMethod === 'teacher' ? (
                          <span style={{ background: '#00c853', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>
                            👤 Teacher marked
                          </span>
                        ) : studentAns.gradingMethod === 'ai' ? (
                          <span style={{ background: '#2979ff', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>
                            ✨ AI graded
                          </span>
                        ) : (
                          <span style={{ background: '#cbd5e1', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 900 }}>
                            Auto-marked
                          </span>
                        )}
                      </div>

                      {q.type === 'MCQ' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {opts.map((opt: any, oIdx: number) => {
                            const isSelected = studentAns.selectedOption === oIdx
                            const isCorrect = q.correctOption === oIdx
                            let bg = '#ffffff'
                            let color = '#1a1a2e'

                            if (isCorrect) { bg = '#00c853'; color = '#ffffff' }
                            else if (isSelected && !isCorrect) { bg = '#f50057'; color = '#ffffff' }

                            return (
                              <div
                                key={oIdx}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: bg,
                                  color: color,
                                  border: '2px solid #1a1a2e',
                                  borderRadius: '50px',
                                  fontWeight: 800,
                                  fontSize: '0.85rem'
                                }}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt.text} {isCorrect ? '✓ Correct' : isSelected ? '❌ Your selection' : ''}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {q.type !== 'MCQ' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <strong>Your Answer:</strong> {studentAns.shortAnswerText || studentAns.answerText || 'No answer submitted'}
                          </div>

                          {studentAns.aiFeedback && (
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, background: '#f0fdf4', color: '#15803d', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #00c853' }}>
                              🤖 <strong>AI Feedback:</strong> {studentAns.aiFeedback}
                            </div>
                          )}

                          {studentAns.teacherFeedback && (
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, background: '#fffbeb', color: '#b45309', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #ffab00' }}>
                              👨‍🏫 <strong>Teacher Feedback:</strong> {studentAns.teacherFeedback}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2.5rem' }}>
            <Link
              href="/dashboard/student/quizzes"
              style={{
                display: 'inline-block',
                background: '#00c853',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: '4px 4px 0px #1a1a2e',
                padding: '0.85rem 2rem',
                fontWeight: 900,
                fontSize: '1rem',
                textDecoration: 'none'
              }}
            >
              Back to quizzes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // REVIEW SCREEN
  if (isReviewing) {
    return (
      <div className="content-wrapper" style={{ maxWidth: '800px' }}>
        <div className="card" style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>Review answers before submitting</h2>
          <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>Check all your answers below before final submission.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {questions.map((q: any, i: number) => {
              const ans = answers[q.id]
              const hasAnswered = ans && (ans.selectedOption !== undefined || (ans.answerText && ans.answerText.trim() !== ''))

              return (
                <div
                  key={q.id}
                  onClick={() => { setCurrentIndex(i); setIsReviewing(false); }}
                  style={{
                    background: hasAnswered ? '#f0fdf4' : '#fff3cd',
                    border: '2px solid #1a1a2e',
                    borderRadius: '12px',
                    padding: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1a1a2e' }}>Q{i + 1}. {q.text}</div>
                    <div style={{ fontSize: '0.8rem', color: hasAnswered ? '#15803d' : '#856404', fontWeight: 800, marginTop: '0.2rem' }}>
                      {hasAnswered ? '✓ Answered' : '⚠️ Unanswered'}
                    </div>
                  </div>
                  <button style={{ background: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.3rem 0.8rem', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                    Edit Q{i + 1}
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setIsReviewing(false)}
              style={{ flex: 1, background: '#ffffff', color: '#1a1a2e', border: '3px solid #1a1a2e', borderRadius: '50px', padding: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
            >
              ← Back to questions
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              style={{ flex: 2, background: '#f50057', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '50px', boxShadow: '4px 4px 0px #1a1a2e', padding: '0.85rem', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}
            >
              Submit quiz
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ maxWidth: '450px', width: '100%', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>Submit quiz?</h3>
              <p style={{ color: '#64748b', fontWeight: 600, marginBottom: '1.5rem' }}>
                You have answered {Object.keys(answers).length} of {totalQuestions} questions. You cannot change answers after submitting.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  style={{ flex: 1, background: '#f50057', color: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '50px', boxShadow: '3px 3px 0px #1a1a2e', padding: '0.75rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  {submitting ? 'Submitting...' : 'Yes, submit now'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
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

  // QUESTION RUNNER VIEW
  let opts = []
  if (currentQ && currentQ.options) {
    try { opts = JSON.parse(currentQ.options) } catch (e) {}
  }

  const currentAnswer = answers[currentQ?.id]

  return (
    <div className="content-wrapper" style={{ maxWidth: '800px' }}>
      
      {/* Header & Countdown Timer & Progress Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase' }}>
            {quiz.title}
          </span>

          {secondsRemaining !== null && (
            <span style={{
              background: secondsRemaining < 300 ? '#f50057' : '#1a1a2e',
              color: '#ffffff',
              border: '2px solid #1a1a2e',
              borderRadius: '50px',
              padding: '0.2rem 0.75rem',
              fontWeight: 900,
              fontSize: '0.85rem'
            }}>
              ⏰ {formatTimer(secondsRemaining)} remaining
            </span>
          )}

          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#00c853' }}>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Progress bar pill */}
        <div style={{ width: '100%', height: '14px', background: '#e2e8f0', border: '2px solid #1a1a2e', borderRadius: '50px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: '#00c853', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#d32f2f', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 800, border: '2px solid #1a1a2e' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Question Box */}
      <div className="card" style={{ background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '8px 8px 0px #1a1a2e', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ background: '#2979ff', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 900 }}>
            {currentQ?.type === 'MCQ' ? 'Multiple Choice' : currentQ?.type === 'SHORT_ANSWER' ? 'Short Answer' : 'Essay'}
          </span>
          <span style={{ fontWeight: 900, color: '#1a1a2e', fontSize: '0.9rem' }}>
            {currentQ?.maxMarks || currentQ?.points} Marks
          </span>
        </div>

        <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '1.5rem', lineHeight: 1.4 }}>
          {currentQ?.text}
        </h3>

        {/* MCQ Answers - 4 large full-width pills */}
        {currentQ?.type === 'MCQ' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {opts.map((opt: any, optIdx: number) => {
              const optLabel = String.fromCharCode(65 + optIdx)
              const isSelected = currentAnswer?.selectedOption === optIdx

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectMcq(currentQ.id, optIdx)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.85rem 1.25rem',
                    background: isSelected ? '#2979ff' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#1a1a2e',
                    border: '2px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: isSelected ? '4px 4px 0px #1a1a2e' : '3px 3px 0px #1a1a2e',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: isSelected ? '#ffffff' : '#f8fafc',
                    color: isSelected ? '#2979ff' : '#1a1a2e',
                    border: '1.5px solid #1a1a2e',
                    fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {optLabel}
                  </span>
                  <span>{opt.text}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Short Answer / Essay Input */}
        {(currentQ?.type === 'SHORT_ANSWER' || currentQ?.type === 'ESSAY') && (
          <div>
            <textarea
              rows={currentQ.type === 'ESSAY' ? 8 : 4}
              value={currentAnswer?.answerText || ''}
              onChange={e => handleTextAnswer(currentQ.id, e.target.value)}
              placeholder="Type your response here..."
              style={{ width: '100%', background: '#ffffff', border: '2px solid #1a1a2e', borderRadius: '12px', padding: '12px', color: '#1a1a2e', fontWeight: 700, fontSize: '0.95rem' }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '0.4rem' }}>
              Word count: {(currentAnswer?.answerText || '').trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
        )}
      </div>

      {/* Navigation Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {questions.map((q: any, i: number) => {
          const ans = answers[q.id]
          const isAnswered = ans && (ans.selectedOption !== undefined || (ans.answerText && ans.answerText.trim() !== ''))
          const isCurrent = i === currentIndex

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isCurrent ? '#aa00ff' : isAnswered ? '#2979ff' : '#e2e8f0',
                color: isCurrent || isAnswered ? '#ffffff' : '#1a1a2e',
                border: '2px solid #1a1a2e',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: isCurrent ? '2px 2px 0px #1a1a2e' : 'none'
              }}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          style={{
            background: '#ffffff',
            color: '#1a1a2e',
            border: '2.5px solid #1a1a2e',
            borderRadius: '50px',
            padding: '0.65rem 1.5rem',
            fontWeight: 800,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIndex === 0 ? 0.5 : 1
          }}
        >
          ← Previous
        </button>

        {currentIndex < totalQuestions - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => prev + 1)}
            style={{
              background: '#00c853',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '50px',
              boxShadow: '4px 4px 0px #1a1a2e',
              padding: '0.65rem 1.8rem',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsReviewing(true)}
            style={{
              background: '#2979ff',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              borderRadius: '50px',
              boxShadow: '4px 4px 0px #1a1a2e',
              padding: '0.65rem 1.8rem',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Review answers →
          </button>
        )}
      </div>

    </div>
  )
}
