import React from 'react'

export function CardSkeleton() {
  return (
    <div className="card-skeleton" style={{
      background: 'white',
      borderRadius: 'var(--radius-md)',
      padding: '1.5rem',
      border: '1px solid #e2e8f0',
      animation: 'pulse-anim 1.5s ease-in-out infinite'
    }}>
      <div style={{ width: '40%', height: '14px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '1rem' }}></div>
      <div style={{ width: '60%', height: '32px', background: '#cbd5e1', borderRadius: '6px', marginBottom: '1rem' }}></div>
      <div style={{ width: '80%', height: '12px', background: '#f1f5f9', borderRadius: '4px' }}></div>
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <tr style={{ animation: 'pulse-anim 1.5s ease-in-out infinite' }}>
      <td style={{ padding: '1rem' }}><div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0' }}></div></td>
      <td style={{ padding: '1rem' }}><div style={{ width: '120px', height: '14px', background: '#e2e8f0', borderRadius: '4px' }}></div></td>
      <td style={{ padding: '1rem' }}><div style={{ width: '160px', height: '14px', background: '#f1f5f9', borderRadius: '4px' }}></div></td>
      <td style={{ padding: '1rem' }}><div style={{ width: '80px', height: '24px', background: '#e2e8f0', borderRadius: '12px' }}></div></td>
    </tr>
  )
}
