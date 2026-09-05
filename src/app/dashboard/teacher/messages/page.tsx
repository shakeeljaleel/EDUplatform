'use client'

import { useState, useEffect } from 'react'
import { MessagesIcon, RoughFilter } from '@/components/HandDrawnIcons'

export default function TeacherMessagesPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [activeContact, setActiveContact] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [msgRes, studentsRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/users?role=STUDENT')
      ])
      if (msgRes.ok) setContacts((await msgRes.json()).contacts)
      if (studentsRes.ok) setStudents((await studentsRes.json()).users || [])
    } finally {
      setLoading(false)
    }
  }

  const loadConversation = async (contactUser: any) => {
    setActiveContact(contactUser)
    const res = await fetch(`/api/messages?userId=${contactUser.id}`)
    if (res.ok) setMessages((await res.json()).messages)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeContact) return

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: activeContact.id, content: newMessage })
    })

    if (res.ok) {
      setNewMessage('')
      loadConversation(activeContact)
      fetchData()
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div className="pulse" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Sketching your inbox...</div>
    </div>
  )

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 160px)', 
      background: 'rgba(255, 255, 255, 0.4)', 
      backdropFilter: 'blur(10px)',
      borderRadius: '24px', 
      overflow: 'hidden', 
      border: '3px solid var(--text-primary)',
      filter: 'url(#rough-edge)',
      boxShadow: '12px 12px 0 var(--text-primary)',
      animation: 'slide-up 0.8s var(--ease-out-expo)'
    }}>
      {/* Sidebar Contacts */}
      <div style={{ width: '320px', borderRight: '3px solid var(--text-primary)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '2px solid var(--text-primary)' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MessagesIcon size={32} color="var(--text-primary)" />
            Student Inbox
          </h2>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 800, paddingLeft: '0.5rem' }}>Recent Chats</h3>
          {contacts.map(c => (
            <div 
              key={c.user.id} 
              onClick={() => loadConversation(c.user)}
              style={{ 
                padding: '1.25rem', 
                borderRadius: '16px',
                marginBottom: '0.5rem',
                cursor: 'pointer', 
                background: activeContact?.id === c.user.id ? 'var(--accent-primary)' : 'transparent', 
                color: activeContact?.id === c.user.id ? 'white' : 'var(--text-primary)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: activeContact?.id === c.user.id ? '2px solid var(--text-primary)' : '2px solid transparent',
                transform: activeContact?.id === c.user.id ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                <strong style={{ fontSize: '1rem' }}>{c.user.name}</strong>
                {c.unread > 0 && <span style={{ background: 'var(--dna-pink)', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '99px', fontWeight: 900 }}>{c.unread}</span>}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: activeContact?.id === c.user.id ? 0.9 : 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.lastMessage}
              </div>
            </div>
          ))}
          
          <div style={{ marginTop: '2rem', padding: '0 0.5rem' }}>
            <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 800 }}>My Students</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {students.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => loadConversation(s)} 
                  style={{ 
                    padding: '0.75rem 1rem', 
                    cursor: 'pointer', 
                    fontSize: '0.85rem', 
                    background: 'rgba(255,255,255,0.5)',
                    borderRadius: '12px',
                    border: '1px solid var(--bg-tertiary)',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🎓 {s.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.1)' }}>
        {activeContact ? (
          <>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.3)' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: 'var(--accent-primary)', 
                color: 'white',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '1.5rem',
                fontWeight: 900,
                border: '2px solid var(--text-primary)'
              }}>
                {activeContact.name.charAt(0)}
              </div>
              <div>
                <strong style={{ fontSize: '1.25rem', display: 'block', fontWeight: 900 }}>{activeContact.name}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Bio Student</span>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messages.map(m => {
                const isMe = m.sender.id !== activeContact.id
                return (
                  <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <div style={{ 
                      background: isMe ? 'var(--text-primary)' : 'white', 
                      color: isMe ? 'white' : 'var(--text-primary)',
                      padding: '1rem 1.25rem', 
                      borderRadius: isMe ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                      border: '2px solid var(--text-primary)',
                      boxShadow: '4px 4px 0 rgba(0,0,0,0.1)',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      lineHeight: 1.6
                    }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '6px', textAlign: isMe ? 'right' : 'left', fontWeight: 700 }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.5 }}>
                <MessagesIcon size={48} color="var(--text-secondary)" />
                <p style={{ marginTop: '1rem', fontWeight: 600 }}>Start your conversation with {activeContact.name}</p>
              </div>}
            </div>

            <div style={{ padding: '1.5rem 2rem', borderTop: '2px solid var(--text-primary)', background: 'rgba(255,255,255,0.3)' }}>
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  placeholder="Type your message here..." 
                  style={{ 
                    flex: 1, 
                    borderRadius: '16px', 
                    padding: '1rem 1.5rem',
                    background: 'white', 
                    border: '2px solid var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
                <button type="submit" className="btn-primary" style={{ borderRadius: '16px', padding: '0 2rem', fontWeight: 900 }}>Send</button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)' }}>
            <MessagesIcon size={120} color="rgba(0,0,0,0.05)" />
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2rem' }}>Student Inbox</h2>
            <p style={{ fontWeight: 600 }}>Select a student to start chatting.</p>
          </div>
        )}
      </div>
      <RoughFilter />
    </div>
  )
}
