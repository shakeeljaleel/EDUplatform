'use client'

import { useState, useEffect, use } from 'react'

export default function ManageQuizPage({ params }: { params: Promise<{ id: string, quizId: string }> }) {
  const { id, quizId } = use(params)
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Question Form State
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [type, setType] = useState('MCQ')
  const [text, setText] = useState('')
  const [points, setPoints] = useState(10)
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctOption, setCorrectOption] = useState(0)

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

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          text, 
          points, 
          options: type === 'MCQ' ? options : null, 
          correctOption: type === 'MCQ' ? correctOption : null 
        }),
      })
      
      if (res.ok) {
        setShowAddQuestion(false)
        setText('')
        setOptions(['', '', '', ''])
        setCorrectOption(0)
        fetchQuiz()
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    setLoading(true)
    try {
      const newStatus = quiz.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchQuiz()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  if (!quiz) return <div>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{quiz.title}</h2>
          <div style={{ color: 'var(--text-secondary)' }}>Topic: {quiz.topic}</div>
        </div>
        <button 
          className="btn-secondary" 
          onClick={handlePublish}
          disabled={loading || quiz.questions.length === 0}
          style={{ borderColor: quiz.status === 'PUBLISHED' ? 'var(--warning)' : 'var(--success)', color: quiz.status === 'PUBLISHED' ? 'var(--warning)' : 'var(--success)' }}
        >
          {quiz.status === 'PUBLISHED' ? 'Unpublish' : 'Publish Quiz'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1.25rem' }}>Questions ({quiz.questions.length})</h3>
        <button className="btn-primary" onClick={() => setShowAddQuestion(!showAddQuestion)}>
          {showAddQuestion ? 'Cancel' : '+ Add Question'}
        </button>
      </div>

      {showAddQuestion && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Question Type</label>
                <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
                  <option value="MCQ">Multiple Choice</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Points</label>
                <input type="number" min="1" className="input-field" value={points} onChange={e => setPoints(parseInt(e.target.value))} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Question Text</label>
              <textarea className="input-field" rows={3} required value={text} onChange={e => setText(e.target.value)} placeholder="e.g. What is the powerhouse of the cell?" />
            </div>

            {type === 'MCQ' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Options</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="radio" 
                        name="correctOption" 
                        checked={correctOption === idx} 
                        onChange={() => setCorrectOption(idx)} 
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder={`Option ${idx + 1}`} 
                        required 
                        value={opt} 
                        onChange={e => handleOptionChange(idx, e.target.value)} 
                      />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Select the radio button next to the correct answer.</p>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>Save Question</button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {quiz.questions.map((q: any, i: number) => (
          <div key={q.id} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Q{i + 1}. {q.text}</div>
              <div className="badge badge-level">{q.points} pts</div>
            </div>
            
            {q.type === 'MCQ' && q.options && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                {JSON.parse(q.options).map((opt: string, idx: number) => (
                  <div key={idx} style={{ 
                    padding: '0.5rem', 
                    borderRadius: 'var(--radius-sm)', 
                    backgroundColor: q.correctOption === idx ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    border: q.correctOption === idx ? '1px solid var(--success)' : '1px solid var(--bg-tertiary)',
                    color: q.correctOption === idx ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}>
                    {String.fromCharCode(65 + idx)}. {opt}
                  </div>
                ))}
              </div>
            )}
            
            {q.type === 'SHORT_ANSWER' && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                <em>Short answer required. Will be manually graded.</em>
              </div>
            )}
          </div>
        ))}
        {quiz.questions.length === 0 && !showAddQuestion && (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No questions added yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
