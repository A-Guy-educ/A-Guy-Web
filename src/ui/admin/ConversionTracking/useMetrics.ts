'use client'

import { useCallback, useEffect, useState } from 'react'

import type { DashboardMetricsResponse } from '@/app/api/admin/dashboard-metrics/route'

interface UseMetricsResult {
  data: DashboardMetricsResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMetrics(): UseMetricsResult {
  const [data, setData] = useState<DashboardMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/dashboard-metrics', { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 403) {
          setError('admin-only')
          return
        }
        throw new Error(`Failed to fetch metrics: ${res.status}`)
      }
      const json = (await res.json()) as DashboardMetricsResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMetrics()
  }, [fetchMetrics])

  return { data, loading, error, refetch: fetchMetrics }
}
