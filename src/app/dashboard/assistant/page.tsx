import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { ShieldAlert, MessageSquare, CheckSquare, Users, Sparkles } from '@/components/Icons'

export default async function AssistantDashboard() {
  const session = await getSession()
  if (!session) return null

  // Fetch moderation counts & recent forum posts
  const [flaggedCount, pinnedCount, totalPosts] = await Promise.all([
    prisma.forumPost.count({ where: { flagged: true } }),
    prisma.forumPost.count({ where: { pinned: true } }),
    prisma.forumPost.count()
  ])

  const forumPosts = await prisma.forumPost.findMany({
    orderBy: [
      { pinned: 'desc' },
      { flagged: 'desc' },
      { createdAt: 'desc' }
    ],
    take: 10,
    include: {
      author: true,
      batch: true
    }
  })

  return (
    <div className="content-wrapper fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Header Banner */}
      <div style={{
        background: '#e0f7fa',
        padding: '1.5rem 2rem',
        borderRadius: '16px',
        border: '3px solid #1a1a2e',
        boxShadow: '5px 5px 0px #1a1a2e',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Assistant Command Center 🛡️
        </h1>
        <p style={{ color: '#334155', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', margin: 0 }}>
          Welcome back, {session.user.name}. Manage discussion forums, review flagged content, and assist instruction.
        </p>
      </div>

      {/* STAT CARDS WITH SOLID FLAT COLOURS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Card 1 - Flagged Posts (Vivid Red) */}
        <div className="stat-card" style={{
          background: '#f50057',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800 }}>Flagged Posts</span>
            <ShieldAlert size={20} color="#ffffff" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#ffffff' }}>{flaggedCount}</div>
          <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.5rem' }}>Requires moderation review</p>
        </div>

        {/* Card 2 - Pinned Announcements (Electric Amber/Orange) */}
        <div className="stat-card" style={{
          background: '#ff6d00',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800 }}>Pinned Threads</span>
            <Sparkles size={20} color="#ffffff" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#ffffff' }}>{pinnedCount}</div>
          <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.5rem' }}>Highlighted community posts</p>
        </div>

        {/* Card 3 - Total Community Discussions (Electric Blue) */}
        <div className="stat-card" style={{
          background: '#2979ff',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#ffffff',
          border: '3px solid #1a1a2e',
          boxShadow: '5px 5px 0px #1a1a2e',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800 }}>Total Discussions</span>
            <MessageSquare size={20} color="#ffffff" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem', color: '#ffffff' }}>{totalPosts}</div>
          <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.5rem' }}>Across all batch channels</p>
        </div>
      </div>

      {/* FORUM MODERATION CARDS SECTION */}
      <div className="card" style={{ padding: '1.75rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MessageSquare size={24} color="#00c853" />
          Forum Moderation Queue
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {forumPosts.map((post) => {
            const isFlagged = post.flagged
            const isPinned = post.pinned
            const leftBorderColor = isFlagged ? '#ff1744' : isPinned ? '#ffd700' : '#cbd5e1'
            const badgeBg = isFlagged ? '#fef2f2' : isPinned ? '#fffbeb' : '#f8fafc'
            const badgeColor = isFlagged ? '#dc2626' : isPinned ? '#b45309' : '#64748b'

            return (
              <div 
                key={post.id} 
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '12px',
                  background: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  borderRight: '1px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                  borderLeft: `6px solid ${leftBorderColor}`,
                  boxShadow: `0 4px 14px ${leftBorderColor}22`,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      {isFlagged && (
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: '9999px', background: '#ff1744', color: 'white', fontWeight: 800, fontSize: '0.7rem' }}>
                          🚩 FLAGGED FOR REVIEW
                        </span>
                      )}
                      {isPinned && (
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #ffd700, #ffae00)', color: 'white', fontWeight: 800, fontSize: '0.7rem', boxShadow: '0 2px 8px rgba(255,215,0,0.5)' }}>
                          📌 PINNED THREAD
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                        {post.batch?.name || 'General Channel'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                      {post.title}
                    </h3>
                    <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                      {post.content}
                    </p>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>
                    <div>By <strong>{post.author?.name || 'Anonymous'}</strong></div>
                    <div style={{ marginTop: '0.25rem' }}>{new Date(post.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            )
          })}

          {forumPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>
              No forum posts found. The discussion stream is quiet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
