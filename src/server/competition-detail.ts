import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL, peekApiFootball } from '#/server/api-football'
import { findCachedCompetition } from '#/server/competitions'

import type { Competition, CompetitionRound, CompetitionTeam, StandingRow } from '#/lib/competition'
import type { FixtureSummary } from '#/lib/football'

const inputSchema = z.object({ leagueId: z.number().int().positive(), season: z.number().int().min(1900).max(2200), round: z.string().max(100).optional(), timezone: z.string().min(1).max(64) })
export function findCachedCompetitionTeam(leagueId: number, season: number, teamId: number) {
  return peekApiFootball<CompetitionTeam[]>('teams', { league: String(leagueId), season: String(season) })?.find((item) => item.team.id === teamId)
}

export type CompetitionDetailResult =
  | { ok: true; competition: Competition; season: number; standings: StandingRow[][]; teams: CompetitionTeam[]; rounds: CompetitionRound[]; selectedRound: string | null; fixtures: FixtureSummary[]; unavailable: string[] }
  | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

const request = async <T,>(path: string, params: Record<string, string>, ttl: number) =>
  (await apiFootballRequest<T[]>({ path, params, ttl })).data

function nearestRound(rounds: CompetitionRound[]) {
  const today = new Date().toISOString().slice(0, 10)
  const active = rounds.find((item) => item.dates.includes(today))
  if (active) return active.round
  const past = rounds.filter((item) => item.dates.some((date) => date <= today)).at(-1)
  return past?.round ?? rounds.at(0)?.round ?? null
}

export const getCompetitionDetail = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<CompetitionDetailResult> => {
  const common = { league: String(data.leagueId), season: String(data.season) }
  try {
    const cachedCompetition = findCachedCompetition(data.leagueId, data.season)
    const competition = cachedCompetition ?? (await request<Competition>('leagues', { id: String(data.leagueId), season: String(data.season) }, CACHE_TTL.hourly)).at(0)
    if (!competition) return { ok: false, kind: 'not-found', message: 'This competition could not be found.' }

    const [standingsResult, teamsResult, roundsResult] = await Promise.allSettled([
      request<{ league: { standings: StandingRow[][] } }>('standings', common, CACHE_TTL.hourly),
      request<CompetitionTeam>('teams', common, CACHE_TTL.daily),
      request<CompetitionRound>('fixtures/rounds', { ...common, dates: 'true', timezone: data.timezone }, CACHE_TTL.daily),
    ])
    const standings = standingsResult.status === 'fulfilled' ? standingsResult.value.at(0)?.league.standings ?? [] : []
    const teams = teamsResult.status === 'fulfilled' ? teamsResult.value : []
    const rounds = roundsResult.status === 'fulfilled' ? roundsResult.value : []
    const selectedRound = data.round && rounds.some((item) => item.round === data.round) ? data.round : nearestRound(rounds)
    let fixtures: FixtureSummary[] = []
    let fixturesUnavailable = false
    if (selectedRound) {
      try { fixtures = await request<FixtureSummary>('fixtures', { ...common, round: selectedRound, timezone: data.timezone }, CACHE_TTL.hourly) } catch { fixturesUnavailable = true }
    }
    const unavailable = [standingsResult.status === 'rejected' && 'standings', teamsResult.status === 'rejected' && 'teams', roundsResult.status === 'rejected' && 'rounds', fixturesUnavailable && 'fixtures'].filter((item): item is string => Boolean(item))
    return { ok: true, competition, season: data.season, standings, teams, rounds, selectedRound, fixtures, unavailable }
  } catch (error) {
    return apiFootballError(error, 'Competition details are unavailable for this season on the current API plan.')
  }
})
