'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      const role = data.role
      if (role === 'SUPER_ADMIN') router.push('/dashboard/super-admin')
      else if (role === 'TEACHER')   router.push('/dashboard/teacher')
      else if (role === 'STUDENT')   router.push('/dashboard/student')
      else if (role === 'PARENT')    router.push('/dashboard/parent')
      else if (role === 'ASSISTANT') router.push('/dashboard/assistant')
      else router.push('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      
      {/* ── Background Particles ───────────────────────── */}
      <div className="bio-particle" style={{ width: '600px', height: '600px', background: 'var(--accent-primary)', top: '-10%', left: '-10%', opacity: 0.2 }}></div>
      <div className="bio-particle" style={{ width: '500px', height: '500px', background: 'var(--dna-blue)', bottom: '-10%', right: '-10%', opacity: 0.15 }}></div>
      <div className="bio-particle" style={{ width: '400px', height: '400px', background: 'var(--dna-purple)', top: '30%', right: '10%', opacity: 0.1, animationDelay: '-7s' }}></div>

      <div className="dna-container" style={{ top: '10%', right: '10%', opacity: 0.2 }}>
        {[...Array(8)].map((_, i) => <div key={i} className="dna-dot"></div>)}
      </div>
      <div className="dna-container" style={{ bottom: '10%', left: '10%', opacity: 0.2, transform: 'rotate(180deg)' }}>
        {[...Array(8)].map((_, i) => <div key={i} className="dna-dot"></div>)}
      </div>

      {/* ── Left panel — branding ───────────────────────── */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem',
        zIndex: 10
      }}>
        <div style={{ maxWidth: '440px', textAlign: 'center', animation: 'slide-up 0.8s var(--ease-out-expo)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '4.5rem', 
            fontWeight: 900, 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--dna-blue))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(4px 4px 0 var(--text-primary))',
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
        width: '560px',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem',
        zIndex: 20
      }}>
        <div style={{ width: '100%', maxWidth: '380px', animation: 'slide-up 1s var(--ease-out-expo)' }}>
          <div style={{ marginBottom: '3rem', animation: 'slide-up 0.8s var(--ease-out-expo)', position: 'relative' }}>
            <div className="dna-container" style={{ position: 'absolute', right: '0', top: '-20px', height: '100px', opacity: 0.15 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="dna-dot"></div>)}
            </div>
            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>Secure Login</h4>
            <h2 style={{ marginBottom: '0.5rem' }}>Welcome Back</h2>
            <p>Access your academic portal</p>
          </div>

          {error && (
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(239, 68, 68, 0.05)', 
              border: '1px solid rgba(239, 68, 68, 0.1)', 
              borderRadius: '12px', 
              color: 'var(--error)', 
              fontSize: '0.875rem', 
              fontWeight: 600,
              marginBottom: '2rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <span>🚫</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</label>
              <input type="email" className="input-field" placeholder="name@school.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Password</label>
              <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '1.25rem', marginTop: '1rem' }}>
              {loading ? 'Authenticating...' : 'Sign In to Portal →'}
            </button>
          </form>

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>New educator joining us?</p>
            <a href="/register" style={{ fontWeight: 800, color: 'var(--accent-primary)', textDecoration: 'underline' }}>Request Teacher Credentials</a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-20px) rotate(-2deg); }
        }
        @media (max-width: 1024px) {
          div[style*="flex: 1"] { display: none; }
          div[style*="width: 560px"] { width: 100% !important; border-left: none; }
        }
      `}</style>
    </div>
  )
}
