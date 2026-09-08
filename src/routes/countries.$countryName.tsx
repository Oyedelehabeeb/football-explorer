import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CountryDetail } from '#/components/country-detail'
import { getCountryCompetitions } from '#/server/countries'

const searchSchema = z.object({ q: z.string().max(80).optional(), type: z.enum(['all', 'league', 'cup']).optional(), status: z.enum(['all', 'active', 'historical']).optional() })

export const Route = createFileRoute('/countries/$countryName')({
  validateSearch: searchSchema,
  loader: ({ params }) => getCountryCompetitions({ data: { country: params.countryName } }),
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.ok ? `${loaderData.country.name} football — Football Explorer` : 'Country football — Football Explorer' }, { name: 'description', content: 'Explore leagues and cups available for this football country.' }] }),
  component: () => <CountryDetail result={Route.useLoaderData()} search={Route.useSearch()} />,
})
