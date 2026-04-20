'use client'

import { BookOpen, ClipboardList, FileText, GraduationCap, MessageSquare } from 'lucide-react'
import React from 'react'

import { MetricCard } from './MetricCard'
import {
  contentGridStyle,
  errorStyle,
  loadingStyle,
  widgetContainerStyle,
  widgetTitleStyle,
} from './styles'
import { useMetricsContext } from './MetricsProvider'

const ContentCountsWidget: React.FC = () => {
  const { data, loading, error } = useMetricsContext()

  // Admin-only: render nothing for non-admins
  if (error === 'admin-only') return null

  if (loading) {
    return (
      <div style={widgetContainerStyle}>
        <div style={loadingStyle}>Loading content counts...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={widgetContainerStyle}>
        <div style={errorStyle}>Failed to load content counts: {error}</div>
      </div>
    )
  }

  const { contentCounts } = data

  return (
    <div style={widgetContainerStyle}>
      <h3 style={widgetTitleStyle}>Content Overview</h3>
      <div style={contentGridStyle}>
        <MetricCard
          label="Courses"
          value={contentCounts.courses}
          icon={<GraduationCap size={18} />}
          iconColor="var(--theme-success)"
        />
        <MetricCard
          label="Lessons"
          value={contentCounts.lessons}
          icon={<BookOpen size={18} />}
          iconColor="var(--theme-info)"
        />
        <MetricCard
          label="Exercises"
          value={contentCounts.exercises}
          icon={<ClipboardList size={18} />}
          iconColor="var(--theme-warning)"
        />
        <MetricCard
          label="Formula Sheets"
          value={contentCounts.formulaSheets}
          icon={<FileText size={18} />}
          iconColor="var(--theme-error)"
        />
        <MetricCard
          label="Prompts"
          value={contentCounts.prompts}
          icon={<MessageSquare size={18} />}
          iconColor="var(--theme-elevation-700)"
        />
      </div>
    </div>
  )
}

export default ContentCountsWidget
