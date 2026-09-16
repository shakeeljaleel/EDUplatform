'use client'

import { useState } from 'react'
import Link from 'next/link'
import EmptyState from '@/components/EmptyState'
import { GraduationCap, Award, Star, MessageSquare, BookOpen, ChevronRight, Calendar } from '@/components/Icons'

interface ParentChildSwitcherProps {
  childrenData: Array<{
    id: string
    userId: string
    paymentStatus: string
    stars: number
    medals: number
    user: {
      id: string
      name: string
      email: string
    }
    attendanceCount: number
    attendanceRate: number
    recentExamCount: number
    unreadMessages: number
  }>
}

export default function ParentChildSwitcher({ childrenData }: ParentChildSwitcherProps) {
  const [selectedChildId, setSelectedChildId] = useState<string>(
    childrenData.length > 0 ? childrenData[0].userId : ''
  )

  const activeChild = childrenData.find(c => c.userId === selectedChildId) || childrenData[0]

  if (childrenData.length === 0) {
    return (
      <EmptyState 
        icon={<GraduationCap size={36} color="#10b981" />}
        title="No Children Linked Yet" 
        description="Link your child's student account to view their academic progress, attendance records, and teacher communications in one place."
        actionLabel="Link Student Account"
        actionHref="/register?role=parent"
      />
    )
  }

  return (
    <div>
      {/* CHILD SWITCHER TABS */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {childrenData.map((child) => (
          <button
            key={child.userId}
            onClick={() => setSelectedChildId(child.userId)}
            className={`tab-pill ${selectedChildId === child.userId ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '50px',
              border: '3px solid #1a1a2e',
              boxShadow: '3px 3px 0px #1a1a2e',
              background: selectedChildId === child.userId ? '#1a1a2e' : '#ffffff',
              color: selectedChildId === child.userId ? '#ffffff' : '#1a1a2e',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              minHeight: '44px',
              transition: 'all 0.2s ease'
            }}
          >
            <GraduationCap size={20} color={selectedChildId === child.userId ? '#ffffff' : '#1a1a2e'} />
            <span>{child.user.name}</span>
            {child.unreadMessages > 0 && (
              <span className="badge" style={{ background: '#f50057', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800 }}>
                {child.unreadMessages} new
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SELECTED CHILD SUMMARY */}
      {activeChild && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            
            {/* Attendance Rate - Solid Vivid Green */}
            <div className="stat-card" style={{
              background: '#00c853',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              boxShadow: '5px 5px 0px #1a1a2e',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800 }}>Overall Attendance</div>
              <div style={{ fontSize: '2.75rem', fontWeight: 900, color: '#ffffff', marginTop: '0.25rem', lineHeight: 1 }}>
                {activeChild.attendanceRate}%
              </div>
              <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.75rem' }}>
                {activeChild.attendanceCount} recorded sessions
              </p>
            </div>

            {/* Stars & Medals - Solid Electric Blue */}
            <div className="stat-card" style={{
              background: '#2979ff',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              boxShadow: '5px 5px 0px #1a1a2e',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800 }}>Academic Badges</div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star size={20} color="#ffd700" />
                  <strong style={{ fontSize: '1.125rem', color: '#ffffff' }}>{activeChild.stars} Stars</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={20} color="#ffffff" />
                  <strong style={{ fontSize: '1.125rem', color: '#ffffff' }}>{activeChild.medals} Medals</strong>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.75rem' }}>Active learning rewards</p>
            </div>

            {/* Teacher Updates - Solid Vibrant Purple */}
            <div className="stat-card" style={{
              background: '#aa00ff',
              borderRadius: '16px',
              padding: '1.5rem',
              color: '#ffffff',
              border: '3px solid #1a1a2e',
              boxShadow: '5px 5px 0px #1a1a2e',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#ffffff', textTransform: 'uppercase', fontWeight: 800 }}>Teacher Updates</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffffff', marginTop: '0.25rem' }}>
                {activeChild.unreadMessages} Unread
              </div>
              <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700, marginTop: '0.5rem' }}>
                {activeChild.recentExamCount} exam evaluations recorded
              </p>
            </div>

          </div>

          {/* QUICK LINKS FOR CHILD */}
          <div className="card premium-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.25rem', color: '#0f172a' }}>
              Academic Operations — {activeChild.user.name}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <Link 
                href={`/dashboard/parent/children/${activeChild.userId}`} 
                className="btn-primary" 
                style={{ padding: '0.875rem 1.25rem', textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800 }}
              >
                <BookOpen size={18} /> View Full Academic Report <ChevronRight size={16} />
              </Link>

              <Link 
                href={`/dashboard/parent/children/${activeChild.userId}/calendar`} 
                className="btn-secondary" 
                style={{ padding: '0.875rem 1.25rem', textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800 }}
              >
                <Calendar size={18} /> View Class Schedule
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
