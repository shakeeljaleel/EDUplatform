import React from 'react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function StudentQuizResultsPage({
  params
}: {
  params: Promise<{ quizId: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const { quizId } = await params

  // 1. Fetch Quiz with Questions
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' }
      },
      subject: { select: { id: true, name: true, colour: true } }
    }
  })

  if (!quiz) {
    notFound()
  }

  // 2. Fetch Student's Submission (Attempt with Answers)
  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId,
      userId: session.user.id
    },
    include: {
      answers: true
    }
  })

  // 1. Access Rule: Only show after the quiz status is 'CLOSED' or the student has submitted
  const isClosed = quiz.status === 'CLOSED'
  const hasSubmitted = !!(attempt && attempt.submittedAt)

  if (!isClosed && !hasSubmitted) {
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
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.75rem' }}>
            Results Not Available Yet
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 700, marginBottom: '2rem', lineHeight: 1.5 }}>
            Quiz review and answers will be available after you submit your quiz or once the teacher closes the assessment.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link
              href={`/dashboard/student/quizzes/${quizId}`}
              style={{
                background: '#00c853',
                color: '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                padding: '0.75rem 2rem',
                fontWeight: 900,
                textDecoration: 'none',
                boxShadow: '4px 4px 0px #1a1a2e'
              }}
            >
              Take Quiz Now →
            </Link>
            <Link
              href="/dashboard/student/quizzes"
              style={{
                background: '#ffffff',
                color: '#1a1a2e',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                padding: '0.75rem 2rem',
                fontWeight: 800,
                textDecoration: 'none',
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

  // Calculate scores and statistics
  const questions = quiz.questions || []
  const maxPossible =
    attempt?.maxPossibleScore ||
    questions.reduce((sum, q) => sum + (q.maxMarks || q.points || 10), 0) ||
    100
  const score = attempt?.score ?? 0
  const percentage =
    attempt?.percentageScore ?? (maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0)

  // Count correct answers
  let correctCount = 0
  questions.forEach(q => {
    const ans = attempt?.answers?.find(a => a.questionId === q.id)
    if (ans) {
      if (ans.isCorrect === true) {
        correctCount++
      } else if (q.type === 'MCQ' && ans.selectedOption !== null && ans.selectedOption !== undefined) {
        if (ans.selectedOption === q.correctOption) {
          correctCount++
        }
      } else if (ans.marksAwarded >= (q.maxMarks || q.points || 10)) {
        correctCount++
      }
    }
  })

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 5rem 1rem' }}>
      {/* Top Header */}
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
                background: isClosed ? '#1a1a2e' : '#00c853',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 900,
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                border: '2px solid #1a1a2e'
              }}
            >
              {isClosed ? 'CLOSED & GRADED' : 'SUBMITTED'}
            </span>
            <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.9rem' }}>
              {quiz.subject?.name || 'Assessment'}
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>
            {quiz.title} — Review & Results
          </h1>
        </div>

        <Link
          href="/dashboard/student/quizzes"
          style={{
            background: '#ffffff',
            color: '#1a1a2e',
            border: '2px solid #1a1a2e',
            borderRadius: '50px',
            padding: '0.6rem 1.25rem',
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '3px 3px 0px #1a1a2e',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Quizzes
        </Link>
      </div>

      {/* 5. Scorecard Banner at the Top */}
      <div
        style={{
          background: '#ffffff',
          border: '4px solid #1a1a2e',
          borderRadius: '24px',
          boxShadow: '8px 8px 0px #1a1a2e',
          padding: '2rem',
          marginBottom: '2.5rem'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1.5rem',
            textAlign: 'center'
          }}
        >
          {/* Total Score */}
          <div
            style={{
              background: '#f8fafc',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              padding: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
              Total Score
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1a1a2e', lineHeight: 1.2, marginTop: '0.25rem' }}>
              {score} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>/ {maxPossible}</span>
            </div>
          </div>

          {/* Percentage */}
          <div
            style={{
              background: percentage >= 60 ? '#e8f5e9' : '#ffebee',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              padding: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
              Percentage
            </div>
            <div
              style={{
                fontSize: '2.4rem',
                fontWeight: 900,
                color: percentage >= 60 ? '#2e7d32' : '#c62828',
                lineHeight: 1.2,
                marginTop: '0.25rem'
              }}
            >
              {percentage}%
            </div>
          </div>

          {/* Correct Questions */}
          <div
            style={{
              background: '#f8fafc',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              padding: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
              Correct Answers
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#2979ff', lineHeight: 1.2, marginTop: '0.25rem' }}>
              {correctCount} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>/ {questions.length}</span>
            </div>
          </div>

          {/* Stars / Medals */}
          <div
            style={{
              background: '#fffbeb',
              border: '3px solid #1a1a2e',
              borderRadius: '16px',
              padding: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
              Rating
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1.2, marginTop: '0.35rem' }}>
              {attempt?.starsAwarded ? '★'.repeat(attempt.starsAwarded) : percentage >= 80 ? '★★★★★' : percentage >= 60 ? '★★★★' : '★★★'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Question-by-Question Review */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>
          Answer Review ({questions.length} Questions)
        </h2>

        {questions.map((q, idx) => {
          const ans = attempt?.answers?.find(a => a.questionId === q.id)
          const qMaxMarks = q.maxMarks || q.points || 10
          const marksAwarded = ans?.marksAwarded ?? 0

          // Determine correctness
          let isCorrect = false
          if (ans) {
            if (ans.isCorrect !== null && ans.isCorrect !== undefined) {
              isCorrect = ans.isCorrect
            } else if (q.type === 'MCQ') {
              isCorrect =
                ans.selectedOption !== null &&
                ans.selectedOption !== undefined &&
                q.correctOption !== null &&
                q.correctOption !== undefined &&
                ans.selectedOption === q.correctOption
            } else {
              isCorrect = marksAwarded >= qMaxMarks
            }
          }

          // Parse options for MCQ
          let opts: any[] = []
          if (q.options) {
            try {
              opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            } catch {
              opts = []
            }
          }

          const studentSelectedIdx = ans?.selectedOption ?? null
          const correctIdx = q.correctOption ?? null

          return (
            <div
              key={q.id || idx}
              style={{
                background: '#ffffff',
                border: `3.5px solid #1a1a2e`,
                borderRadius: '20px',
                boxShadow: '6px 6px 0px #1a1a2e',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Question Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      background: '#1a1a2e',
                      color: '#ffffff',
                      borderRadius: '50px',
                      padding: '0.35rem 0.9rem',
                      fontWeight: 900,
                      fontSize: '0.85rem'
                    }}
                  >
                    Q{idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#64748b',
                      textTransform: 'uppercase'
                    }}
                  >
                    {q.type}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1a1a2e' }}>
                    {marksAwarded} / {qMaxMarks} Marks
                  </span>
                  <span
                    style={{
                      background: isCorrect ? '#e8f5e9' : '#ffebee',
                      color: isCorrect ? '#2e7d32' : '#c62828',
                      border: `2px solid ${isCorrect ? '#2e7d32' : '#c62828'}`,
                      borderRadius: '50px',
                      padding: '0.25rem 0.85rem',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                  </span>
                </div>
              </div>

              {/* Question Prompt */}
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.4 }}>
                {q.text}
              </div>

              {/* MCQ Options Display */}
              {q.type === 'MCQ' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {opts.map((opt: any, optIdx: number) => {
                    const optText = typeof opt === 'string' ? opt : opt.text || ''
                    const isStudentChoice = studentSelectedIdx === optIdx
                    const isCorrectAnswer = correctIdx === optIdx

                    let border = '2px solid #cbd5e1'
                    let bg = '#f8fafc'
                    let textColor = '#1a1a2e'
                    let badge = null

                    if (isStudentChoice && isCorrectAnswer) {
                      border = '3px solid #00c853'
                      bg = '#e8f5e9'
                      textColor = '#1b5e20'
                      badge = (
                        <span style={{ background: '#00c853', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 900 }}>
                          ✓ Your Answer (Correct)
                        </span>
                      )
                    } else if (isStudentChoice && !isCorrectAnswer) {
                      border = '3px solid #d32f2f'
                      bg = '#ffebee'
                      textColor = '#b71c1c'
                      badge = (
                        <span style={{ background: '#d32f2f', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 900 }}>
                          ✗ Your Answer (Incorrect)
                        </span>
                      )
                    } else if (isCorrectAnswer) {
                      border = '3px solid #00c853'
                      bg = '#f1f8e9'
                      textColor = '#2e7d32'
                      badge = (
                        <span style={{ background: '#00c853', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 900 }}>
                          ✓ Correct Answer
                        </span>
                      )
                    }

                    return (
                      <div
                        key={optIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1.25rem',
                          borderRadius: '12px',
                          border,
                          background: bg,
                          color: textColor,
                          fontWeight: 700,
                          fontSize: '0.95rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 900, minWidth: '22px' }}>
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{optText}</span>
                        </div>
                        {badge}
                      </div>
                    )
                  })}
                  {studentSelectedIdx === null && (
                    <div style={{ color: '#d32f2f', fontSize: '0.85rem', fontWeight: 800, marginTop: '0.25rem' }}>
                      ⚠️ You skipped this question.
                    </div>
                  )}
                </div>
              )}

              {/* Short Answer / Essay Display */}
              {q.type !== 'MCQ' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Student Answer */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '2px solid #1a1a2e',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Your Answer:
                    </div>
                    <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                      {ans?.answerText || ans?.shortAnswerText || 'No answer submitted'}
                    </div>
                  </div>

                  {/* Mark Scheme */}
                  {q.markScheme && (
                    <div
                      style={{
                        background: '#e8f5e9',
                        border: '2px solid #2e7d32',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#2e7d32', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Correct / Model Answer & Mark Scheme:
                      </div>
                      <div style={{ fontWeight: 700, color: '#1b5e20', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                        {q.markScheme}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {(ans?.teacherFeedback || ans?.aiFeedback) && (
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '2px solid #b45309',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Feedback:
                      </div>
                      <div style={{ fontWeight: 700, color: '#78350f', fontSize: '0.9rem' }}>
                        {ans?.teacherFeedback || ans?.aiFeedback}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
