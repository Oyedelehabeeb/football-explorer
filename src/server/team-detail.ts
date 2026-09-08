import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'
import { findCachedCompetitionTeam } from '#/server/competition-detail'

import type { FixtureSummary } from '#/lib/football'
import type { CoachProfile, SquadResponse, TeamDetailData, TeamProfile, TeamSeasonStatistics } from '#/lib/team'

const inputSchema = z.object({ teamId: z.number().int().positive(), leagueId: z.number().int().positive().optional(), season: z.number().int().min(1900).max(2200), timezone: z.string().min(1).max(64) })

export type TeamDetailResult =
  | { ok: true; data: TeamDetailData }
  | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

function currentCoach(coaches: CoachProfile[], teamId: number) {
  return coaches.find((coach) => coach.career.some((entry) => entry.team.id === teamId && entry.end === null)) ?? null
}

export const getTeamDetail = createServerFn({ method: 'GET' }).validator(inputSchema).handler(async ({ data }): Promise<TeamDetailResult> => {
  try {
    const reusedTeam = data.leagueId ? findCachedCompetitionTeam(data.leagueId, data.season, data.teamId) : undefined
    const team = reusedTeam ?? (await apiFootballRequest<TeamProfile[]>({ path: 'teams', params: { id: String(data.teamId) }, ttl: CACHE_TTL.daily })).data.at(0)
    if (!team) return { ok: false, kind: 'not-found', message: 'This team could not be found.' }

    const calls = [
      apiFootballRequest<SquadResponse[]>({ path: 'players/squads', params: { team: String(data.teamId) }, ttl: CACHE_TTL.weekly }).then((result) => result.data),
      apiFootballRequest<CoachProfile[]>({ path: 'coachs', params: { team: String(data.teamId) }, ttl: CACHE_TTL.daily }).then((result) => result.data),
      apiFootballRequest<FixtureSummary[]>({ path: 'fixtures', params: { team: String(data.teamId), season: String(data.season), timezone: data.timezone }, ttl: CACHE_TTL.daily }).then((result) => result.data),
    ] as const
    const [squadResult, coachResult, fixturesResult] = await Promise.allSettled(calls)
    const statsResult = data.leagueId
      ? await Promise.allSettled([apiFootballRequest<TeamSeasonStatistics>({ path: 'teams/statistics', params: { team: String(data.teamId), league: String(data.leagueId), season: String(data.season) }, ttl: CACHE_TTL.daily }).then((result) => result.data)]).then(([result]) => result)
      : null
    const squad = squadResult.status === 'fulfilled' ? squadResult.value.at(0)?.players ?? [] : []
    const coaches = coachResult.status === 'fulfilled' ? coachResult.value : []
    const fixtures = fixturesResult.status === 'fulfilled' ? fixturesResult.value : []
    const statistics = statsResult?.status === 'fulfilled' ? statsResult.value : null
    const unavailable = [squadResult.status === 'rejected' && 'squad', coachResult.status === 'rejected' && 'coach', fixturesResult.status === 'rejected' && 'fixtures', statsResult?.status === 'rejected' && 'statistics'].filter((item): item is string => Boolean(item))
    return { ok: true, data: { team, season: data.season, leagueId: data.leagueId ?? null, squad, coach: currentCoach(coaches, data.teamId), statistics, fixtures, unavailable } }
  } catch (error) {
    return apiFootballError(error, 'Team details are temporarily unavailable.')
  }
})
