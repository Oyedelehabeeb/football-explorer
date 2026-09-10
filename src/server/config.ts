function boundedInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback

  const value = Number(raw)
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    console.warn(`[Football Explorer] Ignoring invalid ${name}; expected an integer from ${minimum} to ${maximum}.`)
    return fallback
  }

  return value
}

export const serverRuntimeConfig = {
  apiFootballKey: process.env.API_FOOTBALL_KEY?.trim() || undefined,
  apiFootballTimeoutMs: boundedInteger('API_FOOTBALL_TIMEOUT_MS', 8_000, 1_000, 30_000),
  cacheMaxEntries: boundedInteger('CACHE_MAX_ENTRIES', 300, 50, 5_000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const

