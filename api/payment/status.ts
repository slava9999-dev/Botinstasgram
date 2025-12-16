import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/payment/status?payment_id=xxx
 * GET /api/payment/status?email=xxx
 * 
 * Check if payment was confirmed and get config URL.
 * Called by success.html to get the config after payment.
 */

interface PaymentRecord {
  paymentId: string;
  email: string;
  amount: number;
  configToken: string;
  configUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

// Reference the global store from webhook.ts
declare global {
  var confirmedPayments: Map<string, PaymentRecord>;
}

// Initialize if not exists
if (!global.confirmedPayments) {
  global.confirmedPayments = new Map<string, PaymentRecord>();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
      const record = global.confirmedPayments.get(payment_id);
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
      const record = global.confirmedPayments.get(`email:${email}`);
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
    console.error('[Status] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
