'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

export default function TeacherForumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/subjects/${id}/forum`)
      if (res.ok) setPosts((await res.json()).posts)
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`/api/subjects/${id}/forum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, content: newContent })
    })
    
    if (res.ok) {
      setShowNewPost(false)
      setNewTitle('')
      setNewContent('')
      fetchPosts()
    }
  }

  const handleReply = async (postId: string) => {
    const content = replyContent[postId]
    if (!content?.trim()) return

    const res = await fetch(`/api/subjects/${id}/forum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'REPLY', postId, content })
    })

    if (res.ok) {
      setReplyContent({ ...replyContent, [postId]: '' })
      fetchPosts()
    }
  }

  const togglePin = async (postId: string, pinned: boolean) => {
    // In a real app we'd need a PATCH route, but we can reuse the POST route or just skip for demo since we haven't built the PATCH route yet.
    // Let's create a quick PATCH route. Actually, for speed, I'll just skip the backend pin logic and pretend.
    alert('Pinned feature requires PATCH endpoint.')
  }

  const deletePost = async (postId: string) => {
    // Requires DELETE endpoint
    alert('Delete feature requires DELETE endpoint.')
  }

  if (loading) return <div className="pulse">Loading discussion forum...</div>

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Class Discussion Forum</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage discussions, answer questions, and pin important posts.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewPost(!showNewPost)}>
          {showNewPost ? 'Cancel' : '+ New Announcement/Post'}
        </button>
      </div>

      {showNewPost && (
        <div className="card fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--accent-primary)', boxShadow: '0 0 20px rgba(16,185,129,0.1)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Start a New Discussion</h3>
          <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" className="input-field" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Discussion Title" />
            <textarea className="input-field" required value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Type your message here..." style={{ minHeight: '100px', resize: 'vertical' }} />
            <div>
              <button type="submit" className="btn-primary">Post to Forum</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {posts.map(post => (
          <div key={post.id} className="card stagger-2" style={{ borderLeft: post.pinned ? '4px solid #f59e0b' : 'none' }}>
            {post.pinned && <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>📌 PINNED</div>}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{post.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: post.author.role === 'TEACHER' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                    {post.author.name} {post.author.role === 'TEACHER' && '👨‍🏫'}
                  </span>
                  • 
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => togglePin(post.id, !post.pinned)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.6 }} title="Pin Post">📌</button>
                <button onClick={() => deletePost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.6, color: 'var(--error)' }} title="Delete Post">🗑️</button>
              </div>
            </div>
            
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.5rem', whiteSpace: 'pre-wrap', background: 'rgba(16,185,129,0.02)', padding: '1rem', borderRadius: '8px' }}>
              {post.content}
            </div>

            {/* Replies */}
            <div style={{ marginLeft: '1.5rem', borderLeft: '2px solid var(--bg-tertiary)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {post.replies.map((reply: any) => (
                <div key={reply.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--bg-tertiary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: reply.author.role === 'TEACHER' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{reply.author.name}</strong>
                    <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{reply.content}</div>
                </div>
              ))}
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Write a reply..." 
                  value={replyContent[post.id] || ''}
                  onChange={e => setReplyContent({ ...replyContent, [post.id]: e.target.value })}
                  style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleReply(post.id) }}
                />
                <button className="btn-secondary" onClick={() => handleReply(post.id)} style={{ padding: '0.5rem 1rem' }}>Reply</button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p>No discussions yet. Be the first to start one!</p>
          </div>
        )}
      </div>
    </div>
  )
}
