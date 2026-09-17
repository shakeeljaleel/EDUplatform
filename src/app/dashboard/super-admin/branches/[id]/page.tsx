'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Layers, BookOpen, Users } from '@/components/Icons'

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: branchId } = use(params)
  const [branch, setBranch] = useState<any>(null)
  const [runningBatches, setRunningBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBranchDetail()
  }, [branchId])

  const fetchBranchDetail = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/branches')
      if (res.ok) {
        const data = await res.json()
        const target = (data.branches || []).find((b: any) => b.id === branchId)
        if (target) {
          setBranch(target)
          setRunningBatches(target.batches || [])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading || !branch) {
    return <div className="pulse" style={{ padding: '3rem', fontWeight: 800, color: '#64748b' }}>Loading branch detail...</div>
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/super-admin/branches" className="btn-back">
          <ArrowLeft size={16} /> Back to Branches
        </Link>
      </div>

      {/* Branch Header Banner */}
      <div className="card" style={{
        padding: '2rem',
        marginBottom: '2rem',
        background: branch.colour || '#00c853',
        color: '#ffffff',
        border: '3px solid #1a1a2e',
        borderRadius: '20px',
        boxShadow: '6px 6px 0px #1a1a2e'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span style={{
              backgroundColor: '#ffffff',
              color: branch.colour || '#00c853',
              fontWeight: 900,
              padding: '0.35rem 0.85rem',
              borderRadius: '50px',
              border: '2px solid #1a1a2e',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              display: 'inline-block',
              marginBottom: '0.75rem'
            }}>
              {branch.type || 'Physical'}
            </span>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', margin: 0 }}>
              {branch.name}
            </h1>

            {branch.address && (
              <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 800, fontSize: '1rem', marginTop: '0.35rem' }}>
                📍 {branch.address}
              </p>
            )}

            <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 800, fontSize: '1rem', marginTop: '0.5rem' }}>
              {branch.batchCount} batches running • {branch.studentCount} total students enrolled
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.5rem' }}>
        Batches & Subject Teacher Breakdown at {branch.name}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {runningBatches.map((b: any) => (
          <div key={b.id} className="card" style={{
            padding: '1.75rem',
            border: '3px solid #1a1a2e',
            borderRadius: '16px',
            boxShadow: '5px 5px 0px #1a1a2e'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #1a1a2e', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  <Link href={`/dashboard/super-admin/batches/${b.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                    {b.name}
                  </Link>
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>
                  {b.academicLevel} • {b.studentCount} students enrolled at this branch
                </span>
              </div>

              <Link
                href={`/dashboard/super-admin/batches/${b.id}`}
                style={{
                  padding: '0.45rem 1rem',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  background: '#ffffff',
                  color: '#1a1a2e',
                  borderRadius: '50px',
                  border: '2px solid #1a1a2e',
                  boxShadow: '2px 2px 0px #1a1a2e',
                  textDecoration: 'none'
                }}
              >
                Manage batch →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#334155', margin: 0 }}>
                Subjects running at {branch.name}:
              </h4>

              {b.subjects.map((sub: any) => (
                <div key={sub.id} style={{
                  background: '#f8fafc',
                  border: '2px solid #1a1a2e',
                  borderRadius: '10px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{
                      background: sub.colour || '#2979ff',
                      color: '#ffffff',
                      border: '1.5px solid #1a1a2e',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '50px',
                      fontSize: '0.8rem',
                      fontWeight: 900
                    }}>
                      📚 {sub.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {sub.teachers.length > 0 ? (
                      sub.teachers.map((t: any) => (
                        <span key={t.id} style={{
                          background: '#ffffff',
                          color: '#0f172a',
                          border: '1.5px solid #1a1a2e',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '50px',
                          fontSize: '0.8rem',
                          fontWeight: 800
                        }}>
                          👨‍🏫 {t.name} {t.assistant ? `(🤝 ${t.assistant})` : '(No assistant)'}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 800 }}>
                        ⚠️ No teacher assigned at this branch
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {b.subjects.length === 0 && (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>
                  No subjects added to this batch yet.
                </div>
              )}
            </div>
          </div>
        ))}

        {runningBatches.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700, border: '3px dashed #cbd5e1' }}>
            No active batches running at {branch.name} yet.
          </div>
        )}
      </div>
    </div>
  )
}
