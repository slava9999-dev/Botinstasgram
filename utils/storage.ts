/**
 * 🚀 VERCEL KV STORAGE ADAPTER
 * 
 * Централизованное хранилище для:
 * - Rate limiting (персистентный между инстансами)
 * - Payment records (не теряются при cold start)
 * - User sessions
 * 
 * ВАЖНО: Для активации нужно:
 * 1. Добавить Vercel KV в проект: https://vercel.com/storage/kv
 * 2. Vercel автоматически добавит переменные окружения
 * 
 * Пока Vercel KV не подключён, используется fallback на in-memory storage.
 */

import { logger, LogEvent } from './logger';

// Type definitions for when @vercel/kv is not installed
interface KVStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
}

// ============================================
// IN-MEMORY FALLBACK (for development/no KV)
// ============================================

class InMemoryStore implements KVStore {
  private store = new Map<string, { value: unknown; expiry?: number }>();
  
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value as T;
  }
  
  async set(key: string, value: unknown, options?: { ex?: number }): Promise<void> {
    const entry: { value: unknown; expiry?: number } = { value };
    if (options?.ex) {
      entry.expiry = Date.now() + (options.ex * 1000);
    }
    this.store.set(key, entry);
  }
  
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    await this.set(key, current + 1);
    return current + 1;
  }
  
  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiry = Date.now() + (seconds * 1000);
      this.store.set(key, entry);
    }
  }
  
  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expiry) return -1;
    const remaining = Math.floor((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }
}

// ============================================
// KV FACTORY
// ============================================

let kvInstance: KVStore | null = null;

/**
 * Get or create KV store instance
 * Automatically uses Vercel KV if available, falls back to in-memory
 */
async function getKV(): Promise<KVStore> {
  if (kvInstance) return kvInstance;
  
  // Check if Vercel KV is configured
  const hasVercelKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  
  if (hasVercelKV) {
    try {
      // Dynamic import to avoid build errors when @vercel/kv is not installed
      // @ts-ignore - @vercel/kv may not be installed
      const vercelKV = await import('@vercel/kv');
      kvInstance = vercelKV.kv as unknown as KVStore;
      logger.info(LogEvent.KV_CONNECTED, 'Using Vercel KV storage');
      return kvInstance;
    } catch (error) {
      logger.warn(LogEvent.KV_FALLBACK, 'Vercel KV not available, using in-memory fallback');
    }
  }
  
  // Fallback to in-memory
  logger.warn(LogEvent.KV_FALLBACK, 'Using in-memory storage (data will be lost on cold start)');
  kvInstance = new InMemoryStore();
  return kvInstance;
}

// ============================================
// PAYMENT RECORDS
// ============================================

export interface PaymentRecord {
  paymentId: string;
  email: string;
  telegramId?: string;
  amount: number;
  configToken: string;
  configUrl: string;
  uuid: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'succeeded' | 'failed';
}

export const PaymentStorage = {
  /**
   * Save payment record
   */
  async save(record: PaymentRecord): Promise<void> {
    const kv = await getKV();
    const ttl = 60 * 60 * 24 * 30; // 30 days
    
    // Save by payment ID
    await kv.set(`payment:${record.paymentId}`, record, { ex: ttl });
    
    // Index by email for lookup
    await kv.set(`payment:email:${record.email}`, record.paymentId, { ex: ttl });
    
    // Index by telegram ID if present
    if (record.telegramId) {
      await kv.set(`payment:tg:${record.telegramId}`, record.paymentId, { ex: ttl });
    }
    
    logger.info(LogEvent.KV_PAYMENT_SAVED, 'Payment saved', { paymentId: record.paymentId, email: record.email });
  },
  
  /**
   * Get payment by ID
   */
  async getById(paymentId: string): Promise<PaymentRecord | null> {
    const kv = await getKV();
    return await kv.get<PaymentRecord>(`payment:${paymentId}`);
  },
  
  /**
   * Get payment by email
   */
  async getByEmail(email: string): Promise<PaymentRecord | null> {
    const kv = await getKV();
    const paymentId = await kv.get<string>(`payment:email:${email}`);
    if (!paymentId) return null;
    return await this.getById(paymentId);
  },
  
  /**
   * Update payment status
   */
  async updateStatus(paymentId: string, status: PaymentRecord['status']): Promise<void> {
    const record = await this.getById(paymentId);
    if (record) {
      record.status = status;
      await this.save(record);
    }
  },
  
  /**
   * Check if payment exists
   */
  async exists(paymentId: string): Promise<boolean> {
    const record = await this.getById(paymentId);
    return record !== null;
  }
};

// ============================================
// RATE LIMITING
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  current: number;
}

export const RateLimitStorage = {
  /**
   * Check and increment rate limit
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const kv = await getKV();
    const windowSeconds = Math.floor(config.windowMs / 1000);
    const fullKey = `ratelimit:${key}`;
    
    // Increment counter
    const count = await kv.incr(fullKey);
    
    // Set expiry on first request
    if (count === 1) {
      await kv.expire(fullKey, windowSeconds);
    }
    
    // Check limit
    if (count > config.maxRequests) {
      const ttl = await kv.ttl(fullKey);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : windowSeconds,
        current: count
      };
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - count,
      current: count
    };
  },
  
  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    const kv = await getKV();
    await kv.del(`ratelimit:${key}`);
  }
};

// ============================================
// USER SESSIONS (Trial tracking)
// ============================================

export interface TrialRecord {
  telegramId: string;
  email: string;
  uuid: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export const TrialStorage = {
  /**
   * Mark trial as used for telegramId
   */
  async markUsed(telegramId: string, record: TrialRecord): Promise<void> {
    const kv = await getKV();
    const ttl = 60 * 60 * 24 * 365; // 1 year
    await kv.set(`trial:${telegramId}`, record, { ex: ttl });
    logger.info(LogEvent.KV_TRIAL_MARKED, 'Trial marked as used', { telegramId });
  },
  
  /**
   * Check if trial was already used
   */
  async hasUsed(telegramId: string): Promise<TrialRecord | null> {
    const kv = await getKV();
    return await kv.get<TrialRecord>(`trial:${telegramId}`);
  },
  
  /**
   * Get trial info
   */
  async get(telegramId: string): Promise<TrialRecord | null> {
    return await this.hasUsed(telegramId);
  }
};

// ============================================
// GENERIC CACHE
// ============================================

export const Cache = {
  /**
   * Set value with expiry
   */
  async set(key: string, value: unknown, expirySeconds: number = 3600): Promise<void> {
    const kv = await getKV();
    await kv.set(`cache:${key}`, value, { ex: expirySeconds });
  },
  
  /**
   * Get value
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const kv = await getKV();
    return await kv.get<T>(`cache:${key}`);
  },
  
  /**
   * Delete value
   */
  async del(key: string): Promise<void> {
    const kv = await getKV();
    await kv.del(`cache:${key}`);
  }
};

// ============================================
// HEALTH CHECK
// ============================================

export async function checkKVHealth(): Promise<{ 
  available: boolean; 
  type: 'vercel-kv' | 'in-memory';
  latencyMs?: number;
}> {
  const start = Date.now();
  const kv = await getKV();
  
  try {
    await kv.set('health:check', Date.now(), { ex: 10 });
    const latencyMs = Date.now() - start;
    
    const isVercelKV = !!process.env.KV_REST_API_URL;
    
    return {
      available: true,
      type: isVercelKV ? 'vercel-kv' : 'in-memory',
      latencyMs
    };
  } catch (error) {
    return {
      available: false,
      type: 'in-memory'
    };
  }
}
