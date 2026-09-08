import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { CoachDetailData, CoachProfile, CoachSidelinedPeriod, CoachTrophy } from '#/lib/coach'

const inputSchema = z.object({ coachId: z.number().int().positive() })

export type CoachDetailResult =
  | { ok: true; data: CoachDetailData }
  | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

const failure = (error: unknown) => apiFootballError(error, 'Coach details are temporarily unavailable.')

export const getCoachDetail = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<CoachDetailResult> => {
  const params = { coach: String(data.coachId) }
  const [coachResult, trophyResult, sidelinedResult] = await Promise.allSettled([
    apiFootballRequest<CoachProfile[]>({ path: 'coachs', params: { id: String(data.coachId) }, ttl: CACHE_TTL.daily }).then((result) => result.data),
    apiFootballRequest<CoachTrophy[]>({ path: 'trophies', params, ttl: CACHE_TTL.daily }).then((result) => result.data),
    apiFootballRequest<CoachSidelinedPeriod[]>({ path: 'sidelined', params, ttl: CACHE_TTL.daily }).then((result) => result.data),
  ])

  if (coachResult.status === 'rejected') return failure(coachResult.reason)
  const coach = coachResult.value.at(0)
  if (!coach) return { ok: false, kind: 'not-found', message: 'This coach could not be found.' }

  return {
    ok: true,
    data: {
      coach,
      trophies: trophyResult.status === 'fulfilled' ? trophyResult.value : [],
      sidelined: sidelinedResult.status === 'fulfilled' ? sidelinedResult.value : [],
      unavailable: [
        trophyResult.status === 'rejected' && 'trophies',
        sidelinedResult.status === 'rejected' && 'sidelined',
      ].filter((item): item is 'trophies' | 'sidelined' => Boolean(item)),
    },
  }
})
