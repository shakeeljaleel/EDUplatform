'use client'

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const initialRoleParam = searchParams.get('role')?.toUpperCase() || 'STUDENT'
  const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'PARENT'>(
    ['STUDENT', 'TEACHER', 'PARENT'].includes(initialRoleParam) ? (initialRoleParam as any) : 'STUDENT'
  )

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  
  // Role-specific fields
  const [subjectArea, setSubjectArea] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [bio, setBio] = useState('')
  const [teacherWizardStep, setTeacherWizardStep] = useState<1 | 2>(1)

  const [studentEmail, setStudentEmail] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<any | null>(null)

  // Real-time inline field validations
  const inlineErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    if (name && name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Please enter a valid email address'
    if (password && password.length < 6) errs.password = 'Password must be at least 6 characters'
    if (confirm && confirm !== password) errs.confirm = 'Passwords do not match'
    return errs
  }, [name, email, password, confirm])

  const isValid = useMemo(() => {
    return name.trim().length >= 2 &&
           /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
           password.length >= 6 &&
           confirm === password &&
           Object.keys(inlineErrors).length === 0
  }, [name, email, password, confirm, inlineErrors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          subjectArea,
          qualifications,
          bio,
          studentEmail
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessData(data)
        if (role === 'STUDENT') {
          setTimeout(() => {
            router.push('/dashboard/student')
          }, 2000)
        }
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError('Network error during registration. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, hsl(142, 60%, 95%) 0%, hsl(200, 60%, 95%) 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(25px)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.8)'
      }}>
        {successData ? (
          <div style={{ textAlign: 'center' }} className="fade-in">
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Registration Successful!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {successData.message}
            </p>

            {role === 'STUDENT' && (
              <div style={{ padding: '1.25rem', background: 'var(--bg-accent)', borderRadius: '12px', border: '1px solid var(--accent-primary)', marginBottom: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>📋 Onboarding Checklist</h4>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>✓ Account created and verified</li>
                  <li>✓ Enrolled in default academic portal stream</li>
                  <li>⚡ Redirecting to your student dashboard in 2 seconds...</li>
                </ul>
              </div>
            )}

            {role === 'TEACHER' && (
              <div style={{ padding: '1.25rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid #d97706', marginBottom: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ fontWeight: 800, color: '#d97706', marginBottom: '0.5rem' }}>⏳ Approval Pending</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  A Super Admin has been notified of your registration in <strong>{subjectArea || 'General'}</strong>. You will be able to log in as soon as your account is reviewed.
                </p>
              </div>
            )}

            <Link href="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center', padding: '0.875rem', minHeight: '44px' }}>
              Proceed to Login →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Create Helix Account
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Join the bio-digital academic platform</p>
            </div>

            {/* ROLE SELECTION TABS */}
            <div style={{ display: 'flex', background: 'var(--bg-base)', padding: '4px', borderRadius: '14px', border: '2px solid var(--text-primary)', marginBottom: '1.75rem' }}>
              {[
                { id: 'STUDENT', label: '🎓 Student' },
                { id: 'TEACHER', label: '👩‍🏫 Teacher' },
                { id: 'PARENT', label: '👨‍👩‍👧 Parent' }
              ].map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id as any)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: role === r.id ? 'var(--accent-primary)' : 'transparent',
                    color: role === r.id ? 'white' : 'var(--text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '40px'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {error && (
              <div role="alert" style={{ padding: '0.875rem', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '10px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                🚫 {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* STEP 1 FIELDS FOR ALL ROLES */}
              {teacherWizardStep === 1 && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Full Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. Dr. Ayesha Khan" 
                      autoComplete="name"
                      style={{ minHeight: '44px', width: '100%' }}
                    />
                    {inlineErrors.name && <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>{inlineErrors.name}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Email Address</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="you@example.com" 
                      autoComplete="email"
                      style={{ minHeight: '44px', width: '100%' }}
                    />
                    {inlineErrors.email && <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>{inlineErrors.email}</span>}
                  </div>

                  {role === 'TEACHER' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Primary Subject Area</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        required 
                        value={subjectArea} 
                        onChange={e => setSubjectArea(e.target.value)} 
                        placeholder="e.g. Advanced Biology / Chemistry" 
                        style={{ minHeight: '44px', width: '100%' }}
                      />
                    </div>
                  )}

                  {role === 'PARENT' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Child's Student Email (Optional)</label>
                      <input 
                        type="email" 
                        className="input-field" 
                        value={studentEmail} 
                        onChange={e => setStudentEmail(e.target.value)} 
                        placeholder="child@student.com" 
                        style={{ minHeight: '44px', width: '100%' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>You can also link your child's profile anytime post sign-up.</span>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="Min. 6 characters" 
                      autoComplete="new-password"
                      style={{ minHeight: '44px', width: '100%' }}
                    />
                    {inlineErrors.password && <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>{inlineErrors.password}</span>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Confirm Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      required 
                      value={confirm} 
                      onChange={e => setConfirm(e.target.value)} 
                      placeholder="Repeat password" 
                      autoComplete="new-password"
                      style={{ minHeight: '44px', width: '100%' }}
                    />
                    {inlineErrors.confirm && <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>{inlineErrors.confirm}</span>}
                  </div>

                  {role === 'TEACHER' ? (
                    <button 
                      type="button" 
                      onClick={() => setTeacherWizardStep(2)}
                      disabled={!isValid}
                      className="btn-primary" 
                      style={{ marginTop: '0.5rem', minHeight: '44px', width: '100%' }}
                    >
                      Next: Profile Details (Step 2/2) →
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={loading || !isValid} 
                      style={{ marginTop: '0.5rem', minHeight: '44px', width: '100%' }}
                    >
                      {loading ? 'Creating Account...' : `Register as ${role.charAt(0) + role.slice(1).toLowerCase()} →`}
                    </button>
                  )}
                </>
              )}

              {/* STEP 2 TEACHER WIZARD */}
              {role === 'TEACHER' && teacherWizardStep === 2 && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)' }}>Teacher Profile Wizard (Optional)</span>
                    <button 
                      type="button" 
                      onClick={() => setTeacherWizardStep(1)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      ← Back to Basic Info
                    </button>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Academic Qualifications</label>
                    <textarea 
                      className="input-field" 
                      rows={3} 
                      value={qualifications} 
                      onChange={e => setQualifications(e.target.value)} 
                      placeholder="e.g. Ph.D. in Cellular Biology, B.Ed."
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Instructor Bio</label>
                    <textarea 
                      className="input-field" 
                      rows={3} 
                      value={bio} 
                      onChange={e => setBio(e.target.value)} 
                      placeholder="Brief introduction for your future students..."
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={loading || !isValid} 
                      style={{ flex: 1, minHeight: '44px' }}
                    >
                      {loading ? 'Submitting...' : 'Submit Teacher Application'}
                    </button>
                  </div>
                </div>
              )}

            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Already registered?{' '}
              <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}>Sign in here</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', fontWeight: 800 }}>Loading registration form...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
