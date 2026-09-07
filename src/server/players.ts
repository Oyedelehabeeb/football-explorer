import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { apiFootballPayloadError } from '#/server/api-football-error'

import type { PlayerProfile } from '#/lib/player'

const searchSchema = z.object({ query: z.string().trim().min(4).max(80) })
const cache = new Map<string, { expiresAt: number; value: PlayerProfile[] }>()

export type PlayerSearchResult =
  | { ok: true; players: PlayerProfile[] }
  | { ok: false; kind: 'configuration' | 'rate-limit' | 'provider' | 'network'; message: string }

export const searchPlayers = createServerFn({ method: 'GET' }).validator(searchSchema).handler(async ({ data }): Promise<PlayerSearchResult> => {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return { ok: false, kind: 'configuration', message: 'Football data is not configured on this server.' }
  const key = data.query.toLocaleLowerCase()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return { ok: true, players: cached.value }
  try {
    const url = new URL('https://v3.football.api-sports.io/players/profiles')
    url.searchParams.set('search', data.query)
    const response = await fetch(url, { headers: { 'x-apisports-key': apiKey } })
    if (response.status === 429) return { ok: false, kind: 'rate-limit', message: 'Player search is temporarily rate-limited.' }
    if (!response.ok) return { ok: false, kind: 'provider', message: 'Player search is temporarily unavailable.' }
    const payload = (await response.json()) as { errors?: unknown[] | Record<string, unknown>; response?: Array<{ player: PlayerProfile }> }
    const payloadError = apiFootballPayloadError(payload.errors)
    if (payloadError) return { ok: false, kind: payloadError.kind, message: payloadError.message }
    const players = (payload.response ?? []).map((item) => item.player)
    cache.set(key, { value: players, expiresAt: Date.now() + 7 * 24 * 60 * 60_000 })
    return { ok: true, players }
  } catch {
    return { ok: false, kind: 'network', message: 'Player search could not reach the football data service.' }
  }
})
