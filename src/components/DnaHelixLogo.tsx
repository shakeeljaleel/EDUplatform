'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  className?: string
  style?: React.CSSProperties
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, State> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("DnaHelixLogo render error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export function DnaHelixSvg({ className = '', style }: Props) {
  return (
    <svg
      viewBox="0 0 32 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`dna-helix-logo ${className}`}
      style={style}
      aria-label="DNA Helix Logo"
      role="img"
    >
      <defs>
        {/* Strand 1 Gradient: #00c853 (vivid green) to #00e5ff (cyan) */}
        <linearGradient id="strand1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00c853" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>

        {/* Strand 2 Gradient: #aa00ff (purple) to #f50057 (pink) */}
        <linearGradient id="strand2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#aa00ff" />
          <stop offset="100%" stopColor="#f50057" />
        </linearGradient>
      </defs>

      {/* Connecting Rungs with alternating vivid colors */}
      {/* Rung 1: Yellow #ffd600 */}
      <line x1="10" y1="7" x2="22" y2="7" stroke="#ffd600" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      {/* Rung 2: Orange #ff6d00 */}
      <line x1="7" y1="13" x2="25" y2="13" stroke="#ff6d00" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
      {/* Rung 3: Cyan #00e5ff */}
      <line x1="10" y1="19" x2="22" y2="19" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      {/* Rung 4: Mint #69f0ae */}
      <line x1="10" y1="25" x2="22" y2="25" stroke="#69f0ae" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      {/* Rung 5: Yellow #ffd600 */}
      <line x1="7" y1="31" x2="25" y2="31" stroke="#ffd600" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
      {/* Rung 6: Orange #ff6d00 */}
      <line x1="10" y1="37" x2="22" y2="37" stroke="#ff6d00" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />

      {/* Rung base pair nodes (small vivid dots at rung ends) */}
      <circle cx="10" cy="7" r="1.5" fill="#ffd600" />
      <circle cx="22" cy="7" r="1.5" fill="#ffd600" />
      <circle cx="7" cy="13" r="1.5" fill="#ff6d00" />
      <circle cx="25" cy="13" r="1.5" fill="#ff6d00" />
      <circle cx="10" cy="19" r="1.5" fill="#00e5ff" />
      <circle cx="22" cy="19" r="1.5" fill="#00e5ff" />
      <circle cx="10" cy="25" r="1.5" fill="#69f0ae" />
      <circle cx="22" cy="25" r="1.5" fill="#69f0ae" />
      <circle cx="7" cy="31" r="1.5" fill="#ffd600" />
      <circle cx="25" cy="31" r="1.5" fill="#ffd600" />
      <circle cx="10" cy="37" r="1.5" fill="#ff6d00" />
      <circle cx="22" cy="37" r="1.5" fill="#ff6d00" />

      {/* Strand 1 (Green to Cyan) */}
      <path
        d="M 16,1 C 28,5 28,15 16,20 C 4,25 4,35 16,39"
        stroke="url(#strand1Gradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Strand 2 (Purple to Pink) */}
      <path
        d="M 16,1 C 4,5 4,15 16,20 C 28,25 28,35 16,39"
        stroke="url(#strand2Gradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function DnaHelixLogo(props: Props) {
  const fallback = (
    <span
      className={`dna-helix-logo-fallback ${props.className || ''}`}
      style={{ fontSize: '1.75rem', lineHeight: 1, display: 'inline-block', ...props.style }}
    >
      🧬
    </span>
  )

  return (
    <ErrorBoundary fallback={fallback}>
      <DnaHelixSvg {...props} />
    </ErrorBoundary>
  )
}
