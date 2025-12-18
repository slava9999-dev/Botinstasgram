import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, RateLimitPresets } from '../../utils/rate-limit';

/**
 * POST /api/payment/create
 * Creates a YooKassa payment and returns checkout URL
 * 
 * Request body:
 * {
 *   "amount": 299,
 *   "description": "VPN подписка на 30 дней",
 *   "email": "user@example.com"
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting: 5 requests per minute per IP
  const rateLimitResult = checkRateLimit(req, RateLimitPresets.PAYMENT_CREATE);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'Too many payment requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    // ✅ Извлекаем все параметры включая telegramId и planDuration
    const { 
      amount = 99,           // Дефолт 99₽ (не 299!)
      planDuration = 30,     // 30 дней по умолчанию
      telegramId,            // Telegram ID пользователя
      email 
    } = req.body || {};
    
    // Генерируем динамическое описание
    const description = `VPN подписка на ${planDuration} дней`;

    const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
    const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

    if (!SHOP_ID || !SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Payment not configured',
        code: 'PAYMENT_NOT_CONFIGURED'
      });
    }

    const idempotenceKey = uuidv4();
    const customerEmail = email || `user_${Date.now()}@vpn.local`;
    
    // Get base URL for return
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.BASE_URL || 'https://botinstasgram.vercel.app';

    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: `${baseUrl}/success.html`
      },
      capture: true,
      description: description,
      // ✅ Чек для онлайн-кассы
      receipt: {
        customer: {
          email: customerEmail
        },
        items: [
          {
            description: `VPN подписка ${planDuration} дней`,
            quantity: '1.00',
            amount: {
              value: amount.toFixed(2),
              currency: 'RUB'
            },
            vat_code: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service'
          }
        ]
      },
      metadata: {
        email: customerEmail,
        telegramId: telegramId || undefined,
        planDuration: planDuration
      }
    };

    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      paymentData,
      {
        auth: {
          username: SHOP_ID,
          password: SECRET_KEY
        },
        headers: {
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const payment = response.data;

    return res.status(200).json({
      success: true,
      data: {
        paymentId: payment.id,
        confirmationUrl: payment.confirmation.confirmation_url,
        status: payment.status
      }
    });

  } catch (error: any) {
    console.error('Payment error:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.description || 'Payment creation failed',
      code: 'PAYMENT_ERROR'
    });
  }
}
