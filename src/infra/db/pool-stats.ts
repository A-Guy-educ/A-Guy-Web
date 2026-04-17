/**
 * MongoDB Connection Pool Stats Utility
 *
 * Provides connection pool metrics for monitoring and health checks.
 *
 * @fileType utility
 * @domain database
 * @pattern connection-pool, health-check
 */

import type { MongooseAdapter } from '@payloadcms/db-mongodb'

export interface PoolStats {
  poolSize: number
  available: number
  inUse: number
  queued: number
}

/**
 * Get current connection pool stats from a MongooseAdapter
 *
 * Returns safe defaults if stats cannot be retrieved (e.g., not connected yet)
 */
export function getPoolStats(adapter: MongooseAdapter): PoolStats {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pool = (adapter.connection as any).pool

    if (!pool) {
      return { poolSize: 0, available: 0, inUse: 0, queued: 0 }
    }

    // Get stats from the pool if available (MongoDB driver v4.x+)
    const stats = typeof pool.stats === 'function' ? pool.stats() : pool.stats || {}

    return {
      // configured pool size (maxPoolSize from connection options)
      poolSize: pool.size ?? stats.poolSize ?? 0,
      // available connections
      available: pool.available ?? stats.available ?? 0,
      // connections currently in use
      inUse: pool.inUse ?? stats.inUse ?? 0,
      // operations waiting for a connection
      queued: pool.queued ?? stats.queued ?? 0,
    }
  } catch {
    // Pool stats unavailable (connection not established)
    return { poolSize: 0, available: 0, inUse: 0, queued: 0 }
  }
}

/**
 * Log current pool stats - useful for debugging connection issues
 */
export function logPoolStats(
  adapter: MongooseAdapter,
  logger: { info: (msg: string) => void },
): void {
  const stats = getPoolStats(adapter)
  logger.info(
    `[MongoDB Pool] size=${stats.poolSize} available=${stats.available} inUse=${stats.inUse} queued=${stats.queued}`,
  )
}
