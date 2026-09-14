/**
 * Period-handling tests for GET /api/dashboard-metrics.
 *
 * Locks in that the endpoint accepts every value in VALID_PERIODS (day, week,
 * month, year) and rejects anything else with 400. The Dash Users-tab picker
 * relies on all four being supported natively — the old day→month shim in
 * A-Guy-Dash exists purely because Web used to 400 on `day`.
 */

import { NextRequest } from 'next/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetWebUser = vi.hoisted(() => vi.fn())
const mockComputeDashboardMetrics = vi.hoisted(() => vi.fn())
const mockIsProductHealthEnabled = vi.hoisted(() => vi.fn(() => false))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser: mockGetWebUser }))

vi.mock('@/server/services/dashboard/metrics-service', () => ({
  computeDashboardMetrics: mockComputeDashboardMetrics,
}))

vi.mock('@/server/services/dashboard/product-health/config', () => ({
  isProductHealthEnabled: mockIsProductHealthEnabled,
}))

const ADMIN = { id: 'admin-1', role: 'admin' }

function emptyMetrics(period: 'day' | 'week' | 'month' | 'year') {
  // Minimal shape — the route wraps it as-is; tests only assert status + period.
  return {
    period,
    userMetrics: {},
    monthlySignups: [],
    contentCounts: {},
    engagement: {},
    revenueMetrics: {},
    tokenMetrics: {},
  }
}

async function callRoute(url: string) {
  const { GET } = await import('@/app/api/dashboard-metrics/route')
  const response = await GET(new NextRequest(url))
  return { status: response.status, body: await response.json() }
}

describe('GET /api/dashboard-metrics — period handling', () => {
  // Cold-import of the route pulls in Next runtime, Payload types and the
  // metrics-service module tree; that's slower than the default 5s test
  // budget on the first test. Warm it up once so every it() starts hot.
  beforeAll(async () => {
    await import('@/app/api/dashboard-metrics/route')
  }, 30000)

  beforeEach(() => {
    mockGetWebUser.mockReset().mockResolvedValue(ADMIN)
    mockComputeDashboardMetrics
      .mockReset()
      .mockImplementation(async (period: 'day' | 'week' | 'month' | 'year') => emptyMetrics(period))
    mockIsProductHealthEnabled.mockReset().mockReturnValue(false)
  })

  it("accepts period='day' and forwards it to the metrics service", async () => {
    const { status, body } = await callRoute('http://localhost/api/dashboard-metrics?period=day')

    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('day')
    expect(body.period).toBe('day')
  })

  it("accepts period='week'", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=week')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('week')
  })

  it("accepts period='month'", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=month')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('month')
  })

  it("accepts period='year'", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=year')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('year')
  })

  it("defaults to 'month' when period is omitted", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('month')
  })

  it('rejects an unknown period with 400', async () => {
    const { status, body } = await callRoute('http://localhost/api/dashboard-metrics?period=decade')
    expect(status).toBe(400)
    expect(body.error).toBe('Invalid period')
    expect(mockComputeDashboardMetrics).not.toHaveBeenCalled()
  })

  it('returns 401 for an anonymous caller', async () => {
    mockGetWebUser.mockResolvedValue(null)
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=day')
    expect(status).toBe(401)
    expect(mockComputeDashboardMetrics).not.toHaveBeenCalled()
  })

  it('returns 403 for a non-admin caller', async () => {
    mockGetWebUser.mockResolvedValue({ id: 'u-1', role: 'student' })
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=day')
    expect(status).toBe(403)
    expect(mockComputeDashboardMetrics).not.toHaveBeenCalled()
  })
})
