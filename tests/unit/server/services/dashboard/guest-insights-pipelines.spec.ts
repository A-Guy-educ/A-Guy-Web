import { describe, expect, it } from 'vitest'

import {
  buildBotHitsPipeline,
  buildLast30dPipeline,
  buildOnboardingFunnelPipeline,
  toConversionByLandingType,
  toLandingBreakdown,
  toOnboardingFunnel,
  toTopLandingPaths,
  toUaBotHits,
  TRACKED_SESSION,
} from '@/server/services/dashboard/guest-insights-pipelines'

const SINCE = new Date('2026-09-25T00:00:00.000Z')
const ADMIN_REFS = ['admin-1']

describe('buildOnboardingFunnelPipeline', () => {
  const pipeline = buildOnboardingFunnelPipeline(SINCE, ADMIN_REFS)
  const group = pipeline[1]?.$group as Record<string, unknown>

  it('cohorts by onboarding start so every step is a subset of `started`', () => {
    expect(pipeline[0]).toEqual({ $match: { 'onboarding.startedAt': { $gte: SINCE } } })
    expect(group.started).toEqual({ $sum: 1 })
  })

  it('counts each step as a unique session that has the step timestamp', () => {
    expect(group.personaSelected).toEqual({
      $sum: {
        $cond: [{ $ne: [{ $type: '$onboarding.personaSelectedAt' }, 'missing'] }, 1, 0],
      },
    })
    for (const step of ['gradeSelected', 'signupPromptShown', 'googleClicked']) {
      expect(JSON.stringify(group[step])).toContain(`$onboarding.${step}At`)
    }
  })

  it('counts completion from claimedByUser, excluding admin claims', () => {
    expect(group.completed).toEqual({
      $sum: {
        $cond: [
          {
            $and: [
              { $ne: [{ $type: '$claimedByUser' }, 'missing'] },
              { $not: [{ $in: ['$claimedByUser', ADMIN_REFS] }] },
            ],
          },
          1,
          0,
        ],
      },
    })
  })
})

describe('toOnboardingFunnel', () => {
  it('returns zeros when no session started onboarding', () => {
    expect(toOnboardingFunnel(undefined)).toEqual({
      started: 0,
      personaSelected: 0,
      gradeSelected: 0,
      signupPromptShown: 0,
      googleClicked: 0,
      completed: 0,
    })
  })

  it('maps the grouped row and drops the _id key', () => {
    const row = {
      _id: null,
      started: 40,
      personaSelected: 30,
      gradeSelected: 22,
      signupPromptShown: 25,
      googleClicked: 12,
      completed: 9,
    }
    expect(toOnboardingFunnel(row)).toEqual({
      started: 40,
      personaSelected: 30,
      gradeSelected: 22,
      signupPromptShown: 25,
      googleClicked: 12,
      completed: 9,
    })
  })
})

describe('buildLast30dPipeline', () => {
  it('opens with an index-friendly createdAt + landingType match (legacy docs excluded)', () => {
    expect(buildLast30dPipeline(SINCE)[0]).toEqual({
      $match: { createdAt: { $gte: SINCE }, ...TRACKED_SESSION },
    })
  })
})

describe('buildBotHitsPipeline', () => {
  it('sums daily counters from the UTC day string', () => {
    expect(buildBotHitsPipeline('2026-09-25')).toEqual([
      { $match: { day: { $gte: '2026-09-25' } } },
      { $group: { _id: '$category', n: { $sum: '$count' } } },
    ])
  })
})

describe('mappers', () => {
  it('fills every landing type and ignores unknown buckets', () => {
    expect(
      toLandingBreakdown([
        { _id: 'lesson', n: 5 },
        { _id: 'start', n: 2 },
        { _id: null, n: 99 },
      ]),
    ).toEqual({ lesson: 5, course: 0, start: 2, home: 0, other: 0 })
  })

  it('maps conversion rows per landing type', () => {
    const out = toConversionByLandingType([{ _id: 'course', guests: 10, converted: 3 }])
    expect(out.course).toEqual({ guests: 10, converted: 3 })
    expect(out.lesson).toEqual({ guests: 0, converted: 0 })
  })

  it('flattens top landing paths', () => {
    expect(
      toTopLandingPaths([
        { _id: { path: '/start', type: 'start' }, n: 7 },
        { _id: { path: 42, type: 'start' }, n: 1 },
      ]),
    ).toEqual([{ path: '/start', type: 'start', count: 7 }])
  })

  it('renames bot categories to camelCase keys', () => {
    expect(
      toUaBotHits([
        { _id: 'social-preview', n: 4 },
        { _id: 'ai-crawler', n: 3 },
        { _id: 'search', n: 2 },
        { _id: 'bogus', n: 100 },
      ]),
    ).toEqual({ search: 2, socialPreview: 4, aiCrawler: 3, other: 0 })
  })
})
