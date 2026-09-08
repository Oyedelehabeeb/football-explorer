import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { PlayerCareerTeam, PlayerDetailData, PlayerSeasonResponse, PlayerSidelined, PlayerSupportingData, PlayerTransferGroup, PlayerTrophy } from '#/lib/player'

const detailSchema = z.object({ playerId: z.number().int().positive(), season: z.number().int().min(1900).max(2200) })
const supportSchema = z.object({ playerId: z.number().int().positive() })
const comparisonSchema = z.object({ leftId: z.number().int().positive(), rightId: z.number().int().positive(), season: z.number().int().min(1900).max(2200) }).refine((value) => value.leftId !== value.rightId, 'Players must be different')
const cache = new Map<string, { expiresAt: number; value: unknown }>()

export type PlayerDetailResult = { ok: true; data: PlayerDetailData } | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }
export type PlayerSupportingResult = { ok: true; data: PlayerSupportingData } | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }
export type PlayerComparisonResult = { ok: true; left: PlayerSeasonResponse; right: PlayerSeasonResponse; season: number } | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

async function request<T>(path: string, params: Record<string, string>, ttl: number, apiKey: string): Promise<T> {
  const url = new URL(`https://v3.football.api-sports.io/${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  const cached = cache.get(url.toString())
  if (cached && cached.expiresAt > Date.now()) return cached.value as T
  const response = await fetch(url, { headers: { 'x-apisports-key': apiKey } })
  if (response.status === 429) throw new Error('RATE_LIMIT')
  if (!response.ok) throw new Error('PROVIDER')
  const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: T }
  const payloadError = apiFootballPayloadError(payload.errors)
  if (payloadError) throw new Error(payloadError.kind === 'rate-limit' ? 'RATE_LIMIT' : 'PROVIDER')
  if (payload.response === undefined) throw new Error('PROVIDER')
  cache.set(url.toString(), { value: payload.response, expiresAt: Date.now() + ttl })
  return payload.response
}

const failure = (error: unknown) => error instanceof Error && error.message === 'RATE_LIMIT'
  ? { ok: false as const, kind: 'rate-limit' as const, message: 'The football data service is temporarily rate-limited.' }
  : { ok: false as const, kind: 'provider' as const, message: 'Player details are temporarily unavailable.' }

export const getPlayerDetail = createServerFn({ method: 'GET' }).validator(detailSchema).handler(async ({ data }): Promise<PlayerDetailResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  try {
    const [seasonResult, careerResult] = await Promise.allSettled([
      request<PlayerSeasonResponse[]>('players', { id: String(data.playerId), season: String(data.season) }, 24 * 60 * 60_000, apiKey),
      request<PlayerCareerTeam[]>('players/teams', { player: String(data.playerId) }, 7 * 24 * 60 * 60_000, apiKey),
    ])
    if (seasonResult.status === 'rejected') return failure(seasonResult.reason)
    const season = seasonResult.value.at(0)
    if (!season) return { ok: false, kind: 'not-found', message: 'This player could not be found for the selected season.' }
    return { ok: true, data: { player: season.player, statistics: season.statistics, career: careerResult.status === 'fulfilled' ? careerResult.value : [], season: data.season, unavailable: careerResult.status === 'rejected' ? ['career'] : [] } }
  } catch (error) { return failure(error) }
})

export const getPlayerSupportingData = createServerFn({ method: 'GET' }).validator(supportSchema).handler(async ({ data }): Promise<PlayerSupportingResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  const params = { player: String(data.playerId) }
  const [trophies, sidelined, transfers] = await Promise.allSettled([
    request<PlayerTrophy[]>('trophies', params, 24 * 60 * 60_000, apiKey),
    request<PlayerSidelined[]>('sidelined', params, 24 * 60 * 60_000, apiKey),
    request<PlayerTransferGroup[]>('transfers', params, 24 * 60 * 60_000, apiKey),
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
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  try {
    const [leftResponse, rightResponse] = await Promise.all([
      request<PlayerSeasonResponse[]>('players', { id: String(data.leftId), season: String(data.season) }, 24 * 60 * 60_000, apiKey),
      request<PlayerSeasonResponse[]>('players', { id: String(data.rightId), season: String(data.season) }, 24 * 60 * 60_000, apiKey),
    ])
    const left = leftResponse.at(0)
    const right = rightResponse.at(0)
    if (!left || !right) return { ok: false, kind: 'not-found', message: 'One or both players have no statistics for the selected season.' }
    return { ok: true, left, right, season: data.season }
  } catch (error) {
    return failure(error)
  }
})
