'use client'

interface StatusBadgeProps {
  status: string
  rejectionReason?: string | null
  style?: React.CSSProperties
  size?: 'sm' | 'md' | 'lg'
  useFullLabel?: boolean
}

export function getStatusBadgeInfo(status: string, useFullLabel = false) {
  const norm = (status || '').toLowerCase()
  switch (norm) {
    case 'pending':
    case 'awaiting approval':
      return {
        label: 'Awaiting approval',
        bg: '#ffab00', // solid amber
        color: '#ffffff',
        border: '2px solid #1a1a2e',
        shadow: '2px 2px 0px #1a1a2e'
      }
    case 'admin_approved':
    case 'teacher review':
    case 'awaiting teacher confirmation':
      return {
        label: useFullLabel ? 'Awaiting teacher confirmation' : 'Teacher review',
        bg: '#2979ff', // solid blue
        color: '#ffffff',
        border: '2px solid #1a1a2e',
        shadow: '2px 2px 0px #1a1a2e'
      }
    case 'active':
    case 'approved':
      return {
        label: 'Active',
        bg: '#00c853', // solid green
        color: '#ffffff',
        border: '2px solid #1a1a2e',
        shadow: '2px 2px 0px #1a1a2e'
      }
    case 'rejected':
    case 'not approved':
      return {
        label: 'Not approved',
        bg: '#f50057', // solid red
        color: '#ffffff',
        border: '2px solid #1a1a2e',
        shadow: '2px 2px 0px #1a1a2e'
      }
    default:
      return {
        label: status || 'Pending',
        bg: '#64748b',
        color: '#ffffff',
        border: '2px solid #1a1a2e',
        shadow: '2px 2px 0px #1a1a2e'
      }
  }
}

export default function StatusBadge({ status, style, size = 'sm', useFullLabel = false }: StatusBadgeProps) {
  const info = getStatusBadgeInfo(status, useFullLabel)

  const padding = size === 'sm' ? '0.2rem 0.65rem' : size === 'md' ? '0.35rem 0.85rem' : '0.5rem 1.15rem'
  const fontSize = size === 'sm' ? '0.75rem' : size === 'md' ? '0.85rem' : '0.95rem'

  return (
    <span
      style={{
        background: info.bg,
        color: info.color,
        border: info.border,
        boxShadow: info.shadow,
        borderRadius: '50px',
        padding,
        fontSize,
        fontWeight: 900,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {info.label}
    </span>
  )
}
