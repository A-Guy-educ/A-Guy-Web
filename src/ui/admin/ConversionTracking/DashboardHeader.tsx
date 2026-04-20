'use client'

import React from 'react'
import type { CSSProperties } from 'react'

import type { Period } from '@/app/api/admin/dashboard-metrics/route'

import { useMetricsContext } from './MetricsProvider'

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
}

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--theme-elevation-1000)',
  margin: 0,
}

const filterContainerStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  backgroundColor: 'var(--theme-elevation-100)',
  borderRadius: 8,
  padding: 3,
}

const filterBtnBase: CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'all 0.15s',
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const DashboardHeader: React.FC = () => {
  const { period, setPeriod, error } = useMetricsContext()

  if (error === 'admin-only') return null

  return (
    <div style={headerStyle}>
      <h2 style={titleStyle}>Dashboard</h2>
      <div style={filterContainerStyle}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              ...filterBtnBase,
              backgroundColor: period === p.value ? 'var(--theme-elevation-0)' : 'transparent',
              color:
                period === p.value ? 'var(--theme-elevation-1000)' : 'var(--theme-elevation-500)',
              boxShadow: period === p.value ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default DashboardHeader
