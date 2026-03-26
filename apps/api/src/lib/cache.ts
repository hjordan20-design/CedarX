/**
 * Lightweight in-memory TTL cache.
 *
 * A plain JS Map keyed by string. Each entry stores the payload and an
 * expiry timestamp. No background sweep — entries are evicted lazily on
 * get(). Good for O(100)–O(10 000) keys; not suitable for very large sets.
 */

interface Entry<T> {
    data: T;
    expiresAt: number;
}

class TtlCache {
    private readonly store = new Map<string, Entry<unknown>>();

    /** Return cached data if the key exists and hasn't expired, else undefined. */
    get<T>(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.data as T;
    }

    /** Store data under key with a TTL in milliseconds. */
    set<T>(key: string, data: T, ttlMs: number): void {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    /** Delete all keys whose string starts with the given prefix. */
    deleteByPrefix(prefix: string): number {
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }

    /** Current number of (potentially stale) entries. */
    size(): number { return this.store.size; }
}

/** Singleton used across all route files and pollers. */
export const cache = new TtlCache();
