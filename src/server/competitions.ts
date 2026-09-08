import { createServerFn } from '@tanstack/react-start'

import { apiFootballError, apiFootballRequest, CACHE_TTL, peekApiFootball } from '#/server/api-football'

import type { Competition } from '#/lib/competition'

const CURRENT_SEASON = 2024

export type CompetitionsResult =
  | { ok: true; competitions: Competition[]; fetchedAt: string }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export function findCachedCompetition(leagueId: number, season: number) {
  const competitions = peekApiFootball<Competition[]>('leagues', { season: String(CURRENT_SEASON) })
  return competitions?.find((competition) => competition.league.id === leagueId && competition.seasons.some((item) => item.year === season))
}

export const getCurrentCompetitions = createServerFn({ method: 'GET' }).handler(async (): Promise<CompetitionsResult> => {
  try {
    const response = await apiFootballRequest<Competition[]>({ path: 'leagues', params: { season: String(CURRENT_SEASON) }, ttl: CACHE_TTL.hourly })
    return { ok: true, competitions: response.data, fetchedAt: response.fetchedAt }
  } catch (error) {
    return apiFootballError(error, 'Competition data is temporarily unavailable. Please try again.')
  }
})
