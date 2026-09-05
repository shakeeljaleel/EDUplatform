'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Reset loading state when pathname or search parameters change
    setLoading(false)
  }, [pathname, searchParams])

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (
        anchor &&
        anchor.href &&
        anchor.target !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        anchor.origin === window.location.origin
      ) {
        const targetUrl = new URL(anchor.href)
        if (targetUrl.pathname !== window.location.pathname || targetUrl.search !== window.location.search) {
          setLoading(true)
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  if (!loading) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        zIndex: 99999,
        background: 'linear-gradient(90deg, #10b981, #3b82f6, #ec4899, #10b981)',
        backgroundSize: '200% 100%',
        animation: 'navBarPulse 1s infinite linear, navBarGrow 2s ease-out forwards',
        boxShadow: '0 0 10px rgba(16, 185, 129, 0.7)'
      }}
    >
      <style jsx global>{`
        @keyframes navBarPulse {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes navBarGrow {
          0% { width: 10%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  )
}
