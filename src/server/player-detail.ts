import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { PlayerCareerTeam, PlayerDetailData, PlayerSeasonResponse, PlayerSidelined, PlayerSupportingData, PlayerTransferGroup, PlayerTrophy } from '#/lib/player'

const detailSchema = z.object({ playerId: z.number().int().positive(), season: z.number().int().min(1900).max(2200) })
const supportSchema = z.object({ playerId: z.number().int().positive() })
const comparisonSchema = z.object({ leftId: z.number().int().positive(), rightId: z.number().int().positive(), season: z.number().int().min(1900).max(2200) }).refine((value) => value.leftId !== value.rightId, 'Players must be different')

export type PlayerDetailResult = { ok: true; data: PlayerDetailData } | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }
export type PlayerSupportingResult = { ok: true; data: PlayerSupportingData } | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }
export type PlayerComparisonResult = { ok: true; left: PlayerSeasonResponse; right: PlayerSeasonResponse; season: number } | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

const failure = (error: unknown) => apiFootballError(error, 'Player details are temporarily unavailable.')

export const getPlayerDetail = createServerFn({ method: 'GET' }).validator(detailSchema).handler(async ({ data }): Promise<PlayerDetailResult> => {
  try {
    const [seasonResult, careerResult] = await Promise.allSettled([
      apiFootballRequest<PlayerSeasonResponse[]>({ path: 'players', params: { id: String(data.playerId), season: String(data.season) }, ttl: CACHE_TTL.daily }).then((result) => result.data),
      apiFootballRequest<PlayerCareerTeam[]>({ path: 'players/teams', params: { player: String(data.playerId) }, ttl: CACHE_TTL.weekly }).then((result) => result.data),
    ])
    if (seasonResult.status === 'rejected') return failure(seasonResult.reason)
    const season = seasonResult.value.at(0)
    if (!season) return { ok: false, kind: 'not-found', message: 'This player could not be found for the selected season.' }
    return { ok: true, data: { player: season.player, statistics: season.statistics, career: careerResult.status === 'fulfilled' ? careerResult.value : [], season: data.season, unavailable: careerResult.status === 'rejected' ? ['career'] : [] } }
  } catch (error) { return failure(error) }
})

export const getPlayerSupportingData = createServerFn({ method: 'GET' }).validator(supportSchema).handler(async ({ data }): Promise<PlayerSupportingResult> => {
  const params = { player: String(data.playerId) }
  const [trophies, sidelined, transfers] = await Promise.allSettled([
    apiFootballRequest<PlayerTrophy[]>({ path: 'trophies', params, ttl: CACHE_TTL.daily }).then((result) => result.data),
    apiFootballRequest<PlayerSidelined[]>({ path: 'sidelined', params, ttl: CACHE_TTL.daily }).then((result) => result.data),
    apiFootballRequest<PlayerTransferGroup[]>({ path: 'transfers', params, ttl: CACHE_TTL.daily }).then((result) => result.data),
  ])
  if ([trophies, sidelined, transfers].every((item) => item.status === 'rejected')) return failure(trophies.status === 'rejected' ? trophies.reason : undefined)
  return { ok: true, data: {
    trophies: trophies.status === 'fulfilled' ? trophies.value : [],
    sidelined: sidelined.status === 'fulfilled' ? sidelined.value : [],
    transfers: transfers.status === 'fulfilled' ? transfers.value : [],
    unavailable: [trophies.status === 'rejected' && 'trophies', sidelined.status === 'rejected' && 'sidelined', transfers.status === 'rejected' && 'transfers'].filter((item): item is string => Boolean(item)),
  } }
})

export const getPlayerComparison = createServerFn({ method: 'GET' }).validator(comparisonSchema).handler(async ({ data }): Promise<PlayerComparisonResult> => {
  try {
    const [leftResponse, rightResponse] = await Promise.all([
      apiFootballRequest<PlayerSeasonResponse[]>({ path: 'players', params: { id: String(data.leftId), season: String(data.season) }, ttl: CACHE_TTL.daily }).then((result) => result.data),
      apiFootballRequest<PlayerSeasonResponse[]>({ path: 'players', params: { id: String(data.rightId), season: String(data.season) }, ttl: CACHE_TTL.daily }).then((result) => result.data),
    ])
    const left = leftResponse.at(0)
    const right = rightResponse.at(0)
    if (!left || !right) return { ok: false, kind: 'not-found', message: 'One or both players have no statistics for the selected season.' }
    return { ok: true, left, right, season: data.season }
  } catch (error) {
    return failure(error)
  }
})
