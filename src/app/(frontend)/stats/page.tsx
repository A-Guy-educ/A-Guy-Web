/**
 * Stats Dashboard Page
 *
 * /stats - Student Statistics Dashboard
 */

import { redirect } from 'next/navigation'

import { getMeUser } from '@/infra/utils/getMeUser'
import { StatsDashboard } from './_components/StatsDashboard'

interface StatsPageProps {
  searchParams: Promise<{
    courseId?: string
    timeframe?: string
  }>
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  // Auth gate - redirect to login if not authenticated
  const { user } = await getMeUser({
    nullUserRedirect: '/login',
  })

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const initialCourseId = params.courseId || 'all'
  const initialTimeframe = (params.timeframe as 'week' | 'month' | 'overall') || 'overall'

  return (
    <div className="container mx-auto px-4 py-section-sm">
      <StatsDashboard
        initialCourseId={initialCourseId}
        initialTimeframe={initialTimeframe}
        courses={[]}
      />
    </div>
  )
}
