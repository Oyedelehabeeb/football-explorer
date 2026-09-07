import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { TeamExplorer } from '#/components/team-explorer'
import { PRIORITY_LEAGUE_IDS } from '#/lib/league-priority'
import { getTeams } from '#/server/teams'

const searchSchema = z.object({ q: z.string().optional(), league: z.number().int().optional() })

export const Route = createFileRoute('/teams/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ query: search.q?.trim() ?? '', leagueId: search.league && PRIORITY_LEAGUE_IDS.some((id) => id === search.league) ? search.league : 39 }),
  loader: async ({ deps }) => ({ ...deps, result: deps.query.length >= 3 ? await getTeams({ data: { mode: 'search', query: deps.query } }) : await getTeams({ data: { mode: 'league', leagueId: deps.leagueId, season: 2024 } }) }),
  head: () => ({ meta: [{ title: 'Teams — Football Explorer' }, { name: 'description', content: 'Discover football clubs across Europe’s leading leagues and explore team profiles.' }] }),
  component: () => <TeamExplorer {...Route.useLoaderData()} />,
})
