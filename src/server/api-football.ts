import { apiFootballPayloadError } from '#/server/api-football-error'
import { serverCache } from '#/server/cache'

export const CACHE_TTL = {
  live: 55_000,
  fifteenMinutes: 15 * 60_000,
  hourly: 60 * 60_000,
  fourHours: 4 * 60 * 60_000,
  daily: 24 * 60 * 60_000,
  weekly: 7 * 24 * 60 * 60_000,
} as const

interface ApiFootballRequestOptions<T> {
  path: string
  params?: Record<string, string>
  ttl: number | ((data: T) => number)
  staleTtl?: number
  force?: boolean
}

interface ApiFootballCacheValue<T> {
  data: T
  fetchedAt: string
  quota: { remaining: number | null; limit: number | null }
}

export interface ApiFootballResponse<T> extends ApiFootballCacheValue<T> {
  cacheState: 'fresh' | 'loaded' | 'stale'
}

export type ApiFootballFailureKind = 'configuration' | 'rate-limit' | 'provider' | 'network'

export class ApiFootballRequestError extends Error {
  constructor(
    public readonly kind: ApiFootballFailureKind,
    message: string,
    public readonly transient = false,
  ) {
    super(message)
    this.name = 'ApiFootballRequestError'
  }
}

function numberHeader(response: Response, name: string) {
  const value = response.headers.get(name)
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function requestUrl(path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://v3.football.api-sports.io/${path}`)
  Object.entries(params).sort(([left], [right]) => left.localeCompare(right)).forEach(([key, value]) => url.searchParams.set(key, value))
  return url
}

function canUseStale(error: unknown) {
  return error instanceof ApiFootballRequestError && error.transient
}

export async function apiFootballRequest<T>(options: ApiFootballRequestOptions<T>): Promise<ApiFootballResponse<T>> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new ApiFootballRequestError('configuration', 'Football data is not configured on this server.')

  const url = requestUrl(options.path, options.params)
  const result = await serverCache.getOrSet<ApiFootballCacheValue<T>>(
    url.toString(),
    { ttl: (value) => typeof options.ttl === 'function' ? options.ttl(value.data) : options.ttl, staleTtl: options.staleTtl ?? CACHE_TTL.daily },
    async () => {
      let response: Response
      try {
        response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': apiKey } })
      } catch {
        throw new ApiFootballRequestError('network', 'The football data service could not be reached.', true)
      }

      if (response.status === 429) throw new ApiFootballRequestError('rate-limit', 'The football data service is temporarily rate-limited.', true)
      if (!response.ok) throw new ApiFootballRequestError('provider', `The football data service returned an error (${response.status}).`, response.status >= 500)

      let payload: { errors?: unknown[] | Record<string, unknown>; response?: T }
      try {
        payload = await response.json() as typeof payload
      } catch {
        throw new ApiFootballRequestError('provider', 'API-Football returned an invalid response.', true)
      }

      const payloadError = apiFootballPayloadError(payload.errors)
      if (payloadError) throw new ApiFootballRequestError(payloadError.kind, payloadError.message, payloadError.kind === 'rate-limit')
      if (payload.response === undefined) throw new ApiFootballRequestError('provider', 'API-Football returned an invalid response.')

      return {
        data: payload.response,
        fetchedAt: new Date().toISOString(),
        quota: {
          remaining: numberHeader(response, 'x-ratelimit-requests-remaining'),
          limit: numberHeader(response, 'x-ratelimit-requests-limit'),
        },
      }
    },
    { force: options.force, useStaleOnError: canUseStale },
  )

  return { ...result.value, cacheState: result.state }
}

export function peekApiFootball<T>(path: string, params?: Record<string, string>) {
  return serverCache.peek<ApiFootballCacheValue<T>>(requestUrl(path, params).toString())?.data
}

export function apiFootballError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiFootballRequestError) {
    return { ok: false as const, kind: error.kind, message: error.kind === 'configuration' ? error.message : fallbackMessageFor(error, fallbackMessage) }
  }
  return { ok: false as const, kind: 'network' as const, message: fallbackMessage }
}

function fallbackMessageFor(error: ApiFootballRequestError, fallbackMessage: string) {
  if (error.kind === 'rate-limit') return 'The football data service is temporarily rate-limited.'
  return fallbackMessage
}
