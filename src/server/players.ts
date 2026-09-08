import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { PlayerProfile } from '#/lib/player'

const searchSchema = z.object({ query: z.string().trim().min(4).max(80) })

export type PlayerSearchResult =
  | { ok: true; players: PlayerProfile[] }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const searchPlayers = createServerFn({ method: 'GET' }).validator(searchSchema).handler(async ({ data }): Promise<PlayerSearchResult> => {
  try {
    const response = await apiFootballRequest<Array<{ player: PlayerProfile }>>({ path: 'players/profiles', params: { search: data.query }, ttl: CACHE_TTL.weekly })
    const players = response.data.map((item) => item.player)
    return { ok: true, players }
  } catch (error) {
    return apiFootballError(error, 'Player search could not reach the football data service.')
  }
})
