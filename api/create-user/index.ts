import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { PanelManager } from '../../utils/panel';
import { generateConfigToken } from '../../utils/jwt';
import { checkRateLimit, RateLimitPresets } from '../../utils/rate-limit';

/**
 * POST /api/create-user
 * Creates a new user in 3X-UI panel and returns config URL.
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "planDuration": 30,
 *   "secret": "BOT_SECRET" // Optional auth from Telegram bot
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting: 10 requests per minute per IP
  const rateLimitResult = checkRateLimit(req, RateLimitPresets.USER_CREATE);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'Too many user creation requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    const { email, planDuration = 30, secret } = req.body || {};

    // Optional: Verify bot secret
    const BOT_SECRET = process.env.BOT_SECRET;
    if (BOT_SECRET && secret !== BOT_SECRET) {
      return res.status(403).json({ error: 'Forbidden', code: 'INVALID_SECRET' });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required', code: 'INVALID_EMAIL' });
    }

    // Validate planDuration
    const duration = parseInt(planDuration, 10);
    if (isNaN(duration) || duration < 1 || duration > 365) {
      return res.status(400).json({ error: 'Plan duration must be 1-365 days', code: 'INVALID_DURATION' });
    }

    const INBOUND_ID = parseInt(process.env.INBOUND_ID || '1', 10);
    const uuid = uuidv4();

    // Create client in 3X-UI
    const panel = new PanelManager();
    const clientInfo = await panel.addClient(INBOUND_ID, email, uuid, duration);

    // Generate stateless token
    const configToken = generateConfigToken(clientInfo, duration);

    // Build config URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.BASE_URL || 'http://localhost:3000';
    
    const configUrl = `${baseUrl}/api/config/${configToken}`;
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

    return res.status(200).json({
      success: true,
      data: {
        uuid,
        email,
        configToken,
        configUrl,
        expiresAt
      }
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    });
  }
}
