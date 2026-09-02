import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { MatchDetail } from '#/components/match-detail'
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
  head: ({ loaderData }) => {
    const result = loaderData?.result
    const title = result?.ok ? `${result.match.teams.home.name} vs ${result.match.teams.away.name} — Football Explorer` : 'Match details — Football Explorer'
    return { meta: [{ title }, { name: 'description', content: result?.ok ? `Score, events, lineups and statistics for ${result.match.teams.home.name} vs ${result.match.teams.away.name}.` : 'Football match details.' }] }
  },
  component: MatchPage,
})

function MatchPage() {
  const { result, timezone } = Route.useLoaderData()
  return <MatchDetail result={result} timezone={timezone} />
}
