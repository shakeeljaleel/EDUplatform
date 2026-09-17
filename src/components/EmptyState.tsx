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
  containerStyle?: React.CSSProperties
}

export default function EmptyState({
  icon = <Sparkles size={36} color="var(--accent-primary)" />,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  containerStyle
}: EmptyStateProps) {
  return (
    <div style={{
      padding: '3.5rem 2rem',
      textAlign: 'center',
      background: '#f0fdf4',
      borderRadius: '16px',
      border: '3px solid #1a1a2e',
      boxShadow: '5px 5px 0px #1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '1.5rem 0',
      ...containerStyle
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        border: '3px solid #1a1a2e',
        boxShadow: '3px 3px 0px #1a1a2e'
      }}>
        {icon}
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a2e', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem', fontWeight: 600 }}>
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 900,
            background: '#00c853',
            color: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '50px',
            boxShadow: '4px 4px 0px #1a1a2e',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && !actionHref && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 900,
            background: '#00c853',
            color: '#ffffff',
            border: '3px solid #1a1a2e',
            borderRadius: '50px',
            boxShadow: '4px 4px 0px #1a1a2e',
            cursor: 'pointer'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
