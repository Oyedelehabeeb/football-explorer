import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { isLiveStatus } from '#/lib/football'
import { apiFootballPayloadError } from '#/server/api-football-error'

import type { FixtureSummary } from '#/lib/football'

const inputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(64),
})

const cache = new Map<
  string,
  { expiresAt: number; value: MatchdayResult }
>()

export type MatchdayResult =
  | {
      ok: true
      fixtures: FixtureSummary[]
      fetchedAt: string
      quota: { remaining: number | null; limit: number | null }
    }
  | {
      ok: false
      kind: 'configuration' | 'rate-limit' | 'provider' | 'network'
      message: string
    }

function cacheDuration(fixtures: FixtureSummary[]) {
  if (fixtures.some((item) => isLiveStatus(item.fixture.status.short))) return 55_000

  const now = Date.now()
  const nextKickoff = fixtures
    .filter((item) => item.fixture.timestamp * 1000 > now)
    .map((item) => item.fixture.timestamp * 1000)
    .sort((a, b) => a - b)[0]

  if (nextKickoff) return Math.max(60_000, Math.min(86_400_000, nextKickoff - now))
  return 86_400_000
}

function numberHeader(response: Response, name: string) {
  const value = response.headers.get(name)
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const getMatchday = createServerFn({ method: 'GET' })
  .validator(inputSchema)
  .handler(async ({ data }): Promise<MatchdayResult> => {
    const cacheKey = `${data.date}:${data.timezone}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.value

    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      return {
        ok: false,
        kind: 'configuration',
        message: 'Add API_FOOTBALL_KEY to the server environment to load match data.',
      }
    }

    const url = new URL('https://v3.football.api-sports.io/fixtures')
    url.searchParams.set('date', data.date)
    url.searchParams.set('timezone', data.timezone)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-apisports-key': apiKey },
      })

      if (response.status === 429) {
        return {
          ok: false,
          kind: 'rate-limit',
          message: 'The football data service is temporarily rate-limited. Please try again shortly.',
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          kind: 'provider',
          message: `The football data service returned an error (${response.status}).`,
        }
      }

      const payload = (await response.json()) as {
        errors?: unknown[] | Record<string, unknown>
        response?: FixtureSummary[]
      }

      const payloadError = apiFootballPayloadError(payload.errors)
      if (payloadError) return { ok: false, ...payloadError }
      if (!Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'API-Football returned an invalid response.' }

      const value: MatchdayResult = {
        ok: true,
        fixtures: payload.response,
        fetchedAt: new Date().toISOString(),
        quota: {
          remaining: numberHeader(response, 'x-ratelimit-requests-remaining'),
          limit: numberHeader(response, 'x-ratelimit-requests-limit'),
        },
      }
      cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + cacheDuration(payload.response),
      })
      return value
    } catch {
      return {
        ok: false,
        kind: 'network',
        message: 'Match data is temporarily unavailable. Please try again.',
      }
    }
  })
