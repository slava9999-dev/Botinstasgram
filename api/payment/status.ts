import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PaymentStorage } from '../../utils/storage';
import { logger, LogEvent } from '../../utils/logger';

/**
 * GET /api/payment/status?payment_id=xxx
 * GET /api/payment/status?email=xxx
 * 
 * Check if payment was confirmed and get config URL.
 * Called by success.html to get the config after payment.
 * 
 * Now uses Vercel KV for persistent storage!
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Note: CORS headers are set globally in vercel.json

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_id, email } = req.query;

    // Try to find by payment_id first
    if (payment_id && typeof payment_id === 'string') {
      const record = await PaymentStorage.getById(payment_id);
      if (record) {
        return res.status(200).json({
          success: true,
          confirmed: true,
          data: {
            configUrl: record.configUrl,
            email: record.email,
            expiresAt: record.expiresAt
          }
        });
      }
    }

    // Try to find by email
    if (email && typeof email === 'string') {
      const record = await PaymentStorage.getByEmail(email);
      if (record) {
        return res.status(200).json({
          success: true,
          confirmed: true,
          data: {
            configUrl: record.configUrl,
            email: record.email,
            expiresAt: record.expiresAt
          }
        });
      }
    }

    // Not found - payment not confirmed yet
    return res.status(200).json({
      success: true,
      confirmed: false,
      message: 'Payment not confirmed yet. Please wait or contact support.'
    });

  } catch (error: any) {
    logger.error(LogEvent.PAYMENT_STATUS_CHECKED, 'Error checking payment status', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
