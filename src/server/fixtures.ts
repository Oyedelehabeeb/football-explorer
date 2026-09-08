import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { isLiveStatus } from '#/lib/football'
import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { FixtureSummary } from '#/lib/football'

const inputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(64),
  refresh: z.boolean().optional(),
})

export type MatchdayResult =
  | { ok: true; fixtures: FixtureSummary[]; fetchedAt: string; quota: { remaining: number | null; limit: number | null } }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

function cacheDuration(fixtures: FixtureSummary[]) {
  if (fixtures.some((item) => isLiveStatus(item.fixture.status.short))) return CACHE_TTL.live
  const now = Date.now()
  const nextKickoff = fixtures
    .filter((item) => item.fixture.timestamp * 1000 > now)
    .map((item) => item.fixture.timestamp * 1000)
    .sort((a, b) => a - b)[0]
  if (nextKickoff) return Math.max(60_000, Math.min(CACHE_TTL.daily, nextKickoff - now))
  return CACHE_TTL.daily
}

export const getMatchday = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<MatchdayResult> => {
  try {
    const response = await apiFootballRequest<FixtureSummary[]>({
      path: 'fixtures',
      params: { date: data.date, timezone: data.timezone },
      ttl: cacheDuration,
      force: data.refresh,
    })
    return { ok: true, fixtures: response.data, fetchedAt: response.fetchedAt, quota: response.quota }
  } catch (error) {
    return apiFootballError(error, 'Match data is temporarily unavailable. Please try again.')
  }
})
