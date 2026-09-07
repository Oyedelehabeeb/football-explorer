import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PlayerDetail } from '#/components/player-detail'
import { getPlayerDetail } from '#/server/player-detail'

const searchSchema = z.object({ season: z.number().int().optional() })

export const Route = createFileRoute('/players/$playerId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ season: search.season ?? 2024 }),
  loader: ({ params, deps }) => {
    const playerId = Number(params.playerId)
    if (!Number.isInteger(playerId) || playerId <= 0) return { result: { ok: false as const, kind: 'not-found' as const, message: 'This player could not be found.' } }
    return getPlayerDetail({ data: { playerId, season: deps.season } }).then((result) => ({ result }))
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.result.ok ? `${loaderData.result.data.player.name} — Football Explorer` : 'Player details — Football Explorer' }, { name: 'description', content: 'Player profile, competition statistics, career teams, honours and availability history.' }] }),
  component: () => <PlayerDetail {...Route.useLoaderData()} />,
})
