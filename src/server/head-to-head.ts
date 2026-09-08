import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { FixtureSummary } from '#/lib/football'

const schema = z.object({ homeId: z.number().int().positive(), awayId: z.number().int().positive(), timezone: z.string().min(1).max(64) }).refine((value) => value.homeId !== value.awayId, 'Teams must be different')

export type HeadToHeadResult =
  | { ok: true; fixtures: FixtureSummary[] }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const getHeadToHead = createServerFn({ method: 'GET' }).validator(schema).handler(async ({ data }): Promise<HeadToHeadResult> => {
  const pair = [data.homeId, data.awayId].sort((a, b) => a - b).join('-')
  try {
    const response = await apiFootballRequest<FixtureSummary[]>({ path: 'fixtures/headtohead', params: { h2h: pair, timezone: data.timezone }, ttl: CACHE_TTL.daily })
    return { ok: true, fixtures: response.data }
  } catch (error) {
    return apiFootballError(error, 'The football data service could not be reached.')
  }
})
