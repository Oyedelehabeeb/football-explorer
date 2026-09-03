import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'
import { findCachedCompetitionTeam } from '#/server/competition-detail'

import type { FixtureSummary } from '#/lib/football'
import type { CoachProfile, SquadResponse, TeamDetailData, TeamProfile, TeamSeasonStatistics } from '#/lib/team'

const inputSchema = z.object({ teamId: z.number().int().positive(), leagueId: z.number().int().positive().optional(), season: z.number().int().min(1900).max(2200), timezone: z.string().min(1).max(64) })
const cache = new Map<string, { expiresAt: number; value: unknown }>()

export type TeamDetailResult =
  | { ok: true; data: TeamDetailData }
  | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

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
  if (payloadError) throw new Error(payloadError.kind === 'rate-limit' ? 'RATE_LIMIT' : `PROVIDER:${path}:${payloadError.message}`)
  if (payload.response === undefined) throw new Error('PROVIDER')
  cache.set(url.toString(), { value: payload.response, expiresAt: Date.now() + ttl })
  return payload.response
}

function currentCoach(coaches: CoachProfile[], teamId: number) {
  return coaches.find((coach) => coach.career.some((entry) => entry.team.id === teamId && entry.end === null)) ?? null
}

export const getTeamDetail = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<TeamDetailResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  try {
    const reusedTeam = data.leagueId ? findCachedCompetitionTeam(data.leagueId, data.season, data.teamId) : undefined
    const team = reusedTeam ?? (await request<TeamProfile[]>('teams', { id: String(data.teamId) }, 24 * 60 * 60_000, apiKey)).at(0)
    if (!team) return { ok: false, kind: 'not-found', message: 'This team could not be found.' }

    const calls = [
      request<SquadResponse[]>('players/squads', { team: String(data.teamId) }, 7 * 24 * 60 * 60_000, apiKey),
      request<CoachProfile[]>('coachs', { team: String(data.teamId) }, 24 * 60 * 60_000, apiKey),
      request<FixtureSummary[]>('fixtures', { team: String(data.teamId), season: String(data.season), timezone: data.timezone }, 24 * 60 * 60_000, apiKey),
    ] as const
    const [squadResult, coachResult, fixturesResult] = await Promise.allSettled(calls)
    const statsResult = data.leagueId
      ? await Promise.allSettled([request<TeamSeasonStatistics>('teams/statistics', { team: String(data.teamId), league: String(data.leagueId), season: String(data.season) }, 24 * 60 * 60_000, apiKey)]).then(([result]) => result)
      : null
    const squad = squadResult.status === 'fulfilled' ? squadResult.value.at(0)?.players ?? [] : []
    const coaches = coachResult.status === 'fulfilled' ? coachResult.value : []
    const fixtures = fixturesResult.status === 'fulfilled' ? fixturesResult.value : []
    const statistics = statsResult?.status === 'fulfilled' ? statsResult.value : null
    const unavailable = [squadResult.status === 'rejected' && 'squad', coachResult.status === 'rejected' && 'coach', fixturesResult.status === 'rejected' && 'fixtures', statsResult?.status === 'rejected' && 'statistics'].filter((item): item is string => Boolean(item))
    return { ok: true, data: { team, season: data.season, leagueId: data.leagueId ?? null, squad, coach: currentCoach(coaches, data.teamId), statistics, fixtures, unavailable } }
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT') return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
    return { ok: false, kind: 'provider', message: 'Team details are temporarily unavailable.' }
  }
})
