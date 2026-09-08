import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { MatchOutlook, PredictionSide } from '#/lib/prediction'

const schema = z.object({ fixtureId: z.number().int().positive() })

interface ProviderSide {
  id: number; name: string; logo: string
  last_5?: { played?: number | null; form?: string | null; att?: string | null; def?: string | null; goals?: { for?: { total?: number | null; average?: string | null }; against?: { total?: number | null; average?: string | null } } }
  league?: { form?: string | null }
}
interface ProviderPrediction {
  predictions?: { winner?: { id?: number | null; name?: string | null }; percent?: { home?: string | null; draw?: string | null; away?: string | null } }
  teams?: { home?: ProviderSide; away?: ProviderSide }
  comparison?: Record<string, { home?: string | null; away?: string | null }>
}

export type PredictionResult = { ok: true; outlook: MatchOutlook | null } | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

function side(team: ProviderSide): PredictionSide {
  return { id: team.id, name: team.name, logo: team.logo, recent: { played: team.last_5?.played ?? null, form: team.last_5?.form ?? null, attack: team.last_5?.att ?? null, defence: team.last_5?.def ?? null, goalsFor: { total: team.last_5?.goals?.for?.total ?? null, average: team.last_5?.goals?.for?.average ?? null }, goalsAgainst: { total: team.last_5?.goals?.against?.total ?? null, average: team.last_5?.goals?.against?.average ?? null } }, leagueForm: team.league?.form ?? null }
}

const pair = (value: ProviderPrediction['comparison'], key: string) => ({ home: value?.[key]?.home ?? null, away: value?.[key]?.away ?? null })

export const getMatchPrediction = createServerFn({ method: 'GET' }).validator(schema).handler(async ({ data }): Promise<PredictionResult> => {
  try {
    const response = await apiFootballRequest<ProviderPrediction[]>({ path: 'predictions', params: { fixture: String(data.fixtureId) }, ttl: CACHE_TTL.hourly })
    const item = response.data.at(0)
    const outlook = item?.teams?.home && item.teams.away ? { advantage: { id: item.predictions?.winner?.id ?? null, name: item.predictions?.winner?.name ?? null }, percent: { home: item.predictions?.percent?.home ?? null, draw: item.predictions?.percent?.draw ?? null, away: item.predictions?.percent?.away ?? null }, comparison: { form: pair(item.comparison, 'form'), attack: pair(item.comparison, 'att'), defence: pair(item.comparison, 'def'), poisson: pair(item.comparison, 'poisson_distribution'), headToHead: pair(item.comparison, 'h2h'), goals: pair(item.comparison, 'goals'), total: pair(item.comparison, 'total') }, home: side(item.teams.home), away: side(item.teams.away) } satisfies MatchOutlook : null
    return { ok: true, outlook }
  } catch (error) { return apiFootballError(error, 'The football data service could not be reached.') }
})
