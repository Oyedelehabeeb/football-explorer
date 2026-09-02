export type ApiFootballErrorKind = 'rate-limit' | 'provider'

export function apiFootballPayloadError(errors: unknown[] | Record<string, unknown> | undefined): { kind: ApiFootballErrorKind; message: string } | null {
  if (!errors) return null
  const entries = Array.isArray(errors) ? errors.map((value) => ['', value] as const) : Object.entries(errors)
  if (entries.length === 0) return null

  const text = entries.map(([key, value]) => `${key} ${String(value)}`).join(' ').toLocaleLowerCase()
  if (/request|rate.?limit|quota/.test(text)) {
    return { kind: 'rate-limit', message: 'The API-Football daily request quota has been reached. Data will be available again after the provider resets the quota.' }
  }
  if (/plan|subscription|season/.test(text)) {
    return { kind: 'provider', message: 'This data is not available for the selected season on the current API-Football plan.' }
  }
  return { kind: 'provider', message: 'API-Football could not complete this request.' }
}
