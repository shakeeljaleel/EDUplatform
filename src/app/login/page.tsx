'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DnaHelixLogo from '@/components/DnaHelixLogo'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const reason = searchParams.get('reason')
  const initialError = (reason === 'forced_logout' || reason === 'session_invalidated')
    ? 'Your account was signed in on another device. You have been logged out.'
    : ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [infoMessage, setInfoMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)

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
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred during sign in.')
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
    } catch {
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
              letterSpacing: '-0.06em',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <DnaHelixLogo width={40} height={52} style={{ width: '40px', height: '52px' }} />
              <span style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--dna-blue))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                HELIX
              </span>
            </h1>
            <p style={{ fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.5rem', letterSpacing: '0.05em', fontSize: '0.85rem' }}>
              Bio-Digital Academic OS
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🧬', text: 'AI-Powered Paper Grading', color: 'var(--dna-pink)' },
              { icon: '🎮', text: 'Live Buzzer Class Challenges', color: 'var(--dna-purple)' },
              { icon: '🛡️', text: 'Secure Anti-Share Class Vault', color: 'var(--dna-blue)' },
            ].map((f, i) => (
              <div 
                key={i} 
                className="login-feature-card" 
                style={{ 
                  padding: '1.25rem 1.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem',
                  borderLeft: `6px solid ${f.color}`,
                  borderTop: '3px solid #1a1a2e',
                  borderRight: '3px solid #1a1a2e',
                  borderBottom: '3px solid #1a1a2e',
                  borderRadius: '16px',
                  boxShadow: '5px 5px 0px #1a1a2e',
                  background: '#ffffff',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{f.icon}</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1a1a2e' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ────────────────────── */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        background: '#ffffff',
        borderLeft: '3px solid #1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        zIndex: 20
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h4 style={{ color: '#00c853', marginBottom: '0.5rem', fontSize: '0.875rem', letterSpacing: '0.05em', fontWeight: 800 }}>
              Secure portal access
            </h4>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.25rem', color: '#1a1a2e' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to access your academic dashboard</p>
          </div>

          {infoMessage && (
            <div style={{ 
              padding: '0.875rem 1rem', 
              background: 'rgba(16, 185, 129, 0.08)', 
              border: '2px solid #1a1a2e', 
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
              border: '2px solid #1a1a2e', 
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
              <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: '#1a1a2e' }}>Email Address</label>
              <input 
                id="login-email"
                type="email" 
                className="login-comic-input" 
                placeholder="name@school.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                autoComplete="email"
                required 
                style={{
                  minHeight: '46px',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #1a1a2e',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="login-password" style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1a1a2e' }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)}
                  style={{ background: 'none', border: 'none', color: '#2979ff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                id="login-password"
                type="password" 
                className="login-comic-input" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                autoComplete="current-password"
                required 
                style={{
                  minHeight: '46px',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #1a1a2e',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              />
            </div>

            <button 
              type="submit" 
              className="login-submit-btn"
              disabled={loading} 
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '0.875rem',
                marginTop: '0.5rem',
                fontSize: '1rem',
                fontWeight: 900,
                color: '#ffffff',
                background: '#00c853',
                border: '3px solid #1a1a2e',
                borderRadius: '50px',
                boxShadow: '4px 4px 0px #1a1a2e',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Registration Links */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Don&apos;t have an account yet?</p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a href="/register?role=student" style={{ fontWeight: 700, color: '#2979ff', fontSize: '0.875rem', textDecoration: 'none' }}>Student Register</a>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
              <a href="/register?role=teacher" style={{ fontWeight: 700, color: '#2979ff', fontSize: '0.875rem', textDecoration: 'none' }}>Teacher Application</a>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>|</span>
              <a href="/register?role=parent" style={{ fontWeight: 700, color: '#2979ff', fontSize: '0.875rem', textDecoration: 'none' }}>Parent Portal</a>
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
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem', position: 'relative', border: '3px solid #1a1a2e', borderRadius: '16px', boxShadow: '5px 5px 0px #1a1a2e' }}>
            <button 
              onClick={() => { setShowForgot(false); setForgotStatus(null); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#1a1a2e', fontWeight: 800 }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#1a1a2e' }}>Reset Password</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Enter your email address and we&apos;ll process a password reset request.
            </p>

            {forgotStatus && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600,
                background: forgotStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: forgotStatus.type === 'success' ? '#059669' : '#dc2626',
                border: `2px solid ${forgotStatus.type === 'success' ? '#059669' : '#dc2626'}`
              }}>
                {forgotStatus.message}
              </div>
            )}

            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem', color: '#1a1a2e' }}>Account Email</label>
                <input 
                  type="email" 
                  className="login-comic-input" 
                  required 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)} 
                  placeholder="your@email.com" 
                  style={{
                    minHeight: '44px',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '2px solid #1a1a2e',
                    outline: 'none'
                  }}
                />
              </div>
              <button 
                type="submit" 
                className="login-submit-btn" 
                disabled={forgotLoading}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: '#00c853',
                  border: '3px solid #1a1a2e',
                  borderRadius: '50px',
                  boxShadow: '4px 4px 0px #1a1a2e',
                  cursor: forgotLoading ? 'not-allowed' : 'pointer'
                }}
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
        .login-feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 7px 7px 0px #1a1a2e !important;
        }
        .login-comic-input:focus {
          border-color: #00c853 !important;
          box-shadow: 0 0 0 3px rgba(0, 200, 83, 0.2) !important;
        }
        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 6px 6px 0px #1a1a2e !important;
        }
        .login-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow: 2px 2px 0px #1a1a2e !important;
        }
        @media (max-width: 1024px) {
          .desktop-only-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
