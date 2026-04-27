/**
 * Frontend Redis Cache Service
 * 
 * Mimics Redis functionality on the frontend using localStorage + in-memory cache
 * Integrates with Django Channels WebSocket for real-time updates
 * 
 * Supports:
 * - Key-value storage (TTL enabled)
 * - List operations (push, pop, range)
 * - Hash operations (set fields, get fields)
 * - Cache invalidation & subscribers
 * - Performance monitoring
 */

class CacheService {
  constructor() {
    // In-memory cache for fast access
    this.memoryCache = new Map();
    
    // TTL tracking
    this.ttlTimers = new Map();
    
    // Subscribers for cache invalidation
    this.subscribers = new Map();
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      gets: 0,
      deletes: 0,
      expirations: 0,
    };
    
    // Initialize localStorage
    this.prefix = 'health_cache_';
    this.loadFromStorage();
  }

  /**
   * SET operations (Key-Value with TTL)
   */

  set(key, value, ttl = null) {
    const fullKey = `${this.prefix}${key}`;
    const cacheValue = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory
    this.memoryCache.set(fullKey, cacheValue);
    
    // Store in localStorage
    try {
      localStorage.setItem(fullKey, JSON.stringify(cacheValue));
    } catch (e) {
      console.warn('[Cache] localStorage full, clearing old entries');
      this.clearExpired();
    }

    // Set TTL timer
    if (ttl) {
      this.setTTLTimer(fullKey, ttl);
    }

    this.metrics.sets++;
    this.notifySubscribers(key, 'set', value);
  }

  get(key) {
    const fullKey = `${this.prefix}${key}`;
    
    // Check memory first (fastest)
    if (this.memoryCache.has(fullKey)) {
      const item = this.memoryCache.get(fullKey);
      
      // Check if expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl * 1000) {
        this.delete(key);
        this.metrics.misses++;
        return null;
      }
      
      this.metrics.hits++;
      return item.value;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const item = JSON.parse(stored);
        
        // Check if expired
        if (item.ttl && Date.now() - item.timestamp > item.ttl * 1000) {
          this.delete(key);
          this.metrics.misses++;
          return null;
        }
        
        // Restore to memory
        this.memoryCache.set(fullKey, item);
        this.metrics.hits++;
        return item.value;
      }
    } catch (e) {
      console.error('[Cache] Error reading from storage:', e);
    }

    this.metrics.misses++;
    return null;
  }

  delete(key) {
    const fullKey = `${this.prefix}${key}`;
    
    // Clear from memory
    this.memoryCache.delete(fullKey);
    
    // Clear from storage
    try {
      localStorage.removeItem(fullKey);
    } catch (e) {
      console.error('[Cache] Error deleting from storage:', e);
    }

    // Clear TTL timer
    if (this.ttlTimers.has(fullKey)) {
      clearTimeout(this.ttlTimers.get(fullKey));
      this.ttlTimers.delete(fullKey);
    }

    this.metrics.deletes++;
    this.notifySubscribers(key, 'delete', null);
  }

  /**
   * LIST operations (Array with index access)
   */

  lpush(key, value) {
    let list = this.get(key) || [];
    if (!Array.isArray(list)) list = [list];
    list.unshift(value);
    this.set(key, list);
    return list.length;
  }

  rpush(key, value) {
    let list = this.get(key) || [];
    if (!Array.isArray(list)) list = [list];
    list.push(value);
    this.set(key, list);
    return list.length;
  }

  lpop(key) {
    const list = this.get(key) || [];
    if (!Array.isArray(list) || list.length === 0) return null;
    const value = list.shift();
    this.set(key, list);
    return value;
  }

  rpop(key) {
    const list = this.get(key) || [];
    if (!Array.isArray(list) || list.length === 0) return null;
    const value = list.pop();
    this.set(key, list);
    return value;
  }

  lrange(key, start = 0, stop = -1) {
    const list = this.get(key);
    if (!Array.isArray(list)) return [];
    
    const length = list.length;
    const end = stop < 0 ? length + stop + 1 : stop + 1;
    return list.slice(start, end);
  }

  llen(key) {
    const list = this.get(key);
    return Array.isArray(list) ? list.length : 0;
  }

  /**
   * HASH operations (Object with field access)
   */

  hset(key, field, value) {
    let hash = this.get(key) || {};
    if (typeof hash !== 'object' || Array.isArray(hash)) hash = {};
    hash[field] = value;
    this.set(key, hash);
    return 1;
  }

  hmset(key, fields) {
    let hash = this.get(key) || {};
    Object.assign(hash, fields);
    this.set(key, hash);
    return 1;
  }

  hget(key, field) {
    const hash = this.get(key);
    if (typeof hash !== 'object') return null;
    return hash[field] ?? null;
  }

  hmget(key, fields) {
    const hash = this.get(key);
    if (typeof hash !== 'object') return [];
    return fields.map(field => hash[field] ?? null);
  }

  hgetall(key) {
    const hash = this.get(key);
    return (typeof hash === 'object' && !Array.isArray(hash)) ? hash : {};
  }

  hdel(key, field) {
    const hash = this.get(key);
    if (typeof hash !== 'object') return 0;
    if (hash[field]) {
      delete hash[field];
      this.set(key, hash);
      return 1;
    }
    return 0;
  }

  hexists(key, field) {
    const hash = this.get(key);
    return (typeof hash === 'object' && field in hash) ? 1 : 0;
  }

  /**
   * SUBSCRIBERS & INVALIDATION
   */

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  notifySubscribers(key, operation, value) {
    const callbacks = this.subscribers.get(key) || [];
    callbacks.forEach(cb => {
      try {
        cb({ key, operation, value, timestamp: Date.now() });
      } catch (e) {
        console.error('[Cache] Subscriber error:', e);
      }
    });
  }

  /**
   * UTILITY METHODS
   */

  setTTLTimer(key, ttl) {
    // Clear existing timer
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.memoryCache.delete(key);
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      this.ttlTimers.delete(key);
      this.metrics.expirations++;
    }, ttl * 1000);

    this.ttlTimers.set(key, timer);
  }

  clearExpired() {
    const now = Date.now();
    
    // Check memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.ttl && now - item.timestamp > item.ttl * 1000) {
        this.memoryCache.delete(key);
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      }
    }
  }

  keys(pattern = '*') {
    const keys = [];
    
    // From memory cache
    for (const key of this.memoryCache.keys()) {
      if (this.matchPattern(key, pattern)) {
        keys.push(key.replace(this.prefix, ''));
      }
    }
    
    return keys;
  }

  matchPattern(key, pattern) {
    if (pattern === '*') return true;
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(key);
  }

  clear() {
    // Clear memory
    this.memoryCache.clear();
    
    // Clear storage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('[Cache] Error clearing storage:', e);
    }

    // Clear timers
    this.ttlTimers.forEach(timer => clearTimeout(timer));
    this.ttlTimers.clear();
    
    // Reset metrics
    this.resetMetrics();
  }

  loadFromStorage() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          const item = JSON.parse(localStorage.getItem(key));
          
          // Check if expired
          if (item.ttl && Date.now() - item.timestamp > item.ttl * 1000) {
            localStorage.removeItem(key);
            continue;
          }
          
          this.memoryCache.set(key, item);
          
          // Re-set TTL timer
          if (item.ttl) {
            this.setTTLTimer(key, item.ttl);
          }
        }
      }
    } catch (e) {
      console.error('[Cache] Error loading from storage:', e);
    }
  }

  /**
   * METRICS
   */

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.metrics,
      total,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      storageKeys: this.keys('*').length,
    };
  }

  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      gets: 0,
      deletes: 0,
      expirations: 0,
    };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    console.table({
      'Hits': metrics.hits,
      'Misses': metrics.misses,
      'Hit Rate': metrics.hitRate,
      'Total Operations': metrics.gets,
      'Cache Size': metrics.memorySize,
      'Storage Keys': metrics.storageKeys,
    });
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Export for use in hooks
export default CacheService;
