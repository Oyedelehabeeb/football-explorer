import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { Competition } from '#/lib/competition'
import type { FootballCountry } from '#/lib/country'

export type CountriesResult = { ok: true; countries: FootballCountry[] } | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }
export type CountryCompetitionsResult = { ok: true; country: FootballCountry; competitions: Competition[] } | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

const countrySchema = z.object({ country: z.string().min(1).max(80) })
const failure = (error: unknown) => apiFootballError(error, 'Country data is temporarily unavailable.')

async function countries() {
  return (await apiFootballRequest<FootballCountry[]>({ path: 'countries', ttl: CACHE_TTL.daily })).data
}

export const getCountries = createServerFn({ method: 'GET' }).handler(async (): Promise<CountriesResult> => {
  try { return { ok: true, countries: await countries() } } catch (error) { return failure(error) }
})

export const getCountryCompetitions = createServerFn({ method: 'GET' }).validator(countrySchema).handler(async ({ data }): Promise<CountryCompetitionsResult> => {
  try {
    const availableCountries = await countries()
    const country = availableCountries.find((item) => item.name.toLocaleLowerCase() === data.country.toLocaleLowerCase())
    if (!country) return { ok: false, kind: 'not-found', message: 'This country is not covered by the football data provider.' }
    const response = await apiFootballRequest<Competition[]>({ path: 'leagues', params: { country: country.name }, ttl: CACHE_TTL.hourly })
    return { ok: true, country, competitions: response.data }
  } catch (error) { return failure(error) }
})
