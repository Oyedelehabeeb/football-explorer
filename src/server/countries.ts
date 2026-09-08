import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { Competition } from '#/lib/competition'
import type { FootballCountry } from '#/lib/country'

export type CountriesResult = { ok: true; countries: FootballCountry[] } | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }
export type CountryCompetitionsResult = { ok: true; country: FootballCountry; competitions: Competition[] } | { ok: false; kind: 'configuration' | 'not-found' | 'rate-limit' | 'provider' | 'network'; message: string }

const countrySchema = z.object({ country: z.string().min(1).max(80) })
let countriesCache: { expiresAt: number; value: FootballCountry[] } | undefined
const competitionCache = new Map<string, { expiresAt: number; value: Competition[] }>()

async function request<T>(url: URL, apiKey: string) {
  const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
  if (response.status === 429) throw new Error('RATE_LIMIT')
  if (!response.ok) throw new Error('PROVIDER')
  const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: T[] }
  const payloadError = apiFootballPayloadError(payload.errors)
  if (payloadError) throw new Error(payloadError.kind === 'rate-limit' ? 'RATE_LIMIT' : 'PROVIDER')
  if (!Array.isArray(payload.response)) throw new Error('PROVIDER')
  return payload.response
}

function failure(error: unknown) {
  return error instanceof Error && error.message === 'RATE_LIMIT'
    ? { ok: false as const, kind: 'rate-limit' as const, message: 'The football data service is temporarily rate-limited.' }
    : { ok: false as const, kind: 'provider' as const, message: 'Country data is temporarily unavailable.' }
}

async function countries(apiKey: string) {
  if (countriesCache && countriesCache.expiresAt > Date.now()) return countriesCache.value
  const value = await request<FootballCountry>(new URL('https://v3.football.api-sports.io/countries'), apiKey)
  countriesCache = { value, expiresAt: Date.now() + 24 * 60 * 60_000 }
  return value
}

export const getCountries = createServerFn({ method: 'GET' }).handler(async (): Promise<CountriesResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  try { return { ok: true, countries: await countries(apiKey) } } catch (error) { return failure(error) }
})

export const getCountryCompetitions = createServerFn({ method: 'GET' }).validator(countrySchema).handler(async ({ data }): Promise<CountryCompetitionsResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  try {
    const availableCountries = await countries(apiKey)
    const country = availableCountries.find((item) => item.name.toLocaleLowerCase() === data.country.toLocaleLowerCase())
    if (!country) return { ok: false, kind: 'not-found', message: 'This country is not covered by the football data provider.' }
    const cacheKey = country.name.toLocaleLowerCase()
    let competitions = competitionCache.get(cacheKey)
    if (!competitions || competitions.expiresAt <= Date.now()) {
      const url = new URL('https://v3.football.api-sports.io/leagues')
      url.searchParams.set('country', country.name)
      competitions = { value: await request<Competition>(url, apiKey), expiresAt: Date.now() + 60 * 60_000 }
      competitionCache.set(cacheKey, competitions)
    }
    return { ok: true, country, competitions: competitions.value }
  } catch (error) { return failure(error) }
})
