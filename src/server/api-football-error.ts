export type ApiFootballErrorKind = 'configuration' | 'rate-limit' | 'provider'

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
  if (/daily|request quota|quota|limit.day/.test(text)) {
    return {
      kind: 'rate-limit',
      message: 'The API-Football request quota has been reached. Data will be available again after the provider resets the quota.',
      retryAfterMs: 5 * 60_000,
    }
  }
  if (/account.{0,20}suspend|suspend.{0,20}account/.test(text)) {
    return { kind: 'provider', message: 'The API-Football account is suspended. Check the provider dashboard before trying again.' }
  }
  if (/invalid.{0,20}(api.?key|token)|(api.?key|token).{0,20}invalid|unauthori[sz]ed|authentication/.test(text)) {
    return { kind: 'configuration', message: 'The API-Football key was rejected. Check the server environment configuration.' }
  }
  if (/plan|subscription|season/.test(text)) {
    return { kind: 'provider', message: 'This data is not available for the selected season on the current API-Football plan.' }
  }
  return { kind: 'provider', message: 'API-Football could not complete this request.' }
}
