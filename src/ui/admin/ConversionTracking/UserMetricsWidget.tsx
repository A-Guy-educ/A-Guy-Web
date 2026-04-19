'use client'

import { Activity, CalendarDays, TrendingUp, UserPlus } from 'lucide-react'
import React from 'react'

import { MetricCard } from './MetricCard'
import {
  errorStyle,
  loadingStyle,
  userGridStyle,
  widgetContainerStyle,
  widgetTitleStyle,
} from './styles'
import { useMetrics } from './useMetrics'

function calcTrend(current: number, previous: number): { value: number; label: string } | null {
  if (previous === 0) return current > 0 ? { value: 100, label: 'vs prior' } : null
  return { value: ((current - previous) / previous) * 100, label: 'vs prior' }
}

const UserMetricsWidget: React.FC = () => {
  const { data, loading, error } = useMetrics()

  // Admin-only: render nothing for non-admins
  if (error === 'admin-only') return null

  if (loading) {
    return (
      <div style={widgetContainerStyle}>
        <div style={loadingStyle}>Loading user metrics...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={widgetContainerStyle}>
        <div style={errorStyle}>Failed to load user metrics: {error}</div>
      </div>
    )
  }

  const { userMetrics } = data

  const activeTrend = calcTrend(userMetrics.activeUsersToday, userMetrics.activeUsersYesterday)
  const weekTrend = calcTrend(userMetrics.registeredThisWeek, userMetrics.registeredLastWeek)
  const monthTrend = calcTrend(userMetrics.registeredThisMonth, userMetrics.registeredLastMonth)

  return (
    <div style={widgetContainerStyle}>
      <h3 style={widgetTitleStyle}>User Statistics</h3>
      <div style={userGridStyle}>
        <MetricCard
          label="Active users today"
          value={userMetrics.activeUsersToday}
          icon={<Activity size={20} />}
          accentColor="var(--theme-success)"
          trend={activeTrend}
          large
        />
        <MetricCard
          label="Registered yesterday"
          value={userMetrics.registeredYesterday}
          icon={<UserPlus size={20} />}
          accentColor="var(--theme-info)"
          large
        />
        <MetricCard
          label="Registered this week"
          value={userMetrics.registeredThisWeek}
          icon={<CalendarDays size={20} />}
          accentColor="var(--theme-warning)"
          trend={weekTrend}
          large
        />
        <MetricCard
          label="Registered this month"
          value={userMetrics.registeredThisMonth}
          icon={<TrendingUp size={20} />}
          accentColor="var(--theme-error)"
          trend={monthTrend}
          large
        />
      </div>
    </div>
  )
}

export default UserMetricsWidget
