import { createServerFn } from '@tanstack/react-start'

import type { Competition } from '#/lib/competition'

export type CompetitionsResult =
  | { ok: true; competitions: Competition[]; fetchedAt: string }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

let cache: { expiresAt: number; value: CompetitionsResult } | undefined

export const getCurrentCompetitions = createServerFn({ method: 'GET' }).handler(async (): Promise<CompetitionsResult> => {
  if (cache && cache.expiresAt > Date.now()) return cache.value

  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }

  const url = new URL('https://v3.football.api-sports.io/leagues')
  url.searchParams.set('current', 'true')

  try {
    const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
    if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
    if (!response.ok) return { ok: false, kind: 'provider', message: `The football data service returned an error (${response.status}).` }

    const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: Competition[] }
    const hasErrors = Array.isArray(payload.errors) ? payload.errors.length > 0 : Boolean(payload.errors && Object.keys(payload.errors).length)
    if (hasErrors || !Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'The football data service could not complete this request.' }

    const value: CompetitionsResult = { ok: true, competitions: payload.response, fetchedAt: new Date().toISOString() }
    cache = { value, expiresAt: Date.now() + 60 * 60_000 }
    return value
  } catch {
    return { ok: false, kind: 'network', message: 'Competition data is temporarily unavailable. Please try again.' }
  }
})
