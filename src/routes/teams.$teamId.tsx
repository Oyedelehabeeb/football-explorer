import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { TeamDetail } from '#/components/team-detail'
import { absoluteUrl, breadcrumbJsonLd, seasonLabel, seoHead } from '#/lib/seo'
import { getTeamDetail } from '#/server/team-detail'

const searchSchema = z.object({ league: z.number().int().positive().optional(), season: z.number().int().optional(), timezone: z.string().min(1).max(64).optional() })

export const Route = createFileRoute('/teams/$teamId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ leagueId: search.league, season: search.season ?? 2024, timezone: search.timezone ?? 'UTC' }),
  loader: ({ params, deps }) => {
    const teamId = Number(params.teamId)
    if (!Number.isInteger(teamId) || teamId <= 0) return { timezone: deps.timezone, season: deps.season, leagueId: deps.leagueId, result: { ok: false as const, kind: 'not-found' as const, message: 'This team could not be found.' } }
    return getTeamDetail({ data: { teamId, ...deps } }).then((result) => ({ result, timezone: deps.timezone, season: deps.season, leagueId: deps.leagueId }))
  },
  head: ({ loaderData, params }) => {
    const season = loaderData?.season ?? 2024
    const league = loaderData?.leagueId ? `&league=${loaderData.leagueId}` : ''
    const path = `/teams/${params.teamId}?season=${season}${league}`
    const result = loaderData?.result
    if (!result?.ok) return seoHead({ title: 'Team details — Football Explorer', description: 'Team profile, squad, form, fixtures and season performance.', path, noIndex: true })
    const team = result.data.team.team
    const description = `Explore ${team.name}’s squad, fixtures and ${seasonLabel(season)} season performance.`
    return seoHead({
      title: `${team.name} — Squad, fixtures and statistics`, description, path, image: team.logo,
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'SportsTeam', name: team.name, url: absoluteUrl(path), logo: team.logo, foundingDate: team.founded || undefined, sport: 'Football' },
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Teams', path: '/teams' }, { name: team.name, path }]),
      ],
    })
  },
  component: TeamPage,
})

function TeamPage() { return <TeamDetail {...Route.useLoaderData()} /> }
