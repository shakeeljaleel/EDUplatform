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
      width="28"
      height="40"
      viewBox="0 0 28 40"
      xmlns="http://www.w3.org/2000/svg"
      className={`dna-helix-logo ${className}`}
      style={style}
      aria-label="DNA Helix Logo"
      role="img"
    >
      <path d="M4,2 C4,2 24,8 24,12 C24,16 4,22 4,26 C4,30 24,36 24,38" stroke="#00c853" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M24,2 C24,2 4,8 4,12 C4,16 24,22 24,26 C24,30 4,36 4,38" stroke="#aa00ff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <line x1="4" y1="7" x2="24" y2="7" stroke="#ffd600" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="12" x2="14" y2="12" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round"/>
      <line x1="4" y1="17" x2="24" y2="17" stroke="#ff6d00" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="22" x2="24" y2="22" stroke="#f50057" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="27" x2="24" y2="27" stroke="#00c853" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="33" x2="24" y2="33" stroke="#ffd600" strokeWidth="2" strokeLinecap="round"/>
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
