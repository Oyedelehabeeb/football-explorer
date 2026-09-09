import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { MatchDetail } from '#/components/match-detail'
import { absoluteUrl, breadcrumbJsonLd, seoHead } from '#/lib/seo'
import { getMatchDetail } from '#/server/matches'

const searchSchema = z.object({ timezone: z.string().min(1).max(64).optional() })

export const Route = createFileRoute('/matches/$fixtureId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ timezone: search.timezone ?? 'UTC' }),
  loader: ({ params, deps }) => {
    const fixtureId = Number(params.fixtureId)
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) return { timezone: deps.timezone, result: { ok: false as const, kind: 'not-found' as const, message: 'This fixture could not be found.' } }
    return getMatchDetail({ data: { fixtureId, timezone: deps.timezone } }).then((result) => ({ timezone: deps.timezone, result }))
  },
  head: ({ loaderData, params }) => {
    const result = loaderData?.result
    const path = `/matches/${params.fixtureId}`
    if (!result?.ok) return seoHead({ title: 'Match details — Football Explorer', description: 'Football match details.', path, noIndex: true })
    const match = result.match
    const name = `${match.teams.home.name} vs ${match.teams.away.name}`
    const description = `Score, events, lineups and statistics for ${name} in ${match.league.name}.`
    return seoHead({
      title: `${name} — Match details and statistics`, description, path, image: match.league.logo, type: 'article',
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'SportsEvent', name, url: absoluteUrl(path), startDate: match.fixture.date, sport: 'Football', homeTeam: { '@type': 'SportsTeam', name: match.teams.home.name, logo: match.teams.home.logo }, awayTeam: { '@type': 'SportsTeam', name: match.teams.away.name, logo: match.teams.away.logo }, location: match.fixture.venue.name ? { '@type': 'Place', name: match.fixture.venue.name, address: match.fixture.venue.city || undefined } : undefined },
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Matches', path: '/' }, { name, path }]),
      ],
    })
  },
  component: MatchPage,
})

function MatchPage() {
  const { result, timezone } = Route.useLoaderData()
  return <MatchDetail result={result} timezone={timezone} />
}
