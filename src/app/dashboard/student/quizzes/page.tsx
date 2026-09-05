import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { QuizzesIcon, RoughFilter } from '@/components/HandDrawnIcons'

export default async function AllQuizzesPage() {
  const session = await getSession()
  if (!session) return null
  const userId = session.user.id

  // Get all batches student is enrolled in
  const enrollments = await prisma.batchEnrollment.findMany({
    where: { userId },
    select: { batchId: true }
  })

  const batchIds = enrollments.map(e => e.batchId)

  // Get all published quizzes for these batches
  const quizzes = await prisma.quiz.findMany({
    where: {
      batchId: { in: batchIds },
      status: 'PUBLISHED'
    },
    include: {
      subject: true,
      _count: { select: { questions: true } },
      attempts: {
        where: { userId },
        select: { score: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="content-wrapper fade-in">
      <RoughFilter />
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <QuizzesIcon size={48} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Assessment Helix</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 600 }}>Active quizzes and academic performance records.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '3rem' }}>
        {quizzes.map((quiz) => {
          const isCompleted = quiz.attempts && quiz.attempts.length > 0;
          const score = isCompleted ? quiz.attempts[0].score : null;

          return (
            <div key={quiz.id} className="premium-card-v2" style={{ 
              opacity: isCompleted ? 0.8 : 1,
              borderTop: isCompleted ? '12px solid var(--text-secondary)' : '12px solid var(--accent-primary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.2 }}>{quiz.title}</h3>
                {isCompleted ? (
                  <span className="sketch-badge" style={{ backgroundColor: 'var(--text-secondary)', color: 'white' }}>Done</span>
                ) : (
                  <span className="sketch-badge" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>Live</span>
                )}
              </div>
              
              <div style={{ background: 'var(--bg-accent)', padding: '1rem', borderRadius: '12px', border: '2px solid var(--text-primary)', marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {quiz.subject?.name || 'General Batch'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {quiz.chapter ? `Unit: ${quiz.chapter}` : 'General Sequence'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ fontWeight: 900, fontSize: '1rem' }}>
                  {isCompleted ? (
                    <span style={{ color: 'var(--accent-primary)' }}>🎯 Result: {score}%</span>
                  ) : (
                    <span>📋 {quiz._count.questions} Qs</span>
                  )}
                </div>
                {isCompleted ? (
                  <button disabled className="sketch-button-v2" style={{ padding: '8px 16px', fontSize: '0.75rem', background: 'var(--bg-tertiary)', boxShadow: 'none', cursor: 'not-allowed', color: 'var(--text-muted)' }}>
                    Locked
                  </button>
                ) : (
                  <Link href={`/dashboard/student/quizzes/${quiz.id}`} className="sketch-button-v2" style={{ padding: '8px 20px', fontSize: '0.75rem' }}>
                    Engage
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {quizzes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '6rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🧪</div>
            <h3 style={{ fontWeight: 900, color: 'var(--text-secondary)' }}>Helix is Clear</h3>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No active assessments currently scheduled for your profile.</p>
          </div>
        )}
      </div>
    </div>
  )
}
