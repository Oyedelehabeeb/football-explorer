import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PlayerDetail } from '#/components/player-detail'
import { absoluteUrl, breadcrumbJsonLd, seasonLabel, seoHead } from '#/lib/seo'
import { getPlayerDetail } from '#/server/player-detail'

const searchSchema = z.object({ season: z.number().int().optional() })

export const Route = createFileRoute('/players/$playerId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ season: search.season ?? 2024 }),
  loader: ({ params, deps }) => {
    const playerId = Number(params.playerId)
    if (!Number.isInteger(playerId) || playerId <= 0) return { result: { ok: false as const, kind: 'not-found' as const, message: 'This player could not be found.' }, season: deps.season }
    return getPlayerDetail({ data: { playerId, season: deps.season } }).then((result) => ({ result, season: deps.season }))
  },
  head: ({ loaderData, params }) => {
    const season = loaderData?.season ?? 2024
    const path = `/players/${params.playerId}?season=${season}`
    const result = loaderData?.result
    if (!result?.ok) return seoHead({ title: 'Player details — Football Explorer', description: 'Player profile and season statistics.', path, noIndex: true })
    const player = result.data.player
    const description = `Explore ${player.name}’s profile and ${seasonLabel(season)} football statistics, including appearances, goals and assists.`
    return seoHead({
      title: `${player.name} — Profile and ${seasonLabel(season)} statistics`, description, path, image: player.photo, type: 'profile',
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'Person', name: player.name, url: absoluteUrl(path), image: player.photo, nationality: player.nationality || undefined, birthDate: player.birth.date || undefined, jobTitle: player.position || undefined },
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Players', path: '/players' }, { name: player.name, path }]),
      ],
    })
  },
  component: () => <PlayerDetail {...Route.useLoaderData()} />,
})
