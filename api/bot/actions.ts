import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { PanelManager } from '../../utils/panel';
import { generateConfigToken } from '../../utils/jwt';
import { RateLimitStorage, TrialStorage } from '../../utils/storage';
import { logger, LogEvent } from '../../utils/logger';

/**
 * GET /api/bot/actions?action=vpn&tg_id=123456789
 * GET /api/bot/actions?action=pay&tg_id=123456789
 * 
 * ОБЪЕДИНЁННЫЙ API для действий из Telegram бота
 * action=vpn → создаёт VPN и редиректит на приложение
 * action=pay → создаёт платёж и редиректит на YooKassa
 */

const KV_RATE_PRESETS = {
  USER_CREATE: { maxRequests: 10, windowMs: 60000 }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, tg_id } = req.query;
  const telegramId = typeof tg_id === 'string' ? tg_id : null;

  if (!telegramId) {
    // Для оферты не нужен telegramId
    if (action === 'offer') {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'] || 'botinstasgram.vercel.app';
      return res.redirect(302, `${protocol}://${host}/offer.html`);
    }
    return res.status(400).send(errorPage('Откройте ссылку через Telegram бот'));
  }

  if (action === 'vpn') {
    return handleVPN(req, res, telegramId);
  }

  if (action === 'pay') {
    return handlePay(req, res, telegramId);
  }

  if (action === 'offer') {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'botinstasgram.vercel.app';
    return res.redirect(302, `${protocol}://${host}/offer.html`);
  }

  return res.status(400).send(errorPage('Неизвестное действие'));
}

// ============================================
// VPN HANDLER
// ============================================
async function handleVPN(req: VercelRequest, res: VercelResponse, telegramId: string) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIP = typeof forwardedFor === 'string' 
    ? forwardedFor.split(',')[0].trim() 
    : 'unknown';
  
  const rateLimitResult = await RateLimitStorage.check(clientIP, KV_RATE_PRESETS.USER_CREATE);
  if (!rateLimitResult.allowed) {
    return res.status(429).send(errorPage('Слишком много запросов. Попробуйте через минуту.'));
  }

  try {
    const email = `tg_${telegramId}@vpn.local`;
    const duration = 3;
    const INBOUND_ID = parseInt(process.env.INBOUND_ID || '1', 10);
    const panel = new PanelManager();

    const existingClient = await panel.getClientByEmail(INBOUND_ID, email);
    
    let configToken: string;

    if (existingClient) {
      const isExpired = existingClient.expiryTime && existingClient.expiryTime < Date.now();
      
      if (isExpired) {
        return res.status(403).send(errorPage('Пробный период закончился. Оплатите подписку 99₽/месяц.'));
      }
      
      configToken = generateConfigToken(existingClient, 
        Math.ceil((existingClient.expiryTime - Date.now()) / (24 * 60 * 60 * 1000))
      );
    } else {
      const uuid = uuidv4();
      const clientInfo = await panel.addClient(INBOUND_ID, email, uuid, duration);
      configToken = generateConfigToken(clientInfo, duration);

      const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();
      await TrialStorage.markUsed(telegramId, {
        telegramId,
        email,
        uuid,
        createdAt: new Date().toISOString(),
        expiresAt,
        used: true
      });

      logger.logUserCreated(uuid, email, duration);
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'botinstasgram.vercel.app';
    const goUrl = `${protocol}://${host}/api/go/${configToken}`;

    return res.redirect(302, goUrl);

  } catch (error: any) {
    logger.error(LogEvent.USER_CREATION_FAILED, 'Bot VPN error', { error: error.message });
    return res.status(500).send(errorPage(error.message));
  }
}

// ============================================
// PAY HANDLER
// ============================================
async function handlePay(req: VercelRequest, res: VercelResponse, telegramId: string) {
  try {
    const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
    const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

    if (!SHOP_ID || !SECRET_KEY) {
      return res.status(500).send(errorPage('Оплата не настроена. Обратитесь в поддержку.'));
    }

    const amount = 99;
    const planDuration = 30;
    const description = `VPN подписка на ${planDuration} дней`;
    const idempotenceKey = uuidv4();
    const customerEmail = `tg_${telegramId}@vpn.local`;
    
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'botinstasgram.vercel.app';
    const baseUrl = `${protocol}://${host}`;

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
      // ✅ Чек для онлайн-кассы (обязательно для ЮKassa)
      receipt: {
        customer: {
          email: customerEmail
        },
        items: [
          {
            description: 'VPN подписка 30 дней',
            quantity: '1.00',
            amount: {
              value: amount.toFixed(2),
              currency: 'RUB'
            },
            vat_code: 1,  // НДС не облагается
            payment_mode: 'full_payment',
            payment_subject: 'service'
          }
        ]
      },
      metadata: {
        email: customerEmail,
        telegramId: telegramId,
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

    return res.redirect(302, response.data.confirmation.confirmation_url);

  } catch (error: any) {
    console.error('Bot payment error:', error.response?.data || error.message);
    return res.status(500).send(errorPage(error.response?.data?.description || error.message));
  }
}

// ============================================
// ERROR PAGE
// ============================================
function errorPage(message: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN Connect</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 24px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { font-size: 48px; margin-bottom: 20px; }
    p { font-size: 18px; color: #555; line-height: 1.6; }
    .btn {
      display: inline-block;
      margin-top: 30px;
      padding: 15px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 30px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>❌</h1>
    <p>${message}</p>
    <a href="https://t.me/your_bot" class="btn">Вернуться в бот</a>
  </div>
</body>
</html>
  `;
}
