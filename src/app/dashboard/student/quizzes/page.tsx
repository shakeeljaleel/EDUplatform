import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { QuizzesIcon, RoughFilter } from '@/components/HandDrawnIcons'

const TOPIC_GRADIENTS = [
  { border: '#00c853', bg: 'linear-gradient(135deg, #00c853, #00e676)', labelBg: '#e8f5e9', textColor: '#00c853' },
  { border: '#2979ff', bg: 'linear-gradient(135deg, #2979ff, #40c4ff)', labelBg: '#e3f2fd', textColor: '#2979ff' },
  { border: '#aa00ff', bg: 'linear-gradient(135deg, #aa00ff, #ea80fc)', labelBg: '#f3e5f5', textColor: '#aa00ff' },
  { border: '#ff6d00', bg: 'linear-gradient(135deg, #ff6d00, #ffd180)', labelBg: '#fff3e0', textColor: '#ff6d00' },
  { border: '#f50057', bg: 'linear-gradient(135deg, #f50057, #ff80ab)', labelBg: '#fce4ec', textColor: '#f50057' },
]

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
        {quizzes.map((quiz, idx) => {
          const isCompleted = quiz.attempts && quiz.attempts.length > 0;
          const score = isCompleted ? quiz.attempts[0].score : null;
          const topicTheme = TOPIC_GRADIENTS[idx % TOPIC_GRADIENTS.length];

          return (
            <div key={quiz.id} className="premium-card-v2" style={{ 
              opacity: isCompleted ? 0.85 : 1,
              borderLeft: `8px solid ${topicTheme.border}`,
              borderTop: isCompleted ? '8px solid #94a3b8' : `8px solid ${topicTheme.border}`,
              boxShadow: `0 8px 24px ${topicTheme.border}22`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.2 }}>{quiz.title}</h3>
                {isCompleted ? (
                  <span style={{ background: '#94a3b8', color: 'white', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 }}>Done</span>
                ) : (
                  <span style={{ background: topicTheme.bg, color: 'white', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, boxShadow: `0 2px 8px ${topicTheme.border}44` }}>Live</span>
                )}
              </div>
              
              <div style={{ background: topicTheme.labelBg, padding: '1rem', borderRadius: '12px', border: `1px solid ${topicTheme.border}44`, marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.85rem', color: topicTheme.textColor, fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {quiz.subject?.name || 'General Batch'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {quiz.chapter ? `Unit: ${quiz.chapter}` : 'General Sequence'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ fontWeight: 900, fontSize: '1rem' }}>
                  {isCompleted ? (
                    <span style={{ color: topicTheme.textColor }}>🎯 Result: {score}%</span>
                  ) : (
                    <span>📋 {quiz._count.questions} Qs</span>
                  )}
                </div>
                {isCompleted ? (
                  <button disabled style={{ padding: '8px 16px', fontSize: '0.75rem', background: '#e2e8f0', cursor: 'not-allowed', color: '#94a3b8', borderRadius: '12px', border: 'none', fontWeight: 800 }}>
                    Completed
                  </button>
                ) : (
                  <Link href={`/dashboard/student/quizzes/${quiz.id}`} style={{
                    padding: '8px 20px', fontSize: '0.85rem', background: topicTheme.bg, color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 800, boxShadow: `0 4px 12px ${topicTheme.border}44`
                  }}>
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
