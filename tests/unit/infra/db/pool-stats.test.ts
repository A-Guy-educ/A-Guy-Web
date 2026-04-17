import { describe, it, expect } from 'vitest'
import { getPoolStats, logPoolStats } from '@/infra/db/pool-stats'
import type { MongooseAdapter } from '@payloadcms/db-mongodb'

describe('getPoolStats', () => {
  it('returns zeros when connection pool is undefined', () => {
    const adapter = {
      connection: {},
    } as MongooseAdapter

    const stats = getPoolStats(adapter)

    expect(stats.poolSize).toBe(0)
    expect(stats.available).toBe(0)
    expect(stats.inUse).toBe(0)
    expect(stats.queued).toBe(0)
  })

  it('returns zeros when adapter is null', () => {
    const adapter = null as unknown as MongooseAdapter

    const stats = getPoolStats(adapter)

    expect(stats.poolSize).toBe(0)
    expect(stats.available).toBe(0)
    expect(stats.inUse).toBe(0)
    expect(stats.queued).toBe(0)
  })

  it('extracts pool stats from connection pool', () => {
    const adapter = {
      connection: {
        pool: {
          size: 10,
          available: 5,
          inUse: 3,
          queued: 2,
        },
      },
    } as unknown as MongooseAdapter

    const stats = getPoolStats(adapter)

    expect(stats.poolSize).toBe(10)
    expect(stats.available).toBe(5)
    expect(stats.inUse).toBe(3)
    expect(stats.queued).toBe(2)
  })

  it('falls back to stats object if available', () => {
    const adapter = {
      connection: {
        pool: {
          size: 3,
          stats: {
            available: 8,
            inUse: 1,
            queued: 0,
          },
        },
      },
    } as unknown as MongooseAdapter

    const stats = getPoolStats(adapter)

    expect(stats.poolSize).toBe(3)
    expect(stats.available).toBe(8)
    expect(stats.inUse).toBe(1)
    expect(stats.queued).toBe(0)
  })

  it('handles pool with stats as function', () => {
    const adapter = {
      connection: {
        pool: {
          size: 5,
          stats: () => ({
            poolSize: 5,
            available: 4,
            inUse: 1,
            queued: 0,
          }),
        },
      },
    } as unknown as MongooseAdapter

    const stats = getPoolStats(adapter)

    expect(stats.poolSize).toBe(5)
    expect(stats.available).toBe(4)
    expect(stats.inUse).toBe(1)
    expect(stats.queued).toBe(0)
  })
})

describe('logPoolStats', () => {
  it('logs formatted pool stats', () => {
    const adapter = {
      connection: {
        pool: {
          size: 3,
          available: 2,
          inUse: 1,
          queued: 0,
        },
      },
    } as unknown as MongooseAdapter

    const logs: string[] = []
    const logger = {
      info: (msg: string) => logs.push(msg),
    }

    logPoolStats(adapter, logger)

    expect(logs).toHaveLength(1)
    expect(logs[0]).toContain('size=3')
    expect(logs[0]).toContain('available=2')
    expect(logs[0]).toContain('inUse=1')
    expect(logs[0]).toContain('queued=0')
  })

  it('handles empty pool gracefully', () => {
    const adapter = {
      connection: {},
    } as MongooseAdapter

    const logs: string[] = []
    const logger = {
      info: (msg: string) => logs.push(msg),
    }

    logPoolStats(adapter, logger)

    expect(logs).toHaveLength(1)
    expect(logs[0]).toContain('size=0')
  })
})
