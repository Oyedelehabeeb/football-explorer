import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { CoachDetailData, CoachProfile, CoachSidelinedPeriod, CoachTrophy } from '#/lib/coach'

const inputSchema = z.object({ coachId: z.number().int().positive() })
const cache = new Map<string, { expiresAt: number; value: unknown }>()

export type CoachDetailResult =
  | { ok: true; data: CoachDetailData }
  | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

async function request<T>(path: string, params: Record<string, string>, ttl: number, apiKey: string): Promise<T> {
  const url = new URL(`https://v3.football.api-sports.io/${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  const cached = cache.get(url.toString())
  if (cached && cached.expiresAt > Date.now()) return cached.value as T

  const response = await fetch(url, { headers: { 'x-apisports-key': apiKey } })
  if (response.status === 429) throw new Error('RATE_LIMIT')
  if (!response.ok) throw new Error('PROVIDER')
  const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: T }
  const payloadError = apiFootballPayloadError(payload.errors)
  if (payloadError) throw new Error(payloadError.kind === 'rate-limit' ? 'RATE_LIMIT' : 'PROVIDER')
  if (payload.response === undefined) throw new Error('PROVIDER')

  cache.set(url.toString(), { value: payload.response, expiresAt: Date.now() + ttl })
  return payload.response
}

function failure(error: unknown): CoachDetailResult {
  if (error instanceof Error && error.message === 'RATE_LIMIT') {
    return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
  }
  return { ok: false, kind: 'provider', message: 'Coach details are temporarily unavailable.' }
}

export const getCoachDetail = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<CoachDetailResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }

  const params = { coach: String(data.coachId) }
  const [coachResult, trophyResult, sidelinedResult] = await Promise.allSettled([
    request<CoachProfile[]>('coachs', { id: String(data.coachId) }, 24 * 60 * 60_000, apiKey),
    request<CoachTrophy[]>('trophies', params, 24 * 60 * 60_000, apiKey),
    request<CoachSidelinedPeriod[]>('sidelined', params, 24 * 60 * 60_000, apiKey),
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
