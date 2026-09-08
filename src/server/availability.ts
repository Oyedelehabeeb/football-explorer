import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { FixtureAbsence } from '#/lib/availability'

const schema = z.object({ fixtureId: z.number().int().positive() })
const cache = new Map<number, { expiresAt: number; absences: FixtureAbsence[] }>()

interface ProviderAbsence {
  player?: { id?: number; name?: string; photo?: string; type?: string; reason?: string | null }
  team?: { id?: number; name?: string; logo?: string }
}

export type AvailabilityResult =
  | { ok: true; absences: FixtureAbsence[] }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

function normalize(item: ProviderAbsence): FixtureAbsence | null {
  const { player, team } = item
  if (!player?.id || !player.name || !player.photo || !player.type || !team?.id || !team.name || !team.logo) return null
  return {
    player: { id: player.id, name: player.name, photo: player.photo, status: player.type, reason: player.reason ?? null },
    team: { id: team.id, name: team.name, logo: team.logo },
  }
}

export const getFixtureAvailability = createServerFn({ method: 'GET' })
  .validator(schema)
  .handler(async ({ data }): Promise<AvailabilityResult> => {
    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }

    const cached = cache.get(data.fixtureId)
    if (cached && cached.expiresAt > Date.now()) return { ok: true, absences: cached.absences }

    const url = new URL('https://v3.football.api-sports.io/injuries')
    url.searchParams.set('fixture', String(data.fixtureId))
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
      if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'The football data service is temporarily rate-limited.' }
      if (!response.ok) return { ok: false, kind: 'network', message: 'The football data service could not complete this request.' }

      const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: ProviderAbsence[] }
      const payloadError = apiFootballPayloadError(payload.errors)
      if (payloadError) return { ok: false, kind: payloadError.kind, message: payloadError.message }
      if (!Array.isArray(payload.response)) return { ok: false, kind: 'provider', message: 'The provider returned an unexpected availability response.' }

      const absences = payload.response.map(normalize).filter((item): item is FixtureAbsence => item !== null)
      cache.set(data.fixtureId, { absences, expiresAt: Date.now() + 4 * 60 * 60_000 })
      return { ok: true, absences }
    } catch {
      return { ok: false, kind: 'network', message: 'The football data service could not be reached.' }
    }
  })
