import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

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

export type CompetitionPerformersResult =
  | { ok: true; players: PlayerSeasonResponse[] }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const getCompetitionPerformers = createServerFn({ method: 'GET' }).validator(schema).handler(async ({ data }): Promise<CompetitionPerformersResult> => {
  try {
    const response = await apiFootballRequest<PlayerSeasonResponse[]>({ path: endpoint[data.category], params: { league: String(data.leagueId), season: String(data.season) }, ttl: CACHE_TTL.daily })
    return { ok: true, players: response.data }
  } catch (error) {
    return apiFootballError(error, 'The football data service could not be reached.')
  }
})
