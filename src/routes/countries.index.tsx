import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CountryExplorer } from '#/components/country-explorer'
import { getCountries } from '#/server/countries'

export const Route = createFileRoute('/countries/')({
  validateSearch: z.object({ q: z.string().max(80).optional() }),
  loader: () => getCountries(),
  head: () => ({ meta: [{ title: 'Explore football countries — Football Explorer' }, { name: 'description', content: 'Discover football leagues and cups by country.' }] }),
  component: () => <CountryExplorer result={Route.useLoaderData()} query={Route.useSearch().q ?? ''} />,
})
