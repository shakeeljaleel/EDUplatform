'use client'

import Link from 'next/link'
import { ChevronRight } from '@/components/Icons'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '0.75rem' }}>
      <ol style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>
        <li>
          <Link href="/dashboard/super-admin" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.color = '#10b981'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
            Overview
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ChevronRight size={14} color="#94a3b8" />
              {isLast || !item.href ? (
                <span aria-current="page" style={{ color: '#0f172a', fontWeight: 700 }}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.color = '#10b981'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
