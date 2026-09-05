'use client'

import { useState, useEffect } from 'react'
import { RoughFilter } from './HandDrawnIcons'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.notifications.filter((n: any) => !n.read).length)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const markRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleDropdown = () => {
    if (!show) markRead()
    setShow(!show)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={toggleDropdown}
        className="sketch-button-v2" 
        style={{ 
          width: '52px', height: '52px', padding: 0, borderRadius: '14px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', background: 'white', color: 'var(--text-primary)',
          boxShadow: unreadCount > 0 ? '4px 4px 0 var(--error)' : '4px 4px 0 var(--text-primary)'
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{ 
            position: 'absolute', top: '-6px', right: '-6px', 
            background: 'var(--error)', color: 'white', 
            fontSize: '0.7rem', fontWeight: 900, 
            width: '24px', height: '24px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--text-primary)',
            boxShadow: '2px 2px 0 var(--text-primary)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {show && (
        <>
          <RoughFilter />
          <div style={{ 
            position: 'absolute', top: '70px', right: 0, 
            width: '380px', background: 'white', 
            boxShadow: '12px 12px 0 var(--text-primary)', borderRadius: '20px', 
            border: '3px solid var(--text-primary)', zIndex: 100,
            padding: '2rem', maxHeight: '500px', overflowY: 'auto',
            filter: 'url(#rough-edge)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--bg-tertiary)', paddingBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>Roadmap Alerts</h4>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{unreadCount} New</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notifications.map(n => (
                <div key={n.id} style={{ 
                  padding: '1.25rem', borderRadius: '16px', 
                  backgroundColor: n.read ? 'transparent' : 'rgba(16, 185, 129, 0.04)',
                  border: n.read ? '2px solid var(--bg-tertiary)' : '2px solid var(--accent-primary)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}>
                  {!n.read && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }}></div>
                  )}
                  <div style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 600 }}>{n.message}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    {new Date(n.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌿</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700 }}>
                    Clear horizon. No new alerts.
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* Backdrop to close */}
          <div 
            onClick={() => setShow(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'transparent' }}
          />
        </>
      )}
    </div>
  )
}
