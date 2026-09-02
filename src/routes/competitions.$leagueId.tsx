import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CompetitionDetail } from '#/components/competition-detail'
import { getCompetitionDetail } from '#/server/competition-detail'

const searchSchema = z.object({ season: z.number().int().optional(), round: z.string().max(100).optional(), timezone: z.string().min(1).max(64).optional() })

export const Route = createFileRoute('/competitions/$leagueId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ season: search.season ?? 2024, round: search.round, timezone: search.timezone ?? 'UTC' }),
  loader: ({ params, deps }) => {
    const leagueId = Number(params.leagueId)
    if (!Number.isInteger(leagueId) || leagueId <= 0) return { timezone: deps.timezone, result: { ok: false as const, kind: 'not-found' as const, message: 'This competition could not be found.' } }
    return getCompetitionDetail({ data: { leagueId, season: deps.season, round: deps.round, timezone: deps.timezone } }).then((result) => ({ timezone: deps.timezone, result }))
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.result.ok ? `${loaderData.result.competition.league.name} — Football Explorer` : 'Competition details — Football Explorer' }, { name: 'description', content: 'Standings, teams and fixtures for this football competition.' }] }),
  component: CompetitionPage,
})

function CompetitionPage() { const data = Route.useLoaderData(); return <CompetitionDetail {...data} /> }
