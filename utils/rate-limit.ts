/**
 * Simple in-memory rate limiter for Vercel Serverless
 * 
 * IMPORTANT: This is a basic implementation using global state.
 * For production with multiple regions, use Vercel KV or Upstash Redis.
 * 
 * Usage:
 * ```typescript
 * import { checkRateLimit } from '../../utils/rate-limit';
 * 
 * export default async function handler(req, res) {
 *   const rateLimitResult = checkRateLimit(req, { maxRequests: 10, windowMs: 60000 });
 *   if (!rateLimitResult.allowed) {
 *     return res.status(429).json({ 
 *       error: 'Too many requests', 
 *       retryAfter: rateLimitResult.retryAfter 
 *     });
 *   }
 *   // ... rest of handler
 * }
 * ```
 */

import type { VercelRequest } from '@vercel/node';

interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;  // Seconds until reset
}

// Global in-memory store (persists across warm function invocations)
declare global {
  var rateLimitStore: Map<string, RateLimitEntry>;
}

if (!global.rateLimitStore) {
  global.rateLimitStore = new Map<string, RateLimitEntry>();
}

/**
 * Get client identifier from request
 * Uses IP address or forwarded IP
 */
function getClientId(req: VercelRequest): string {
  // Try to get real IP from headers (Vercel sets these)
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  // Fallback to connection remote address
  return 'unknown';
}

/**
 * Check if request is allowed based on rate limit
 */
export function checkRateLimit(
  req: VercelRequest,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): RateLimitResult {
  const clientId = getClientId(req);
  const now = Date.now();
  
  // Get or create entry
  let entry = global.rateLimitStore.get(clientId);
  
  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    };
  }
  
  // Increment counter
  entry.count++;
  global.rateLimitStore.set(clientId, entry);
  
  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count
  };
}

/**
 * Cleanup old entries (call periodically to prevent memory leak)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of global.rateLimitStore.entries()) {
    if (now > entry.resetTime + 60000) { // Keep for 1 minute after reset
      global.rateLimitStore.delete(key);
    }
  }
}

/**
 * Preset configurations for different endpoints
 */
export const RateLimitPresets = {
  // Strict: For payment creation (prevent spam)
  PAYMENT_CREATE: { maxRequests: 5, windowMs: 60000 },      // 5 per minute
  
  // Moderate: For user creation
  USER_CREATE: { maxRequests: 10, windowMs: 60000 },        // 10 per minute
  
  // Lenient: For config/link retrieval
  CONFIG_FETCH: { maxRequests: 30, windowMs: 60000 },       // 30 per minute
  
  // Very strict: For webhook (should only be called by YooKassa)
  WEBHOOK: { maxRequests: 100, windowMs: 60000 },           // 100 per minute
  
  // Generous: For status checks
  STATUS_CHECK: { maxRequests: 60, windowMs: 60000 }        // 60 per minute (1 per second)
};
