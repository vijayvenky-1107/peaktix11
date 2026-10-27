import crypto from 'node:crypto';

/**
 * In-memory TTL cache for event listings and event details.
 * Prevents repetitive database reads during high concurrency bursts.
 * Automatically invalidated on booking and cancellation to guarantee inventory consistency.
 */
class TtlCache {
  constructor() {
    this.store = new Map(); // key -> { data, etag, expiresAt }
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return { data: entry.data, etag: entry.etag };
  }

  set(key, data, ttlMs = 30000) {
    const serialized = JSON.stringify(data);
    const etag = `"${crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16)}"`;
    this.store.set(key, {
      data,
      etag,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(key) {
    this.store.delete(key);
  }

  invalidatePattern(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getMetrics() {
    const total = this.hits + this.misses;
    const hitRatePct = total > 0 ? Math.round((this.hits / total) * 100) : 0;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRatePct,
    };
  }
}

export const cache = new TtlCache();
