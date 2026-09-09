import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CompetitionDetail } from '#/components/competition-detail'
import { absoluteUrl, breadcrumbJsonLd, seasonLabel, seoHead } from '#/lib/seo'
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
  head: ({ loaderData, params }) => {
    const result = loaderData?.result
    const season = result?.ok ? result.season : 2024
    const path = `/competitions/${params.leagueId}?season=${season}`
    if (!result?.ok) return seoHead({ title: 'Competition details — Football Explorer', description: 'Standings, teams and fixtures for this football competition.', path, noIndex: true })
    const name = result.competition.league.name
    const description = `Explore ${name} ${seasonLabel(season)} standings, teams, rounds and fixtures.`
    return seoHead({
      title: `${name} ${seasonLabel(season)} — Table, teams and fixtures`, description, path, image: result.competition.league.logo,
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${name} ${seasonLabel(season)}`, description, url: absoluteUrl(path), image: result.competition.league.logo },
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Competitions', path: '/competitions' }, { name, path }]),
      ],
    })
  },
  component: CompetitionPage,
})

function CompetitionPage() { const data = Route.useLoaderData(); return <CompetitionDetail {...data} /> }
