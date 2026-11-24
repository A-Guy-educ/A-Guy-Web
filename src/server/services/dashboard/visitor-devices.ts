/**
 * Device split of the visitor funnel. Guest sessions carry `device` (platform
 * + in-app browser, see infra/analytics/guest-device.ts) from the release
 * that started recording it; older sessions land in `unknown`.
 */

import type { Document } from 'mongodb'

import type { FunnelDeviceKey } from './funnel-types'

export const FUNNEL_DEVICE_KEYS: readonly FunnelDeviceKey[] = [
  'in_app',
  'ios',
  'android',
  'computer',
  'unknown',
]

/** Group key: an in-app browser wins over the platform it runs on. */
export const DEVICE_GROUP: Document = {
  $cond: [
    { $ifNull: ['$device.inApp', false] },
    'in_app',
    { $ifNull: ['$device.platform', 'unknown'] },
  ],
}
