export interface CachePolicy<T> {
  ttl: number | ((value: T) => number)
  staleTtl?: number
}

interface CacheEntry {
  value: unknown
  expiresAt: number
  staleUntil: number
  lastAccessedAt: number
}

export interface CacheResult<T> {
  value: T
  state: 'fresh' | 'loaded' | 'stale'
}

const DEFAULT_MAX_ENTRIES = 300

export class MemoryCache {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly pending = new Map<string, Promise<unknown>>()

  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  peek<T>(key: string) {
    const entry = this.entries.get(key)
    if (!entry || entry.expiresAt <= Date.now()) return undefined
    entry.lastAccessedAt = Date.now()
    return entry.value as T
  }

  async getOrSet<T>(
    key: string,
    policy: CachePolicy<T>,
    load: () => Promise<T>,
    options: { force?: boolean; useStaleOnError?: (error: unknown) => boolean } = {},
  ): Promise<CacheResult<T>> {
    const now = Date.now()
    const existing = this.entries.get(key)
    if (!options.force && existing && existing.expiresAt > now) {
      existing.lastAccessedAt = now
      return { value: existing.value as T, state: 'fresh' }
    }

    const pending = this.pending.get(key)
    if (pending) return { value: await pending as T, state: 'loaded' }

    const loading = load()
      .then((value) => {
        const loadedAt = Date.now()
        const ttl = typeof policy.ttl === 'function' ? policy.ttl(value) : policy.ttl
        this.entries.set(key, {
          value,
          expiresAt: loadedAt + ttl,
          staleUntil: loadedAt + ttl + (policy.staleTtl ?? 0),
          lastAccessedAt: loadedAt,
        })
        this.prune()
        return value
      })
      .finally(() => this.pending.delete(key))

    this.pending.set(key, loading)
    try {
      return { value: await loading, state: 'loaded' }
    } catch (error) {
      const stale = this.entries.get(key)
      if (stale && stale.staleUntil > Date.now() && options.useStaleOnError?.(error)) {
        stale.lastAccessedAt = Date.now()
        return { value: stale.value as T, state: 'stale' }
      }
      throw error
    }
  }

  private prune() {
    const now = Date.now()
    for (const [key, entry] of this.entries) {
      if (entry.staleUntil <= now) this.entries.delete(key)
    }
    if (this.entries.size <= this.maxEntries) return

    const oldest = [...this.entries.entries()]
      .sort((left, right) => left[1].lastAccessedAt - right[1].lastAccessedAt)
      .slice(0, this.entries.size - this.maxEntries)
    oldest.forEach(([key]) => this.entries.delete(key))
  }
}

export const serverCache = new MemoryCache()
