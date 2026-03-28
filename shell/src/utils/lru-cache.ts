/**
 * LRU Cache for iframe memory management
 * Max 3 open apps as per design decision
 */

export interface CacheEntry<T> {
  value: T;
  lastAccessed: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Update last accessed time
      entry.lastAccessed = Date.now();
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.value;
    }
    return undefined;
  }

  set(key: string, value: T): void {
    // If key exists, delete it first to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at capacity, evict least recently used (first item)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const entry = this.cache.get(firstKey);
        this.cache.delete(firstKey);
        // Emit eviction event for cleanup
        this.onEvict?.(firstKey, entry?.value);
      }
    }

    this.cache.set(key, {
      value,
      lastAccessed: Date.now()
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  // Callback for eviction cleanup
  onEvict?: (key: string, value: T | undefined) => void;
}
