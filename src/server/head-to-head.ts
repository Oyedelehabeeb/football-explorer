import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { FixtureSummary } from '#/lib/football'

const schema = z.object({ homeId: z.number().int().positive(), awayId: z.number().int().positive(), timezone: z.string().min(1).max(64) }).refine((value) => value.homeId !== value.awayId, 'Teams must be different')
const cache = new Map<string, { expiresAt: number; fixtures: FixtureSummary[] }>()

export type HeadToHeadResult =
  | { ok: true; fixtures: FixtureSummary[] }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const getHeadToHead = createServerFn({ method: 'GET' }).validator(schema).handler(async ({ data }): Promise<HeadToHeadResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  const pair = [data.homeId, data.awayId].sort((a, b) => a - b).join('-')
  const cacheKey = `${pair}:${data.timezone}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return { ok: true, fixtures: cached.fixtures }
  const url = new URL('https://v3.football.api-sports.io/fixtures/headtohead')
  url.searchParams.set('h2h', pair)
  url.searchParams.set('timezone', data.timezone)
  try {
    const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
    if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
    if (!response.ok) return { ok: false, kind: 'network', message: 'The football data service could not complete this request.' }
    const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: FixtureSummary[] }
    const payloadError = apiFootballPayloadError(payload.errors)
    if (payloadError) return { ok: false, kind: payloadError.kind, message: payloadError.message }
    if (!Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'The provider returned an unexpected head-to-head response.' }
    cache.set(cacheKey, { fixtures: payload.response, expiresAt: Date.now() + 24 * 60 * 60_000 })
    return { ok: true, fixtures: payload.response }
  } catch {
    return { ok: false, kind: 'network', message: 'The football data service could not be reached.' }
  }
})
