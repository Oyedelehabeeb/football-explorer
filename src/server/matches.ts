import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { isFinishedStatus, isLiveStatus } from '#/lib/football'
import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { FixtureDetail } from '#/lib/match'

const inputSchema = z.object({ fixtureId: z.number().int().positive(), timezone: z.string().min(1).max(64) })

export type MatchDetailResult =
  | { ok: true; match: FixtureDetail; fetchedAt: string }
  | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

function cacheDuration(matches: FixtureDetail[]) {
  const match = matches.at(0)
  if (!match) return CACHE_TTL.hourly
  if (isLiveStatus(match.fixture.status.short)) return CACHE_TTL.live
  if (isFinishedStatus(match.fixture.status.short)) return CACHE_TTL.daily
  const untilKickoff = match.fixture.timestamp * 1000 - Date.now()
  if (untilKickoff <= 2 * 60 * 60 * 1000) return CACHE_TTL.fifteenMinutes
  return Math.max(CACHE_TTL.hourly, Math.min(CACHE_TTL.daily, untilKickoff))
}

export const getMatchDetail = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<MatchDetailResult> => {
  try {
    const response = await apiFootballRequest<FixtureDetail[]>({
      path: 'fixtures',
      params: { id: String(data.fixtureId), timezone: data.timezone },
      ttl: cacheDuration,
    })
    const match = response.data.at(0)
    if (!match) return { ok: false, kind: 'not-found', message: 'This fixture could not be found.' }
    return { ok: true, match, fetchedAt: response.fetchedAt }
  } catch (error) {
    return apiFootballError(error, 'Match details are temporarily unavailable. Please try again.')
  }
})
