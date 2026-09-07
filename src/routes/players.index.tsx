import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PlayerExplorer } from '#/components/player-explorer'
import { searchPlayers } from '#/server/players'

const searchSchema = z.object({ q: z.string().optional() })

export const Route = createFileRoute('/players/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ query: search.q?.trim() ?? '' }),
  loader: async ({ deps }) => ({ query: deps.query, result: deps.query.length >= 4 ? await searchPlayers({ data: { query: deps.query } }) : null }),
  head: () => ({ meta: [{ title: 'Player search — Football Explorer' }, { name: 'description', content: 'Search football players and explore profiles, statistics, careers and honours.' }] }),
  component: () => <PlayerExplorer {...Route.useLoaderData()} />,
})
