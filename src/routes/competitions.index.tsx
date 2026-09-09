import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CompetitionExplorer } from '#/components/competition-explorer'
import { seoHead } from '#/lib/seo'
import { getCurrentCompetitions } from '#/server/competitions'

const searchSchema = z.object({
  q: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  type: z.enum(['all', 'league', 'cup']).optional(),
})

export const Route = createFileRoute('/competitions/')({
  validateSearch: searchSchema,
  loader: () => getCurrentCompetitions(),
  head: () => seoHead({ title: 'Explore football competitions — Football Explorer', description: 'Browse football leagues and cups covered in the 2024/25 season.', path: '/competitions' }),
  component: CompetitionsPage,
})

function CompetitionsPage() {
  return <CompetitionExplorer result={Route.useLoaderData()} search={Route.useSearch()} />
}
