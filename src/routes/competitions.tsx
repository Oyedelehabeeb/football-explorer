import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CompetitionExplorer } from '#/components/competition-explorer'
import { getCurrentCompetitions } from '#/server/competitions'

const searchSchema = z.object({
  q: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  type: z.enum(['all', 'league', 'cup']).optional(),
})

export const Route = createFileRoute('/competitions')({
  validateSearch: searchSchema,
  loader: () => getCurrentCompetitions(),
  head: () => ({ meta: [{ title: 'Explore football competitions — Football Explorer' }, { name: 'description', content: 'Browse current football leagues and cups by country, type and season.' }] }),
  component: CompetitionsPage,
})

function CompetitionsPage() {
  return <CompetitionExplorer result={Route.useLoaderData()} search={Route.useSearch()} />
}
