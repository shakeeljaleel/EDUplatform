'use client'

import { useState, useEffect, useRef } from 'react'

interface SecureVideoPlayerProps {
  recordingId: string
  recordingTitle: string
  streamUrl: string
  studentName: string
  studentEmail: string
  onClose: () => void
}

export default function SecureVideoPlayer({
  recordingId,
  recordingTitle,
  streamUrl,
  studentName,
  studentEmail,
  onClose
}: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [maxReached, setMaxReached] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  
  // Security overlays
  const [devToolsOpen, setDevToolsOpen] = useState(false)
  const [focusLost, setFocusLost] = useState(false)
  const [watermarkPos, setWatermarkPos] = useState({ top: 30, left: 30 })

  // 1. Initial Progress & Terms Load
  useEffect(() => {
    fetchProgress()
  }, [recordingId])

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/recordings/${recordingId}/progress`)
      if (res.ok) {
        const data = await res.json()
        setMaxReached(data.max_reached_seconds || 0)
        setIsCompleted(data.is_completed || false)
        setTermsAccepted(data.terms_accepted)
        
        // Start from last session position or max reached
        const startPos = data.last_session_position_seconds || data.max_reached_seconds || 0
        if (videoRef.current) {
          videoRef.current.currentTime = startPos
          setCurrentTime(startPos)
        }
      }
    } catch (e) {
      console.error('Progress fetch error:', e)
    }
  }

  // 2. Terms Acceptance
  const handleAcceptTerms = async () => {
    try {
      const res = await fetch(`/api/recordings/${recordingId}/terms-accept`, { method: 'POST' })
      if (res.ok) setTermsAccepted(true)
    } catch (e) {
      console.error('Terms accept error:', e)
    }
  }

  // 3. Dynamic Moving Watermark (Moves every 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      const top = Math.floor(15 + Math.random() * 60)
      const left = Math.floor(15 + Math.random() * 60)
      setWatermarkPos({ top, left })
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // 4. DevTools Detection
  useEffect(() => {
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160
      const heightThreshold = window.outerHeight - window.innerHeight > 160
      if (widthThreshold || heightThreshold) {
        setDevToolsOpen(true)
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
          setIsPlaying(false)
        }
      } else {
        setDevToolsOpen(false)
      }
    }

    const interval = setInterval(checkDevTools, 1000)
    window.addEventListener('resize', checkDevTools)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', checkDevTools)
    }
  }, [])

  // 5. Anti-Inspection Keyboard Shortcut Blocking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block DevTools & View Source shortcuts
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault()
        return false
      }

      // Block Rewind Keys (Left Arrow, J)
      if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        return false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 6. Focus & Visibility Loss Detection
  useEffect(() => {
    let focusLostTime = 0

    const handleVisibilityChange = () => {
      if (document.hidden) {
        focusLostTime = Date.now()
        setFocusLost(true)
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
          setIsPlaying(false)
        }
      }
    }

    const handleBlur = () => {
      if (!document.hidden) {
        focusLostTime = Date.now()
        setFocusLost(true)
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
          setIsPlaying(false)
        }
      }
    }

    const handleFocus = () => {
      if (focusLostTime > 0) {
        const durationAway = Math.floor((Date.now() - focusLostTime) / 1000)
        if (durationAway > 1) {
          fetch(`/api/recordings/${recordingId}/focus-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ durationAway })
          }).catch(() => {})
        }
        focusLostTime = 0
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [recordingId])

  // 7. Monotonic Seek Guard & Live Sync (Every 10s)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const checkRewindGuard = () => {
      // Clamping: never allow currentTime to be less than maxReached
      if (video.currentTime < maxReached) {
        video.currentTime = maxReached
        setCurrentTime(maxReached)
      } else {
        setCurrentTime(video.currentTime)
      }
    }

    const guardInterval = setInterval(checkRewindGuard, 500)

    // Sync position to server every 10 seconds
    const syncInterval = setInterval(() => {
      if (isPlaying && video.currentTime > 0) {
        syncProgress(video.currentTime)
      }
    }, 10000)

    return () => {
      clearInterval(guardInterval)
      clearInterval(syncInterval)
    }
  }, [maxReached, isPlaying])

  const syncProgress = async (posSeconds: number) => {
    try {
      const res = await fetch(`/api/recordings/${recordingId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_position_seconds: Math.floor(posSeconds) })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.max_reached_seconds > maxReached) {
          setMaxReached(data.max_reached_seconds)
        }
        if (data.is_completed) {
          setIsCompleted(true)
        }
      }
    } catch (e) {
      console.error('Progress sync error:', e)
    }
  }

  // 8. Custom Controls Handling
  const togglePlay = () => {
    if (devToolsOpen || focusLost || isCompleted) return
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
      syncProgress(videoRef.current.currentTime)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration === 0 || isCompleted) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const targetSeconds = (clickX / rect.width) * duration

    // Clamping: only allow seeking forward beyond maxReached
    if (targetSeconds >= maxReached) {
      videoRef.current.currentTime = targetSeconds
      setCurrentTime(targetSeconds)
      syncProgress(targetSeconds)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const lockedPercent = duration > 0 ? (maxReached / duration) * 100 : 0
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="card fade-in" style={{ padding: '1.5rem', background: '#020617', color: 'white', borderRadius: '20px', position: 'relative' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🔒 PROTECTED STREAM • FORWARD-ONLY
          </span>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', marginTop: '2px' }}>{recordingTitle}</h3>
        </div>
        <button onClick={onClose} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
          Close Player ✕
        </button>
      </div>

      {/* Progress Information Banner */}
      <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {isCompleted ? (
            <span style={{ color: '#10b981', fontWeight: 800 }}>✅ You have completed this recording. Replaying is not permitted.</span>
          ) : (
            <span>You have watched <strong>{formatTime(maxReached)}</strong> of <strong>{formatTime(duration)}</strong>. Previously watched portions cannot be replayed.</span>
          )}
        </div>
        {maxReached > 0 && !isCompleted && (
          <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 700 }}>
            Resumed at {formatTime(currentTime)}
          </span>
        )}
      </div>

      {/* Video Container with Watermark & Security Overlays */}
      <div 
        onContextMenu={e => e.preventDefault()}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          background: '#000000',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          userSelect: 'none'
        }}
      >
        {/* HTML5 Video Element without native controls */}
        <video
          ref={videoRef}
          src={streamUrl}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => {
            setIsPlaying(false)
            setIsCompleted(true)
            if (videoRef.current) syncProgress(videoRef.current.duration)
          }}
          controlsList="nodownload no-remote-playback"
          disablePictureInPicture
        />

        {/* ── Dynamic Moving Watermark Overlay ───────────────── */}
        <div
          style={{
            position: 'absolute',
            top: `${watermarkPos.top}%`,
            left: `${watermarkPos.left}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            opacity: 0.35,
            color: '#ffffff',
            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)',
            textAlign: 'center',
            zIndex: 10,
            transition: 'top 1s ease-in-out, left 1s ease-in-out'
          }}
        >
          <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.05em' }}>{studentName}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{studentEmail}</div>
          <div style={{ fontSize: '0.65rem', marginTop: '2px', color: '#f87171' }}>
            Unauthorised sharing is a violation of your enrolment agreement.
          </div>
        </div>

        {/* ── Terms Acceptance Modal ───────────────── */}
        {!termsAccepted && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 50, textAlign: 'center' }}>
            <div style={{ maxWidth: '420px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📜</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Enrolment & Honor Agreement</h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px' }}>
                "I confirm that this recording is for my personal study only. I will not share, distribute, or reproduce this content in any form. Violation may result in immediate removal from the programme."
              </p>
              <button onClick={handleAcceptTerms} className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}>
                I Agree & Start Watching →
              </button>
            </div>
          </div>
        )}

        {/* ── DevTools Detection Modal ───────────────── */}
        {devToolsOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 60, textAlign: 'center' }}>
            <div style={{ maxWidth: '400px', color: 'white' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛑</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.5rem' }}>DevTools Detected</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.95 }}>
                Developer tools are not permitted while viewing recordings. Please close them to continue playback.
              </p>
            </div>
          </div>
        )}

        {/* ── Tab Focus Loss Modal ───────────────── */}
        {focusLost && !devToolsOpen && termsAccepted && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 40, textAlign: 'center' }}>
            <div style={{ maxWidth: '380px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏸️</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Playback Paused</h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                Playback paused because you switched away. Press play to resume.
              </p>
              <button onClick={() => { setFocusLost(false); togglePlay(); }} className="btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}>
                Resume Playback ▶
              </button>
            </div>
          </div>
        )}

        {/* ── Completion Locked Modal ───────────────── */}
        {isCompleted && termsAccepted && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 35, textAlign: 'center' }}>
            <div style={{ maxWidth: '380px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.5rem', color: '#10b981' }}>Recording Completed</h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                You have completed this recording. Replaying is not permitted per institution policy.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── CUSTOM CLAMPED PROGRESS BAR (2 Visual Zones) ────── */}
      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 700 }}>
          <span>{formatTime(currentTime)}</span>
          <span style={{ color: '#64748b' }}>🔒 Locked Zone: 0:00 - {formatTime(maxReached)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div 
          onClick={handleSeek}
          style={{
            position: 'relative',
            width: '100%',
            height: '12px',
            background: '#1e293b',
            borderRadius: '6px',
            cursor: isCompleted ? 'not-allowed' : 'pointer',
            overflow: 'hidden'
          }}
        >
          {/* Locked Zone (Grey) */}
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              width: `${lockedPercent}%`,
              background: '#475569',
              borderRight: '2px solid #0f172a'
            }}
            title="Already watched — Rewind restricted"
          />

          {/* Available Zone Scrubber Track (Emerald) */}
          <div 
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: `${lockedPercent}%`,
              width: `${Math.max(0, currentPercent - lockedPercent)}%`,
              background: '#10b981'
            }}
          />

          {/* Scrubber Handle */}
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: `${currentPercent}%`,
              transform: 'translate(-50%, -50%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 0 8px rgba(0,0,0,0.5)',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <button
          onClick={togglePlay}
          disabled={devToolsOpen || focusLost || isCompleted}
          className="btn-primary"
          style={{
            padding: '0.6rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 800,
            opacity: (devToolsOpen || focusLost || isCompleted) ? 0.5 : 1
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '1rem' }}>
          <span>🔒 Dynamic DRM Watermark Active</span>
          <span>⚡ Forward-Only Position Lock</span>
        </div>
      </div>
    </div>
  )
}
