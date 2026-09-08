import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { CompetitionTeam } from '#/lib/competition'

const inputSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('league'), leagueId: z.number().int().positive(), season: z.number().int().min(1900).max(2200) }),
  z.object({ mode: z.literal('search'), query: z.string().trim().min(3).max(80) }),
])

export type TeamsResult =
  | { ok: true; teams: CompetitionTeam[]; source: 'league' | 'search'; leagueId: number | null }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const getTeams = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<TeamsResult> => {
  const params: Record<string, string> = {}
  if (data.mode === 'league') {
    params.league = String(data.leagueId)
    params.season = String(data.season)
  } else params.search = data.query
  try {
    const { data: teams } = await apiFootballRequest<CompetitionTeam[]>({ path: 'teams', params, ttl: CACHE_TTL.daily })
    return { ok: true, teams, source: data.mode, leagueId: data.mode === 'league' ? data.leagueId : null }
  } catch (error) {
    return apiFootballError(error, 'Team data could not reach the football data service.')
  }
})
