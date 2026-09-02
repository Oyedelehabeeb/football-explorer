import { createServerFn } from '@tanstack/react-start'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { Competition } from '#/lib/competition'

export type CompetitionsResult =
  | { ok: true; competitions: Competition[]; fetchedAt: string }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

let cache: { expiresAt: number; value: CompetitionsResult } | undefined

export function findCachedCompetition(leagueId: number, season: number) {
  if (!cache || cache.expiresAt <= Date.now() || !cache.value.ok) return undefined
  return cache.value.competitions.find((competition) => competition.league.id === leagueId && competition.seasons.some((item) => item.year === season))
}

export const getCurrentCompetitions = createServerFn({ method: 'GET' }).handler(async (): Promise<CompetitionsResult> => {
  if (cache && cache.expiresAt > Date.now()) return cache.value

  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }

  const url = new URL('https://v3.football.api-sports.io/leagues')
  url.searchParams.set('season', '2024')

  try {
    const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
    if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
    if (!response.ok) return { ok: false, kind: 'provider', message: `The football data service returned an error (${response.status}).` }

    const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: Competition[] }
    const payloadError = apiFootballPayloadError(payload.errors)
    if (payloadError) return { ok: false, ...payloadError }
    if (!Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'API-Football returned an invalid response.' }

    const value: CompetitionsResult = { ok: true, competitions: payload.response, fetchedAt: new Date().toISOString() }
    cache = { value, expiresAt: Date.now() + 60 * 60_000 }
    return value
  } catch {
    return { ok: false, kind: 'network', message: 'Competition data is temporarily unavailable. Please try again.' }
  }
})
