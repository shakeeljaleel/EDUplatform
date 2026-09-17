'use client'

import { useState, useEffect } from 'react'
import { Bell } from './Icons'

function getLeftBorderColor(type: string = '', title: string = ''): string {
  const norm = (type + ' ' + title).toLowerCase()
  if (norm.includes('enroll') || norm.includes('enrol')) return '#00c853' // green
  if (norm.includes('assign')) return '#2979ff' // blue
  if (norm.includes('warn') || norm.includes('alert') || norm.includes('reject')) return '#f50057' // red
  return '#00c853'
}

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
        setNotifications(data.notifications || [])
        setUnreadCount((data.notifications || []).filter((n: any) => !n.read).length)
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

  const handleClearAll = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' })
      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleDropdown = () => {
    setShow(!show)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={toggleDropdown}
        className="notification-bell-btn" 
        aria-label="Notifications"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: '#ffffff',
          color: '#1a1a2e',
          border: '2px solid #1a1a2e',
          boxShadow: '3px 3px 0px #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <Bell size={20} color="#1a1a2e" />
        {unreadCount > 0 && (
          <span className="pulse-red-badge" style={{ 
            position: 'absolute', top: '-4px', right: '-4px', 
            background: '#f50057', color: 'white', 
            fontSize: '0.65rem', fontWeight: 900, 
            width: '20px', height: '20px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #ffffff',
            boxShadow: '0 0 6px rgba(245, 0, 87, 0.8)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {show && (
        <>
          <div style={{ 
            position: 'absolute', top: '56px', right: 0, 
            width: '380px', background: '#ffffff', 
            boxShadow: '8px 8px 0px #1a1a2e', borderRadius: '16px', 
            border: '3px solid #1a1a2e', zIndex: 1000,
            padding: '1.25rem', maxHeight: '520px', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1a1a2e', margin: 0 }}>Roadmap alerts</h4>
                {unreadCount > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#f50057', color: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '50px', border: '1.5px solid #1a1a2e' }}>
                    {unreadCount} New
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={markRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2979ff',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px'
                }}
              >
                Mark all as read
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map(n => {
                const borderColor = getLeftBorderColor(n.type, n.title)

                return (
                  <div key={n.id} style={{ 
                    padding: '0.85rem 1rem', borderRadius: '12px', 
                    backgroundColor: n.read ? '#ffffff' : '#f8fafc',
                    border: '2px solid #1a1a2e',
                    borderLeft: `6px solid ${borderColor}`,
                    boxShadow: '3px 3px 0px #1a1a2e',
                    position: 'relative'
                  }}>
                    {!n.read && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: '#2979ff', borderRadius: '50%' }}></div>
                    )}
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, marginBottom: '0.2rem', color: '#1a1a2e' }}>{n.title}</div>
                    <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.4, fontWeight: 600 }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', fontWeight: 800 }}>
                      {new Date(n.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}

              {notifications.length === 0 && (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌿</div>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                    Clear horizon. No new alerts.
                  </p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: '#ffffff',
                    color: '#dc2626',
                    border: '2px solid #dc2626',
                    boxShadow: '3px 3px 0px #dc2626',
                    borderRadius: '50px',
                    padding: '0.4rem 1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Backdrop to close */}
          <div 
            onClick={() => setShow(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'transparent' }}
          />
        </>
      )}
    </div>
  )
}
