import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PlayerComparison } from '#/components/player-comparison'
import { seoHead } from '#/lib/seo'
import { getPlayerComparison } from '#/server/player-detail'

const searchSchema = z.object({
  left: z.number().int().positive().optional(),
  right: z.number().int().positive().optional(),
  season: z.number().int().min(1900).max(2200).optional(),
})

export const Route = createFileRoute('/players/compare')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ left: search.left, right: search.right, season: search.season ?? 2024 }),
  loader: async ({ deps }) => ({ ...deps, result: deps.left && deps.right && deps.left !== deps.right ? await getPlayerComparison({ data: { leftId: deps.left, rightId: deps.right, season: deps.season } }) : null }),
  head: () => seoHead({ title: 'Compare players — Football Explorer', description: 'Compare football player performance across a season and shared competitions.', path: '/players/compare', noIndex: true }),
  component: () => <PlayerComparison {...Route.useLoaderData()} />,
})
