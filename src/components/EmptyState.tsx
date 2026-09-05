import React from 'react'
import Link from 'next/link'
import { Sparkles } from '@/components/Icons'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export default function EmptyState({
  icon = <Sparkles size={36} color="var(--accent-primary)" />,
  title,
  description,
  actionLabel,
  actionHref,
  onAction
}: EmptyStateProps) {
  return (
    <div style={{
      padding: '3.5rem 2rem',
      textAlign: 'center',
      background: 'rgba(255, 255, 255, 0.8)',
      borderRadius: 'var(--radius-md)',
      border: '2px dashed var(--border-color, #e2e8f0)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '1.5rem 0'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'var(--bg-accent, #f0fdf4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        border: '1px solid var(--accent-primary)'
      }}>
        {icon}
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 800 }}>
          {actionLabel}
        </Link>
      )}

      {actionLabel && !actionHref && onAction && (
        <button onClick={onAction} className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 800 }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
