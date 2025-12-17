import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { PanelManager } from '../../utils/panel';
import { generateConfigToken } from '../../utils/jwt';
import { checkRateLimit, RateLimitPresets } from '../../utils/rate-limit';

/**
 * POST /api/create-user
 * Creates a new user in 3X-UI panel and returns config URL.
 * 
 * ВАЖНО: Trial (3 дня бесплатно) даётся только ОДИН РАЗ на Telegram ID!
 * 
 * Request body:
 * {
 *   "telegramId": "123456789",  // ОБЯЗАТЕЛЬНО для trial!
 *   "planDuration": 3,          // 3 = trial, 30 = paid month
 *   "isPaid": false             // true если оплачено
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
      error: 'Слишком много запросов. Попробуйте через минуту.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    const { 
      telegramId, 
      email: customEmail,
      planDuration = 3, 
      isPaid = false 
    } = req.body || {};

    // Validate telegramId for trial
    const duration = parseInt(planDuration, 10);
    const isTrial = duration <= 3 && !isPaid;

    if (isTrial && !telegramId) {
      return res.status(400).json({ 
        error: 'Telegram ID обязателен для бесплатного периода',
        code: 'TELEGRAM_ID_REQUIRED'
      });
    }

    // Generate email based on telegramId or random
    // Format: tg_123456789@vpn.local (для проверки уникальности)
    const email = telegramId 
      ? `tg_${telegramId}@vpn.local`
      : customEmail || `user_${Date.now()}@vpn.local`;

    // Validate duration
    if (isNaN(duration) || duration < 1 || duration > 365) {
      return res.status(400).json({ 
        error: 'Срок подписки должен быть от 1 до 365 дней',
        code: 'INVALID_DURATION'
      });
    }

    const INBOUND_ID = parseInt(process.env.INBOUND_ID || '1', 10);
    const panel = new PanelManager();

    // КРИТИЧЕСКАЯ ПРОВЕРКА: Для trial - проверяем, использовал ли уже
    if (isTrial && telegramId) {
      const existingClient = await panel.getClientByEmail(INBOUND_ID, email);
      
      if (existingClient) {
        // Пользователь уже получал trial!
        const expiryDate = existingClient.expiryTime 
          ? new Date(existingClient.expiryTime).toLocaleDateString('ru-RU')
          : 'неизвестно';
        
        const isExpired = existingClient.expiryTime && existingClient.expiryTime < Date.now();
        
        if (isExpired) {
          // Trial истёк - предлагаем оплатить
          return res.status(403).json({ 
            error: 'Бесплатный период закончился. Оплатите подписку для продолжения.',
            code: 'TRIAL_EXPIRED',
            data: {
              expiredAt: expiryDate,
              needPayment: true
            }
          });
        } else {
          // Trial ещё активен - возвращаем существующие данные
          const configToken = generateConfigToken(existingClient, 
            Math.ceil((existingClient.expiryTime - Date.now()) / (24 * 60 * 60 * 1000))
          );
          
          return res.status(200).json({
            success: true,
            alreadyExists: true,
            data: {
              uuid: existingClient.uuid,
              email: existingClient.email,
              configToken,
              expiresAt: new Date(existingClient.expiryTime).toISOString()
            }
          });
        }
      }
    }

    // Создаём нового клиента
    const uuid = uuidv4();
    const clientInfo = await panel.addClient(INBOUND_ID, email, uuid, duration);

    // Generate stateless token
    const configToken = generateConfigToken(clientInfo, duration);

    // Build response
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

    return res.status(200).json({
      success: true,
      data: {
        uuid,
        email,
        configToken,
        expiresAt,
        isTrial,
        daysRemaining: duration
      }
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      error: error.message || 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR'
    });
  }
}
