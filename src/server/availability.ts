import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballError, apiFootballRequest, CACHE_TTL } from '#/server/api-football'

import type { FixtureAbsence } from '#/lib/availability'

const schema = z.object({ fixtureId: z.number().int().positive() })

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

export const getFixtureAvailability = createServerFn({ method: 'GET' }).validator(schema).handler(async ({ data }): Promise<AvailabilityResult> => {
  try {
    const response = await apiFootballRequest<ProviderAbsence[]>({ path: 'injuries', params: { fixture: String(data.fixtureId) }, ttl: CACHE_TTL.fourHours })
    const absences = response.data.map(normalize).filter((item): item is FixtureAbsence => item !== null)
    return { ok: true, absences }
  } catch (error) {
    return apiFootballError(error, 'The football data service could not be reached.')
  }
})
