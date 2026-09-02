import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { isFinishedStatus, isLiveStatus } from '#/lib/football'

import type { FixtureDetail } from '#/lib/match'

const inputSchema = z.object({
  fixtureId: z.number().int().positive(),
  timezone: z.string().min(1).max(64),
})

export type MatchDetailResult =
  | { ok: true; match: FixtureDetail; fetchedAt: string }
  | {
      ok: false
      kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'
      message: string
    }

const cache = new Map<string, { expiresAt: number; value: MatchDetailResult }>()

function cacheDuration(match: FixtureDetail) {
  if (isLiveStatus(match.fixture.status.short)) return 55_000
  if (isFinishedStatus(match.fixture.status.short)) return 86_400_000

  const untilKickoff = match.fixture.timestamp * 1000 - Date.now()
  if (untilKickoff <= 2 * 60 * 60 * 1000) return 15 * 60_000
  return Math.max(60 * 60_000, Math.min(86_400_000, untilKickoff))
}

export const getMatchDetail = createServerFn({ method: 'GET' })
  .validator(inputSchema)
  .handler(async ({ data }): Promise<MatchDetailResult> => {
    const cacheKey = `${data.fixtureId}:${data.timezone}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.value

    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }

    const url = new URL('https://v3.football.api-sports.io/fixtures')
    url.searchParams.set('id', String(data.fixtureId))
    url.searchParams.set('timezone', data.timezone)

    try {
      const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
      if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
      if (!response.ok) return { ok: false, kind: 'provider', message: `The football data service returned an error (${response.status}).` }

      const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: FixtureDetail[] }
      const hasErrors = Array.isArray(payload.errors) ? payload.errors.length > 0 : Boolean(payload.errors && Object.keys(payload.errors).length)
      if (hasErrors || !Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'The football data service could not complete this request.' }
      const match = payload.response.at(0)
      if (!match) return { ok: false, kind: 'not-found', message: 'This fixture could not be found.' }

      const value: MatchDetailResult = { ok: true, match, fetchedAt: new Date().toISOString() }
      cache.set(cacheKey, { value, expiresAt: Date.now() + cacheDuration(match) })
      return value
    } catch {
      return { ok: false, kind: 'network', message: 'Match details are temporarily unavailable. Please try again.' }
    }
  })
