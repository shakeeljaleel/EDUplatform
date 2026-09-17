import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function StudentQuizzesPage() {
  const session = await getSession()
  if (!session) return null
  const userId = session.user.id

  // Get active enrollments for student
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId: userId, status: 'active' },
    select: { subjectId: true, batchId: true }
  })

  const subjectIds = enrollments.map(e => e.subjectId).filter(Boolean)
  const batchIds = enrollments.map(e => e.batchId).filter(Boolean)

  // Fetch published and closed quizzes for these subjects/batches
  const quizzes = await prisma.quiz.findMany({
    where: {
      OR: [
        { subjectId: { in: subjectIds } },
        { batchId: { in: batchIds } }
      ],
      status: { in: ['PUBLISHED', 'CLOSED'] }
    },
    include: {
      subject: true,
      linkedSession: true,
      questions: { select: { id: true, points: true, maxMarks: true } },
      attempts: {
        where: { userId },
        select: { score: true, status: true, submittedAt: true, helixPointsAwarded: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const now = new Date()

  return (
    <div className="content-wrapper fade-in" style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1a1a2e' }}>Quizzes & Assessments</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 600 }}>
          Test your mastery, earn HELIX points, stars, and climb the leaderboard!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '2rem' }}>
        {quizzes.map((quiz) => {
          const attempt = quiz.attempts && quiz.attempts.length > 0 ? quiz.attempts[0] : null
          const isCompleted = !!attempt
          const isOverdue = quiz.dueDate && new Date(quiz.dueDate) < now && !isCompleted

          const maxScore = quiz.questions.reduce((acc, q) => acc + (q.maxMarks || q.points || 10), 0)
          const pct = isCompleted && maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : null

          let stars = 0
          if (pct !== null) {
            if (pct >= 90) stars = 5
            else if (pct >= 75) stars = 4
            else if (pct >= 60) stars = 3
            else if (pct >= 40) stars = 2
            else stars = 1
          }

          const subjectColor = quiz.subject?.colour || '#2979ff'

          return (
            <div
              key={quiz.id}
              style={{
                background: isOverdue ? '#fff5f5' : '#ffffff',
                border: '3px solid #1a1a2e',
                borderRadius: '16px',
                boxShadow: '5px 5px 0px #1a1a2e',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                {/* Header Pills */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{
                    background: subjectColor,
                    color: '#ffffff',
                    border: '1.5px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}>
                    {quiz.subject?.name || 'General'}
                  </span>

                  {quiz.linkedSession && (
                    <span style={{
                      background: '#2979ff',
                      color: '#ffffff',
                      border: '1.5px solid #1a1a2e',
                      borderRadius: '50px',
                      padding: '0.15rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}>
                      Based on: {quiz.linkedSession.title}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.4rem' }}>{quiz.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>
                  Topic: {quiz.topic || 'General Sequence'}
                </p>

                {/* Details */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#1a1a2e', fontWeight: 800, marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>❓ {quiz.questions.length} Questions</div>
                  <div>🎯 {maxScore} Marks Total</div>
                </div>

                {/* Due Date & Overdue Tag */}
                {quiz.dueDate && (
                  <div style={{ marginBottom: '1rem' }}>
                    {isOverdue ? (
                      <span style={{ background: '#f50057', color: '#ffffff', border: '1.5px solid #1a1a2e', borderRadius: '50px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 900 }}>
                        ⚠️ Overdue — Due {new Date(quiz.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                        ⏰ Due {new Date(quiz.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status / Button Bar */}
              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isCompleted ? (
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#00c853' }}>
                      Result: {pct}% ({attempt.score}/{maxScore})
                    </div>
                    <div style={{ color: '#ffd700', fontSize: '0.85rem' }}>{'★'.repeat(stars)}</div>
                  </div>
                ) : (
                  <span style={{
                    background: quiz.status === 'CLOSED' ? '#1a1a2e' : '#ffab00',
                    color: '#ffffff',
                    border: '1.5px solid #1a1a2e',
                    borderRadius: '50px',
                    padding: '0.2rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}>
                    {quiz.status === 'CLOSED' ? 'Closed' : 'Not started'}
                  </span>
                )}

                <Link
                  href={`/dashboard/student/quizzes/${quiz.id}`}
                  style={{
                    background: isCompleted ? '#ffffff' : '#00c853',
                    color: isCompleted ? '#1a1a2e' : '#ffffff',
                    border: '2.5px solid #1a1a2e',
                    borderRadius: '50px',
                    boxShadow: '3px 3px 0px #1a1a2e',
                    padding: '0.5rem 1.3rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    textDecoration: 'none'
                  }}
                >
                  {isCompleted ? 'View results' : quiz.status === 'CLOSED' ? 'View quiz' : 'Start quiz →'}
                </Link>
              </div>
            </div>
          )
        })}

        {quizzes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: '#ffffff', border: '3px solid #1a1a2e', borderRadius: '20px', boxShadow: '6px 6px 0px #1a1a2e' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🧪</div>
            <h3 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1a1a2e' }}>No Quizzes Available</h3>
            <p style={{ color: '#64748b', fontWeight: 600 }}>Your teachers have not published any assessments for your enrolled subjects yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
