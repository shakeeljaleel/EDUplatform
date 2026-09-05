'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason === 'forced_logout' || reason === 'session_invalidated') {
      setError('Your account was signed in on another device. You have been logged out.')
    }
  }, [searchParams])

  useEffect(() => {
    // Prefetch main role dashboards on mount for instant navigation after login
    router.prefetch('/dashboard/student')
    router.prefetch('/dashboard/teacher')
    router.prefetch('/dashboard/parent')
    router.prefetch('/dashboard/super-admin')
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfoMessage('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed. Please check your credentials.')

      const role = data.role || data.user?.role
      let target = '/'
      if (role === 'SUPER_ADMIN') target = '/dashboard/super-admin'
      else if (role === 'TEACHER')   target = '/dashboard/teacher'
      else if (role === 'STUDENT')   target = '/dashboard/student'
      else if (role === 'PARENT')    target = '/dashboard/parent'
      else if (role === 'ASSISTANT') target = '/dashboard/assistant'

      window.location.href = target
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotStatus(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setForgotStatus({ type: 'success', message: data.message || 'Instructions to reset your password have been sent to your email.' })
      } else {
        setForgotStatus({ type: 'error', message: data.error || 'Failed to request password reset.' })
      }
    } catch (err) {
      setForgotStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden', background: 'var(--bg-base)' }}>
      
      {/* ── Background Particles ───────────────────────── */}
      <div className="bio-particle" style={{ width: '600px', height: '600px', background: 'var(--accent-primary)', top: '-10%', left: '-10%', opacity: 0.15 }}></div>
      <div className="bio-particle" style={{ width: '500px', height: '500px', background: 'var(--dna-blue)', bottom: '-10%', right: '-10%', opacity: 0.12 }}></div>

      {/* ── Left panel — branding (hidden on mobile) ───────────────────────── */}
      <div className="desktop-only-left-panel" style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        zIndex: 10
      }}>
        <div style={{ maxWidth: '440px', textAlign: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 style={{ 
              fontSize: '4.5rem', 
              fontWeight: 900, 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--dna-blue))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.06em',
              lineHeight: 1
            }}>
              HELIX
            </h1>
            <p style={{ fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem' }}>
              Bio-Digital Academic OS
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🧬', text: 'AI-Powered Paper Grading', color: 'var(--dna-pink)' },
              { icon: '🎮', text: 'Live Buzzer Class Challenges', color: 'var(--dna-purple)' },
              { icon: '🛡️', text: 'Secure Anti-Share Class Vault', color: 'var(--dna-blue)' },
            ].map((f, i) => (
              <div key={i} className="card" style={{ 
                padding: '1.25rem 1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1.25rem',
                borderLeft: `6px solid ${f.color}`,
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '1.75rem' }}>{f.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ────────────────────── */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        zIndex: 20
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Secure Portal Access</h4>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.25rem' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to access your academic dashboard</p>
          </div>

          {infoMessage && (
            <div style={{ 
              padding: '0.875rem 1rem', 
              background: 'rgba(16, 185, 129, 0.08)', 
              border: '1px solid rgba(16, 185, 129, 0.25)', 
              borderRadius: '12px', 
              color: '#059669', 
              fontSize: '0.875rem', 
              fontWeight: 600,
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <span>📩</span> <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div role="alert" style={{ 
              padding: '0.875rem 1rem', 
              background: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              borderRadius: '12px', 
              color: '#dc2626', 
              fontSize: '0.875rem', 
              fontWeight: 600,
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <span>🚫</span> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</label>
              <input 
                id="login-email"
                type="email" 
                className="input-field" 
                placeholder="name@school.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                autoComplete="email"
                required 
                style={{ minHeight: '46px', width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '10px' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="login-password" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                id="login-password"
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                autoComplete="current-password"
                required 
                style={{ minHeight: '46px', width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '10px' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading} 
              style={{ width: '100%', minHeight: '48px', padding: '0.875rem', marginTop: '0.5rem', fontSize: '1rem', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                  Signing in...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          {/* Registration Links */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Don't have an account yet?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="/register?role=student" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.875rem' }}>Student Register</a>
              <span style={{ color: 'var(--text-secondary)' }}>•</span>
              <a href="/register?role=teacher" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.875rem' }}>Teacher Application</a>
              <span style={{ color: 'var(--text-secondary)' }}>•</span>
              <a href="/register?role=parent" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.875rem' }}>Parent Portal</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ────────────────────── */}
      {showForgot && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => { setShowForgot(false); setForgotStatus(null); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Reset Password</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Enter your email address and we'll process a password reset request.
            </p>

            {forgotStatus && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600,
                background: forgotStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: forgotStatus.type === 'success' ? '#059669' : '#dc2626',
                border: `1px solid ${forgotStatus.type === 'success' ? '#059669' : '#dc2626'}`
              }}>
                {forgotStatus.message}
              </div>
            )}

            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Account Email</label>
                <input 
                  type="email" 
                  className="input-field" 
                  required 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)} 
                  placeholder="your@email.com" 
                  style={{ minHeight: '44px', width: '100%' }}
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={forgotLoading}
                style={{ width: '100%', minHeight: '44px', padding: '0.75rem' }}
              >
                {forgotLoading ? 'Processing...' : 'Send Reset Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .desktop-only-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
