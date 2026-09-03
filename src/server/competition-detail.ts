import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'
import { findCachedCompetition } from '#/server/competitions'

import type { Competition, CompetitionRound, CompetitionTeam, StandingRow } from '#/lib/competition'
import type { FixtureSummary } from '#/lib/football'

const inputSchema = z.object({ leagueId: z.number().int().positive(), season: z.number().int().min(1900).max(2200), round: z.string().max(100).optional(), timezone: z.string().min(1).max(64) })
const responseCache = new Map<string, { expiresAt: number; value: unknown[] }>()

export function findCachedCompetitionTeam(leagueId: number, season: number, teamId: number) {
  const url = new URL('https://v3.football.api-sports.io/teams')
  url.searchParams.set('league', String(leagueId))
  url.searchParams.set('season', String(season))
  const cached = responseCache.get(url.toString())
  if (!cached || cached.expiresAt <= Date.now()) return undefined
  return (cached.value as CompetitionTeam[]).find((item) => item.team.id === teamId)
}

export type CompetitionDetailResult =
  | { ok: true; competition: Competition; season: number; standings: StandingRow[][]; teams: CompetitionTeam[]; rounds: CompetitionRound[]; selectedRound: string | null; fixtures: FixtureSummary[]; unavailable: string[] }
  | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

async function request<T>(path: string, params: Record<string, string>, ttl: number, apiKey: string) {
  const url = new URL(`https://v3.football.api-sports.io/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const cacheKey = url.toString()
  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value as T[]
  const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
  if (response.status === 429) throw new Error('RATE_LIMIT')
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: T[] }
  const payloadError = apiFootballPayloadError(payload.errors)
  if (payloadError) throw new Error(payloadError.kind === 'rate-limit' ? 'RATE_LIMIT' : 'PROVIDER')
  if (!Array.isArray(payload.response)) throw new Error('PROVIDER')
  responseCache.set(cacheKey, { value: payload.response, expiresAt: Date.now() + ttl })
  return payload.response
}

function nearestRound(rounds: CompetitionRound[]) {
  const today = new Date().toISOString().slice(0, 10)
  const active = rounds.find((item) => item.dates.includes(today))
  if (active) return active.round
  const past = rounds.filter((item) => item.dates.some((date) => date <= today)).at(-1)
  return past?.round ?? rounds.at(0)?.round ?? null
}

export const getCompetitionDetail = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<CompetitionDetailResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  const common = { league: String(data.leagueId), season: String(data.season) }
  try {
    const cachedCompetition = findCachedCompetition(data.leagueId, data.season)
    const competition = cachedCompetition ?? (await request<Competition>('leagues', { id: String(data.leagueId), season: String(data.season) }, 60 * 60_000, apiKey)).at(0)
    if (!competition) return { ok: false, kind: 'not-found', message: 'This competition could not be found.' }

    const [standingsResult, teamsResult, roundsResult] = await Promise.allSettled([
      request<{ league: { standings: StandingRow[][] } }>('standings', common, 60 * 60_000, apiKey),
      request<CompetitionTeam>('teams', common, 24 * 60 * 60_000, apiKey),
      request<CompetitionRound>('fixtures/rounds', { ...common, dates: 'true', timezone: data.timezone }, 24 * 60 * 60_000, apiKey),
    ])
    const standings = standingsResult.status === 'fulfilled' ? standingsResult.value.at(0)?.league.standings ?? [] : []
    const teams = teamsResult.status === 'fulfilled' ? teamsResult.value : []
    const rounds = roundsResult.status === 'fulfilled' ? roundsResult.value : []
    const selectedRound = data.round && rounds.some((item) => item.round === data.round) ? data.round : nearestRound(rounds)
    let fixtures: FixtureSummary[] = []
    let fixturesUnavailable = false
    if (selectedRound) {
      try { fixtures = await request<FixtureSummary>('fixtures', { ...common, round: selectedRound, timezone: data.timezone }, 60 * 60_000, apiKey) } catch { fixturesUnavailable = true }
    }
    const unavailable = [standingsResult.status === 'rejected' && 'standings', teamsResult.status === 'rejected' && 'teams', roundsResult.status === 'rejected' && 'rounds', fixturesUnavailable && 'fixtures'].filter((item): item is string => Boolean(item))
    return { ok: true, competition, season: data.season, standings, teams, rounds, selectedRound, fixtures, unavailable }
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT') return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
    return { ok: false, kind: 'provider', message: 'Competition details are unavailable for this season on the current API plan.' }
  }
})
