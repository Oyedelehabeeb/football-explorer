import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { MatchdayExplorer } from '#/components/matchday-explorer'
import { dateInTimezone } from '#/lib/football'
import { getMatchday } from '#/server/fixtures'

const searchSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), timezone: z.string().min(1).max(64).optional(), filter: z.enum(['all', 'live', 'upcoming', 'finished']).optional() })

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ date: search.date ?? dateInTimezone(new Date(), search.timezone ?? 'UTC'), timezone: search.timezone ?? 'UTC', filter: search.filter ?? 'all' }),
  loader: async ({ deps }) => ({ ...deps, initialData: await getMatchday({ data: { date: deps.date, timezone: deps.timezone } }) }),
  component: Home,
})

function Home() { return <MatchdayExplorer {...Route.useLoaderData()} /> }
