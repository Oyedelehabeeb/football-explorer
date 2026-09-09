import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CountryDetail } from '#/components/country-detail'
import { absoluteUrl, breadcrumbJsonLd, seoHead } from '#/lib/seo'
import { getCountryCompetitions } from '#/server/countries'

const searchSchema = z.object({ q: z.string().max(80).optional(), type: z.enum(['all', 'league', 'cup']).optional(), status: z.enum(['all', 'active', 'historical']).optional() })

export const Route = createFileRoute('/countries/$countryName')({
  validateSearch: searchSchema,
  loader: ({ params }) => getCountryCompetitions({ data: { country: params.countryName } }),
  head: ({ loaderData, params }) => {
    const path = `/countries/${encodeURIComponent(params.countryName)}`
    if (!loaderData?.ok) return seoHead({ title: 'Country football — Football Explorer', description: 'Explore football leagues and cups by country.', path, noIndex: true })
    const name = loaderData.country.name
    const description = `Explore football leagues and cups from ${name}, including active and historical competitions.`
    return seoHead({
      title: `${name} football leagues and cups — Football Explorer`, description, path, image: loaderData.country.flag,
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${name} football`, description, url: absoluteUrl(path) },
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Countries', path: '/countries' }, { name, path }]),
      ],
    })
  },
  component: () => <CountryDetail result={Route.useLoaderData()} search={Route.useSearch()} />,
})
