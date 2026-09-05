'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function TakeQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params)
  const router = useRouter()
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetchQuiz()
  }, [])

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`)
      if (res.ok) {
        const data = await res.json()
        setQuiz(data.quiz)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    setAnswers({
      ...answers,
      [questionId]: { questionId, selectedOption: optionIndex }
    })
  }

  const handleShortAnswerChange = (questionId: string, text: string) => {
    setAnswers({
      ...answers,
      [questionId]: { questionId, shortAnswerText: text }
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const formattedAnswers = Object.values(answers)
    
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      })
      
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        alert(data.error || 'Failed to submit quiz')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!quiz) return <div>Quiz not found</div>

  if (result) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Quiz Submitted! 🎉</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '2.5rem' }}>⭐ {result.starsEarned}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Stars Earned</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem' }}>🏅 {result.medalsEarned}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Medals Earned</div>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {result.attempt.status === 'PENDING_REVIEW' 
            ? 'Your short answers are pending review by your teacher. Great job so far!' 
            : `You scored ${result.attempt.score} points!`}
        </p>
        <button className="btn-primary" onClick={() => router.push(`/dashboard/student/batches/${quiz.batchId}`)}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{quiz.title}</h2>
        <div style={{ color: 'var(--text-secondary)' }}>Answer all questions carefully before submitting.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {quiz.questions.map((q: any, i: number) => (
          <div key={q.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>{i + 1}. {q.text}</h3>
              <span className="badge badge-level">{q.points} pts</span>
            </div>

            {q.type === 'MCQ' && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {JSON.parse(q.options).map((opt: string, idx: number) => {
                  const isSelected = answers[q.id]?.selectedOption === idx
                  return (
                    <button 
                      key={idx}
                      onClick={() => handleOptionSelect(q.id, idx)}
                      style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)',
                        border: isSelected ? '2px solid var(--accent-primary)' : '2px solid var(--bg-tertiary)',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {q.type === 'SHORT_ANSWER' && (
              <textarea 
                className="input-field" 
                rows={4} 
                placeholder="Type your answer here..."
                value={answers[q.id]?.shortAnswerText || ''}
                onChange={e => handleShortAnswerChange(q.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="btn-primary" 
          onClick={handleSubmit}
          disabled={submitting || Object.keys(answers).length < quiz.questions.length}
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  )
}
