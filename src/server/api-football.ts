import { apiFootballPayloadError } from '#/server/api-football-error'
import { serverCache } from '#/server/cache'
import { serverRuntimeConfig } from '#/server/config'

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
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiFootballRequestError'
  }
}

let rateLimitCooldown: { until: number; message: string } | undefined

function beginRateLimitCooldown(message: string, retryAfterMs: number) {
  rateLimitCooldown = { until: Date.now() + retryAfterMs, message }
}

function activeRateLimitError() {
  if (!rateLimitCooldown) return undefined
  if (rateLimitCooldown.until <= Date.now()) {
    rateLimitCooldown = undefined
    return undefined
  }
  return new ApiFootballRequestError('rate-limit', rateLimitCooldown.message, true)
}

function retryAfterMilliseconds(response: Response) {
  const seconds = Number(response.headers.get('retry-after'))
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 65_000
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
  const apiKey = serverRuntimeConfig.apiFootballKey
  if (!apiKey) throw new ApiFootballRequestError('configuration', 'Football data is not configured on this server.')

  const url = requestUrl(options.path, options.params)
  const result = await serverCache.getOrSet<ApiFootballCacheValue<T>>(
    url.toString(),
    { ttl: (value) => typeof options.ttl === 'function' ? options.ttl(value.data) : options.ttl, staleTtl: options.staleTtl ?? CACHE_TTL.daily },
    async () => {
      const cooldownError = activeRateLimitError()
      if (cooldownError) throw cooldownError

      let response: Response
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: { 'x-apisports-key': apiKey },
          signal: AbortSignal.timeout(serverRuntimeConfig.apiFootballTimeoutMs),
        })
      } catch (error) {
        console.error('[API-Football] Request failed before a response was received.', {
          endpoint: url.pathname,
          error: error instanceof Error ? error.message : String(error),
        })
        throw new ApiFootballRequestError('network', 'The football data service could not be reached.', true)
      }

      if (response.status === 429) {
        const message = 'API-Football’s per-minute request limit has been reached. Please wait a minute before trying again.'
        beginRateLimitCooldown(message, retryAfterMilliseconds(response))
        throw new ApiFootballRequestError('rate-limit', message, true, response.status)
      }
      if (!response.ok) {
        console.error('[API-Football] Provider returned an unsuccessful response.', {
          endpoint: url.pathname,
          status: response.status,
        })
        throw new ApiFootballRequestError('provider', `The football data service returned an error (${response.status}).`, response.status >= 500, response.status)
      }

      let payload: { errors?: unknown[] | Record<string, unknown>; response?: T }
      try {
        payload = await response.json() as typeof payload
      } catch (error) {
        console.error('[API-Football] Provider response could not be decoded.', {
          endpoint: url.pathname,
          status: response.status,
          error: error instanceof Error ? error.message : String(error),
        })
        throw new ApiFootballRequestError('provider', 'API-Football returned an invalid response.', true)
      }

      const payloadError = apiFootballPayloadError(payload.errors)
      if (payloadError) {
        console.error('[API-Football] Provider rejected the request.', {
          endpoint: url.pathname,
          kind: payloadError.kind,
          message: payloadError.message,
          providerErrors: payload.errors,
        })
        if (payloadError.kind === 'rate-limit') beginRateLimitCooldown(payloadError.message, payloadError.retryAfterMs ?? 65_000)
        throw new ApiFootballRequestError(payloadError.kind, payloadError.message, payloadError.kind === 'rate-limit')
      }
      if (payload.response === undefined) throw new ApiFootballRequestError('provider', 'API-Football returned an invalid response.')

      const dailyRemaining = numberHeader(response, 'x-ratelimit-requests-remaining')
      const dailyLimit = numberHeader(response, 'x-ratelimit-requests-limit')
      const minuteRemaining = numberHeader(response, 'x-ratelimit-remaining')
      if (dailyRemaining === 0) {
        beginRateLimitCooldown('The API-Football daily request quota has been reached. Cached data remains available.', 5 * 60_000)
      } else if (minuteRemaining === 0) {
        beginRateLimitCooldown('API-Football’s per-minute request limit has been reached. Please wait a minute before trying again.', 65_000)
      }

      return {
        data: payload.response,
        fetchedAt: new Date().toISOString(),
        quota: {
          remaining: dailyRemaining,
          limit: dailyLimit,
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
    return { ok: false as const, kind: error.kind, message: fallbackMessageFor(error, fallbackMessage) }
  }
  return { ok: false as const, kind: 'network' as const, message: fallbackMessage }
}

function fallbackMessageFor(error: ApiFootballRequestError, fallbackMessage: string) {
  if (error.kind === 'configuration') return error.message
  if (error.kind === 'rate-limit') return error.message
  if (error.message.startsWith('This data is not available') || error.message.startsWith('API-Football could not')) return error.message
  if (error.status) return error.message
  if (error.message === 'API-Football returned an invalid response.') return error.message
  return fallbackMessage
}
