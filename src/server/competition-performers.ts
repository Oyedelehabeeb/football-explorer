import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { PerformerCategory } from '#/lib/competition'
import type { PlayerSeasonResponse } from '#/lib/player'

const schema = z.object({
  leagueId: z.number().int().positive(),
  season: z.number().int().min(1900).max(2200),
  category: z.enum(['scorers', 'assists', 'yellow-cards', 'red-cards']),
})

const endpoint: Record<PerformerCategory, string> = {
  scorers: 'players/topscorers',
  assists: 'players/topassists',
  'yellow-cards': 'players/topyellowcards',
  'red-cards': 'players/topredcards',
}
const cache = new Map<string, { expiresAt: number; value: PlayerSeasonResponse[] }>()

export type CompetitionPerformersResult =
  | { ok: true; players: PlayerSeasonResponse[] }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const getCompetitionPerformers = createServerFn({ method: 'GET' }).validator(schema).handler(async ({ data }): Promise<CompetitionPerformersResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }

  const url = new URL(`https://v3.football.api-sports.io/${endpoint[data.category]}`)
  url.searchParams.set('league', String(data.leagueId))
  url.searchParams.set('season', String(data.season))
  const cached = cache.get(url.toString())
  if (cached && cached.expiresAt > Date.now()) return { ok: true, players: cached.value }

  try {
    const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
    if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
    if (!response.ok) return { ok: false, kind: 'network', message: 'The football data service could not complete this request.' }
    const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: PlayerSeasonResponse[] }
    const payloadError = apiFootballPayloadError(payload.errors)
    if (payloadError) return { ok: false, kind: payloadError.kind, message: payloadError.message }
    if (!Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'The provider returned an unexpected leaderboard response.' }
    cache.set(url.toString(), { value: payload.response, expiresAt: Date.now() + 24 * 60 * 60_000 })
    return { ok: true, players: payload.response }
  } catch {
    return { ok: false, kind: 'network', message: 'The football data service could not be reached.' }
  }
})
