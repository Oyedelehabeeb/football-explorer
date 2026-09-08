import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { MatchOutlook, PredictionSide } from '#/lib/prediction'

const schema = z.object({ fixtureId: z.number().int().positive() })
const cache = new Map<number, { expiresAt: number; outlook: MatchOutlook | null }>()

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
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  const cached = cache.get(data.fixtureId)
  if (cached && cached.expiresAt > Date.now()) return { ok: true, outlook: cached.outlook }
  const url = new URL('https://v3.football.api-sports.io/predictions')
  url.searchParams.set('fixture', String(data.fixtureId))
  try {
    const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
    if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
    if (!response.ok) return { ok: false, kind: 'network', message: 'The football data service could not complete this request.' }
    const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: ProviderPrediction[] }
    const payloadError = apiFootballPayloadError(payload.errors)
    if (payloadError) return { ok: false, kind: payloadError.kind, message: payloadError.message }
    if (!Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'The provider returned an unexpected prediction response.' }
    const item = payload.response.at(0)
    const outlook = item?.teams?.home && item.teams.away ? { advantage: { id: item.predictions?.winner?.id ?? null, name: item.predictions?.winner?.name ?? null }, percent: { home: item.predictions?.percent?.home ?? null, draw: item.predictions?.percent?.draw ?? null, away: item.predictions?.percent?.away ?? null }, comparison: { form: pair(item.comparison, 'form'), attack: pair(item.comparison, 'att'), defence: pair(item.comparison, 'def'), poisson: pair(item.comparison, 'poisson_distribution'), headToHead: pair(item.comparison, 'h2h'), goals: pair(item.comparison, 'goals'), total: pair(item.comparison, 'total') }, home: side(item.teams.home), away: side(item.teams.away) } satisfies MatchOutlook : null
    cache.set(data.fixtureId, { outlook, expiresAt: Date.now() + 60 * 60_000 })
    return { ok: true, outlook }
  } catch { return { ok: false, kind: 'network', message: 'The football data service could not be reached.' } }
})
