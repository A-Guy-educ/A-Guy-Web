/**
 * Who may read a class on the teacher dashboard.
 *
 * The DB doesn't enforce membership of `classes.teachers`, so every read goes
 * through these checks: the role gate (teacher or admin → else 403) and the
 * per-class gate (listed in `teachers`, same tenant, or admin → else 404).
 *
 * @fileType service
 * @domain teacher-dashboard
 * @pattern authorization
 * @ai-summary Pure role + class-membership checks for teacher dashboard endpoints
 */

import { AccountRole } from '@/infra/auth/roles'
import { relationId } from '@/infra/db/content-db'

export interface TeacherViewer {
  id: string
  role: string
  /** Viewer's tenant id; null skips the tenant comparison. */
  tenantId: string | null
}

export type ClassAccessDoc = Record<string, unknown> & {
  teachers?: unknown
  tenant?: unknown
}

const DASHBOARD_ROLES: ReadonlySet<string> = new Set([AccountRole.Teacher, AccountRole.Admin])

export function canUseTeacherDashboard(role: unknown): boolean {
  return typeof role === 'string' && DASHBOARD_ROLES.has(role)
}

export function relationIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => relationId(item)).filter((id): id is string => Boolean(id))
}

export function canViewClass(viewer: TeacherViewer, classDoc: ClassAccessDoc): boolean {
  if (viewer.role === AccountRole.Admin) return true
  if (viewer.role !== AccountRole.Teacher) return false
  if (!relationIds(classDoc.teachers).includes(viewer.id)) return false
  return !viewer.tenantId || relationId(classDoc.tenant) === viewer.tenantId
}

/** Build the viewer from a session user (`tenant` is serialized from the user doc). */
export function toTeacherViewer(user: { id: string | number; role?: unknown }): TeacherViewer {
  return {
    id: String(user.id),
    role: typeof user.role === 'string' ? user.role : '',
    tenantId: relationId((user as { tenant?: unknown }).tenant),
  }
}
