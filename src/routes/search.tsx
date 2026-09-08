import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { GlobalSearch } from '#/components/global-search'
import { getCurrentCompetitions } from '#/server/competitions'
import { searchPlayers } from '#/server/players'
import { getTeams } from '#/server/teams'

const searchSchema = z.object({ q: z.string().max(80).optional() })

export const Route = createFileRoute('/search')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ query: search.q?.trim() ?? '' }),
  loader: async ({ deps }) => {
    if (deps.query.length < 4) return { query: deps.query, result: null }
    const [competitions, teams, players] = await Promise.all([
      getCurrentCompetitions(),
      getTeams({ data: { mode: 'search', query: deps.query } }),
      searchPlayers({ data: { query: deps.query } }),
    ])
    return { query: deps.query, result: { competitions, teams, players } }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.query ? `Search: ${loaderData.query} — Football Explorer` : 'Search — Football Explorer' }, { name: 'description', content: 'Search football competitions, clubs and players from one place.' }] }),
  component: () => <GlobalSearch {...Route.useLoaderData()} />,
})
