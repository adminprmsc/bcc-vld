import { Injectable, signal, computed } from '@angular/core';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

export interface CacheStats {
  entries: number;
  totalHits: number;
  memoryUsage: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxEntries?: number;
  persistent?: boolean; // Use localStorage
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 100;

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hitCount = signal(0);
  private missCount = signal(0);
  
  readonly stats = computed<CacheStats>(() => ({
    entries: this.cache.size,
    totalHits: this.hitCount(),
    memoryUsage: this.estimateMemoryUsage()
  }));

  /**
   * Get cached data
   */
  get<T>(key: string, options: CacheOptions = {}): T | null {
    // Try memory cache first
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (entry) {
      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.missCount.update(c => c + 1);
        return null;
      }
      
      // Update hit count
      entry.hits++;
      this.hitCount.update(c => c + 1);
      return entry.data;
    }
    
    // Try localStorage if persistent
    if (options.persistent) {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored) as CacheEntry<T>;
          if (Date.now() <= parsed.expiresAt) {
            // Restore to memory cache
            this.cache.set(key, parsed);
            this.hitCount.update(c => c + 1);
            return parsed.data;
          } else {
            localStorage.removeItem(`cache_${key}`);
          }
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e);
      }
    }
    
    this.missCount.update(c => c + 1);
    return null;
  }

  /**
   * Set cache data
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? DEFAULT_TTL;
    const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    
    // Evict old entries if at max capacity
    if (this.cache.size >= maxEntries) {
      this.evictOldest();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0
    };
    
    this.cache.set(key, entry);
    
    // Persist to localStorage if requested
    if (options.persistent) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (e) {
        console.warn('Failed to write to localStorage:', e);
      }
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string, options: CacheOptions = {}): boolean {
    const deleted = this.cache.delete(key);
    
    if (options.persistent) {
      try {
        localStorage.removeItem(`cache_${key}`);
      } catch (e) {
        console.warn('Failed to remove from localStorage:', e);
      }
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(options: { persistent?: boolean } = {}): void {
    this.cache.clear();
    this.hitCount.set(0);
    this.missCount.set(0);
    
    if (options.persistent) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.warn('Failed to clear localStorage cache:', e);
      }
    }
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.hitCount() + this.missCount();
    return total > 0 ? this.hitCount() / total : 0;
  }

  /**
   * Evict oldest/least used entries
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      // Evict expired entries first
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return;
      }
      
      // Otherwise find oldest by timestamp
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Estimate memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2;
      size += 32; // Overhead for entry metadata
    }
    
    return size;
  }
}

/**
 * Create a cache key from multiple parts
 */
export function createCacheKey(...parts: (string | number | boolean)[]): string {
  return parts.map(p => String(p)).join(':');
}

/**
 * Decorator for caching method results
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      // Create cache key from method name and arguments
      const key = `${propertyKey}:${JSON.stringify(args)}`;
      
      // This would need the CacheService injected
      // For now, this is a placeholder for the decorator pattern
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}
