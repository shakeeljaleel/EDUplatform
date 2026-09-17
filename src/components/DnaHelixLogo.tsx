'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  className?: string
  style?: React.CSSProperties
  width?: number | string
  height?: number | string
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

export function DnaHelixSvg({ className = '', style, width = 32, height = 44 }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 44"
      xmlns="http://www.w3.org/2000/svg"
      className={`dna-helix-logo ${className}`}
      style={style}
      aria-label="DNA Helix Logo"
      role="img"
    >
      {/* Strand 1: green to cyan sine wave */}
      <path
        d="M6,2 C10,6 22,6 26,10 C30,14 30,18 26,22 C22,26 10,26 6,30 C2,34 2,38 6,42"
        stroke="url(#s1)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Strand 2: purple to pink sine wave (opposite phase) */}
      <path
        d="M26,2 C22,6 10,6 6,10 C2,14 2,18 6,22 C10,26 22,26 26,30 C30,34 30,38 26,42"
        stroke="url(#s2)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Rungs connecting the two strands */}
      <line x1="7" y1="8" x2="25" y2="8" stroke="#ffd600" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="16" x2="16" y2="16" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" />
      <line x1="7" y1="22" x2="25" y2="22" stroke="#ff6d00" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="30" x2="25" y2="30" stroke="#f50057" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="36" x2="25" y2="36" stroke="#00c853" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c853" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
        <linearGradient id="s2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#aa00ff" />
          <stop offset="100%" stopColor="#f50057" />
        </linearGradient>
      </defs>
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
