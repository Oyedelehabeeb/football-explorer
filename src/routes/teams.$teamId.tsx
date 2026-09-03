import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { TeamDetail } from '#/components/team-detail'
import { getTeamDetail } from '#/server/team-detail'

const searchSchema = z.object({ league: z.number().int().positive().optional(), season: z.number().int().optional(), timezone: z.string().min(1).max(64).optional() })

export const Route = createFileRoute('/teams/$teamId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ leagueId: search.league, season: search.season ?? 2024, timezone: search.timezone ?? 'UTC' }),
  loader: ({ params, deps }) => {
    const teamId = Number(params.teamId)
    if (!Number.isInteger(teamId) || teamId <= 0) return { timezone: deps.timezone, result: { ok: false as const, kind: 'not-found' as const, message: 'This team could not be found.' } }
    return getTeamDetail({ data: { teamId, ...deps } }).then((result) => ({ result, timezone: deps.timezone }))
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.result.ok ? `${loaderData.result.data.team.team.name} — Football Explorer` : 'Team details — Football Explorer' }, { name: 'description', content: 'Team profile, squad, form, fixtures and season performance.' }] }),
  component: TeamPage,
})

function TeamPage() { return <TeamDetail {...Route.useLoaderData()} /> }
