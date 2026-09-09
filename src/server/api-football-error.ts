export type ApiFootballErrorKind = 'rate-limit' | 'provider'

export interface ApiFootballPayloadError {
  kind: ApiFootballErrorKind
  message: string
  retryAfterMs?: number
}

export function apiFootballPayloadError(errors: unknown[] | Record<string, unknown> | undefined): ApiFootballPayloadError | null {
  if (!errors) return null
  const entries = Array.isArray(errors) ? errors.map((value) => ['', value] as const) : Object.entries(errors)
  if (entries.length === 0) return null

  const text = entries.map(([key, value]) => `${key} ${String(value)}`).join(' ').toLocaleLowerCase()
  if (/too many requests|per minute|requests per minute/.test(text)) {
    return {
      kind: 'rate-limit',
      message: 'API-Football’s per-minute request limit has been reached. Please wait a minute before trying again.',
      retryAfterMs: 65_000,
    }
  }
  if (/request|rate.?limit|quota/.test(text)) {
    return {
      kind: 'rate-limit',
      message: 'The API-Football request quota has been reached. Data will be available again after the provider resets the quota.',
      retryAfterMs: 5 * 60_000,
    }
  }
  if (/plan|subscription|season/.test(text)) {
    return { kind: 'provider', message: 'This data is not available for the selected season on the current API-Football plan.' }
  }
  return { kind: 'provider', message: 'API-Football could not complete this request.' }
}
