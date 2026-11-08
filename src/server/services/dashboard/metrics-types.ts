/**
 * Response contract for the admin dashboard metrics endpoint.
 *
 * Mirrors the shape of `A-Guy-Admin/src/app/api/admin/dashboard-metrics` so
 * the ported widgets (see PR-B2) render against the same field names. Any
 * change here breaks the widgets — coordinate before touching.
 */

export type Period = 'day' | 'week' | 'month' | 'year'

export const VALID_PERIODS: readonly Period[] = ['day', 'week', 'month', 'year']

/**
 * Users-tab cohort. B2B = the user id appears in any `classes` doc's
 * `students[]` or `teachers[]`; B2C = everyone else. Derived per request from
 * the class rosters — there is no stored segment field on users.
 */
export type UserSegment = 'all' | 'b2c' | 'b2b'

export const VALID_SEGMENTS: readonly UserSegment[] = ['all', 'b2c', 'b2b']

export interface B2bSchoolMetrics {
  schoolId: string
  schoolName: string
  classes: number
  students: number
  activeStudentsInPeriod: number
}

/**
 * School roll-up returned with `segment=b2b`. Admins are excluded from every
 * count, like the rest of the dashboard. "Active" uses the same definition as
 * `userMetrics.returningUsers`: user-stats `lastActiveDate` on/after
 * periodStart. There is no `joinedInPeriod` — class rosters store bare user
 * ids with no join timestamp.
 */
export interface B2bMetrics {
  /** Schools referenced by at least one class. */
  schools: number
  classes: number
  /** Distinct users in any `classes.students`. */
  students: number
  /** Distinct users in any `classes.teachers`. */
  teachers: number
  activeStudentsInPeriod: number
  /** Sorted desc by students, top 20. */
  perSchool: B2bSchoolMetrics[]
}

/**
 * Registration attribution counts for the selected `period`. Only Google OAuth
 * signups carry a `signupSource` — that's the only signup path we attribute.
 * `unknown` therefore covers three cases: users registered before the
 * signup-source cookie shipped, Google signups where the cookie was blocked,
 * and any password-collection users (admin seeds, legacy accounts) that never
 * flow through the OAuth callback. All buckets count users with `createdAt`
 * inside the period window so the totals match aggregateUsers for the same
 * range.
 */
export interface SignupSourceBreakdown {
  google: number
  guykoren: number
  direct: number
  other: number
  unknown: number
}

export interface UserMetrics {
  activeUsersToday: number
  activeUsersYesterday: number
  activeUsersLastWeek: number
  activeUsersLastMonth: number
  registeredToday: number
  registeredYesterday: number
  registeredThisWeek: number
  registeredLastWeek: number
  registeredThisMonth: number
  registeredLastMonth: number
  totalUsers: number
  totalGuestSessions: number
  guestSessionsToday: number
  guestSessionsLastWeek: number
  guestSessionsLastMonth: number
  guestToRegisteredCount: number
  guestToRegisteredPercentage: number
  /** Guest sessions created on/after `periodStart` (the Users-tab period). */
  guestSessionsInPeriod: number
  /**
   * Of `guestSessionsInPeriod`, how many were claimed by a non-admin signup.
   * Cohort-based, so guestConvertedInPeriod ≤ guestSessionsInPeriod.
   */
  guestConvertedInPeriod: number
  returnedOnceCount: number
  returnedOncePercentage: number
  returnedMultipleCount: number
  returnedMultiplePercentage: number
  returningUsers: number
  returningUsersTotal: number
  signupSourceBreakdown: SignupSourceBreakdown
}

/** One month bucket for the year-view signups chart. `month` is "YYYY-MM". */
export interface MonthlySignup {
  month: string
  count: number
}

export interface CourseEnrollment {
  courseTitle: string
  count: number
}

/**
 * One row for "active learners per course" — sourced from
 * `users.currentCourse` (the last course the user picked or opened a
 * lesson in), not the `enrollments` collection which counts purchases.
 * A user can own multiple courses but only be on one at a time.
 */
export interface UsersPerCourse {
  courseTitle: string
  count: number
}

/**
 * One row for the "top lessons opened" widget. Sorted desc by openCount.
 * `avgDurationSeconds` is null when we have opens tracked but no ended
 * sessions yet (early after PR 2 ships, or lessons with only bail-outs).
 */
export interface TopLesson {
  lessonId: string
  lessonTitle: string
  openCount: number
  avgDurationSeconds: number | null
}

/**
 * Session-time roll-up by lesson type (learning / practice / exam). Values
 * are averages in seconds; null when no completed sessions of that type.
 */
export interface SessionTimeByLessonType {
  learning: number | null
  practice: number | null
  exam: number | null
}

export interface EngagementMetrics {
  avgTimeSpentMinutes: number
  medianTimeSpentMinutes: number
  stdDevTimeSpentMinutes: number
  courseEnrollments: CourseEnrollment[]
  usersPerCourse: UsersPerCourse[]
  topLessons: TopLesson[]
  sessionTimeByLessonType: SessionTimeByLessonType
  featureUsage: {
    questionsAsked: number
    conversationsStarted: number
    lessonsCompleted: number
    exercisesAttempted: number
    exercisesCompleted: number
  }
  lessonTypeUsage: {
    learning: number
    practice: number
    exam: number
  }
}

export interface ContentCounts {
  courses: number
  lessons: number
  exercises: number
  formulaSheets: number
  prompts: number
}

export interface CurrencyRevenue {
  [currencyCode: string]: number
}

export interface TopProduct {
  productName: string
  agorot: number
}

/** `succeeded` includes refunded rows — the payment did go through. */
export interface PaymentOutcomeCounts {
  succeeded: number
  failed: number
}

/** Failed transactions grouped by (provider, code). */
export interface FailureReason {
  provider: string
  code: string
  count: number
  agorot: number
}

export interface RevenueSegments {
  b2c: {
    /** Distinct users with a succeeded transaction in the period. */
    payers: number
    /** Succeeded ILS total in the period (platform-wide, = totalRevenueAgorot.ILS). */
    revenueAgorot: number
  }
  /** Estimate — no school subscriptions exist yet. Current roster, not period-bound. */
  b2b: {
    /** Distinct non-admin users in any `classes.students`. */
    students: number
    seatPriceAgorot: number
    estimatedRevenueAgorot: number
  }
}

/**
 * Period-filtered, admins excluded, platform-wide (no B2B/B2C filter).
 * `pending` rows (abandoned checkouts) are excluded from every count.
 */
export interface RevenueMetrics {
  totalRevenueAgorot: CurrencyRevenue
  refundedAgorot: number
  failedAgorot: number
  /** succeeded + refunded + failed. */
  transactionCount: number
  /** (succeeded + refunded) ÷ transactionCount × 100, 1 decimal. */
  successRate: number
  /** Grouped by product, falling back to tierSlug ("Subscription — <tier>"). */
  topProducts: TopProduct[]
  /** Split by `isRenewal === true`. */
  payments: {
    firstPurchase: PaymentOutcomeCounts
    renewal: PaymentOutcomeCounts
  }
  /** Sorted desc by count, top 10. */
  failureReasons: FailureReason[]
  segments: RevenueSegments
}

export interface TopLessonByTokens {
  lessonId: string
  lessonTitle: string
  totalTokens: number
  callCount: number
}

export interface TopUserByTokens {
  userId: string
  label: string
  totalTokens: number
}

export interface TokenMetrics {
  totalTokensToday: number
  totalTokensThisMonth: number
  totalTokensThisYear: number
  avgTokensPerUserThisMonth: number
  avgTokensPerLessonThisMonth: number
  topLessons: TopLessonByTokens[]
  topUsers: TopUserByTokens[]
}

export interface DashboardMetricsResponse {
  period: Period
  /**
   * Cohort `userMetrics` and `monthlySignups` were computed over. Guest
   * fields are pre-signup and every other block is always platform-wide.
   */
  segment: UserSegment
  userMetrics: UserMetrics
  monthlySignups: MonthlySignup[]
  contentCounts: ContentCounts
  engagement: EngagementMetrics
  revenueMetrics: RevenueMetrics
  tokenMetrics: TokenMetrics
  /**
   * Landing attribution, onboarding funnel and bot share for anonymous
   * visitors. Shape lives with the service in `./guest-insights-types.ts`.
   */
  guestInsights: import('./guest-insights-types').GuestInsights
  /**
   * Optional Product Health tab payload. Gated behind
   * `PRODUCT_HEALTH_ENABLED`; the field is omitted (undefined) when off so
   * Dash's optional-field degradation path stays exercised until launch.
   * Shape lives with the service in
   * `src/server/services/dashboard/product-health/types.ts`.
   */
  productHealth?: import('./product-health/types').ProductHealthPayload
  /** School roll-up; present only when `segment` is `b2b`. */
  b2bMetrics?: B2bMetrics
}
