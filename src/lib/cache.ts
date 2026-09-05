type CacheEntry<T> = {
  data: T
  expiry: number
}

const memoryCache = new Map<string, CacheEntry<any>>()

/**
 * Simple in-memory cache utility with TTL (time to live in seconds)
 */
export async function getCachedData<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const cached = memoryCache.get(key)

  if (cached && cached.expiry > now) {
    return cached.data
  }

  const freshData = await fetcher()
  memoryCache.set(key, {
    data: freshData,
    expiry: now + ttlSeconds * 1000
  })

  return freshData
}

export function invalidateCachePattern(pattern: string) {
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key)
    }
  }
}
