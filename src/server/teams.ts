import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { CompetitionTeam } from '#/lib/competition'

const inputSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('league'), leagueId: z.number().int().positive(), season: z.number().int().min(1900).max(2200) }),
  z.object({ mode: z.literal('search'), query: z.string().trim().min(3).max(80) }),
])

const cache = new Map<string, { expiresAt: number; value: CompetitionTeam[] }>()

export type TeamsResult =
  | { ok: true; teams: CompetitionTeam[]; source: 'league' | 'search'; leagueId: number | null }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const getTeams = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<TeamsResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  const url = new URL('https://v3.football.api-sports.io/teams')
  if (data.mode === 'league') {
    url.searchParams.set('league', String(data.leagueId))
    url.searchParams.set('season', String(data.season))
  } else url.searchParams.set('search', data.query)
  const key = url.toString()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return { ok: true, teams: cached.value, source: data.mode, leagueId: data.mode === 'league' ? data.leagueId : null }
  try {
    const response = await fetch(url, { headers: { 'x-apisports-key': apiKey } })
    if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'Team data is temporarily rate-limited.' }
    if (!response.ok) return { ok: false, kind: 'provider', message: 'The football data service could not load teams.' }
    const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: CompetitionTeam[] }
    const payloadError = apiFootballPayloadError(payload.errors)
    if (payloadError) return { ok: false, ...payloadError }
    if (!Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'API-Football returned an invalid team response.' }
    cache.set(key, { value: payload.response, expiresAt: Date.now() + 24 * 60 * 60_000 })
    return { ok: true, teams: payload.response, source: data.mode, leagueId: data.mode === 'league' ? data.leagueId : null }
  } catch {
    return { ok: false, kind: 'network', message: 'Team data could not reach the football data service.' }
  }
})
