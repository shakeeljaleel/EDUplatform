'use client'

import { useState, useEffect } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

let toastListener: ((toast: ToastMessage) => void) | null = null

export function showToast(text: string, type: 'success' | 'error' | 'info' = 'success') {
  if (toastListener) {
    toastListener({ id: Math.random().toString(), type, text })
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    toastListener = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 3000)
    }
    return () => {
      toastListener = null
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '1.25rem',
      right: '1.25rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      pointerEvents: 'none'
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            pointerEvents: 'auto',
            padding: '0.875rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            background: t.type === 'success' ? '#059669' : t.type === 'error' ? '#dc2626' : '#2563eb',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
