type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  tags: string[];
};

class ConvexCacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<string>>();

  /**
   * Récupère une valeur du cache si valide
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Enregistre une valeur dans le cache avec un TTL et des tags d'invalidation
   */
  public set<T>(key: string, data: T, ttlSeconds: number = 60, tags: string[] = []): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const entry: CacheEntry<T> = { data, expiresAt, tags };

    this.cache.set(key, entry);

    // Indexation par tags pour invalidation rapide
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  /**
   * Exécute une fonction asynchrone avec mise en cache automatique (Stale-While-Revalidate pattern)
   */
  public async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 30,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds, tags);
    return data;
  }

  /**
   * Invalide une clé spécifique
   */
  public delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }
    this.cache.delete(key);
  }

  /**
   * Invalide toutes les entrées liées à un tag (ex: 'wallet:123' ou 'games:active')
   */
  public invalidateTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key);
      }
      this.tagIndex.delete(tag);
    }
  }

  /**
   * Vide complètement le cache
   */
  public clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }
}

export const convexCache = new ConvexCacheManager();
