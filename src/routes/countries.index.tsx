import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CountryExplorer } from '#/components/country-explorer'
import { seoHead } from '#/lib/seo'
import { getCountries } from '#/server/countries'

export const Route = createFileRoute('/countries/')({
  validateSearch: z.object({ q: z.string().max(80).optional() }),
  loader: () => getCountries(),
  head: () => seoHead({ title: 'Explore football countries — Football Explorer', description: 'Discover football leagues and cups by country.', path: '/countries' }),
  component: () => <CountryExplorer result={Route.useLoaderData()} query={Route.useSearch().q ?? ''} />,
})
