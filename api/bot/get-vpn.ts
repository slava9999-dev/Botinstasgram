import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { PanelManager } from '../../utils/panel';
import { generateConfigToken } from '../../utils/jwt';
import { RateLimitStorage, TrialStorage } from '../../utils/storage';
import { logger, LogEvent } from '../../utils/logger';

/**
 * GET /api/bot/get-vpn?tg_id=123456789
 * 
 * ПРЯМОЙ API для получения VPN из Telegram бота
 * БЕЗ ЛЕНДИНГА! Сразу создаёт конфиг и редиректит на /api/go/[token]
 */

const KV_RATE_PRESETS = {
  USER_CREATE: { maxRequests: 10, windowMs: 60000 }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tg_id } = req.query;
  const telegramId = typeof tg_id === 'string' ? tg_id : null;

  if (!telegramId) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>❌ Ошибка</h1>
        <p>Откройте ссылку через Telegram бот</p>
      </body></html>
    `);
  }

  // Rate limiting
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIP = typeof forwardedFor === 'string' 
    ? forwardedFor.split(',')[0].trim() 
    : 'unknown';
  
  const rateLimitResult = await RateLimitStorage.check(clientIP, KV_RATE_PRESETS.USER_CREATE);
  if (!rateLimitResult.allowed) {
    return res.status(429).send(`
      <!DOCTYPE html>
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>⏱️ Слишком много запросов</h1>
        <p>Попробуйте через минуту</p>
      </body></html>
    `);
  }

  try {
    const email = `tg_${telegramId}@vpn.local`;
    const duration = 3; // Trial
    const INBOUND_ID = parseInt(process.env.INBOUND_ID || '1', 10);
    const panel = new PanelManager();

    // Проверка существующего trial
    const existingClient = await panel.getClientByEmail(INBOUND_ID, email);
    
    let configToken: string;

    if (existingClient) {
      const isExpired = existingClient.expiryTime && existingClient.expiryTime < Date.now();
      
      if (isExpired) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>⏰ Пробный период закончился</h1>
            <p>Оплатите подписку 99₽/месяц в боте</p>
          </body></html>
        `);
      }
      
      // Trial ещё активен
      configToken = generateConfigToken(existingClient, 
        Math.ceil((existingClient.expiryTime - Date.now()) / (24 * 60 * 60 * 1000))
      );
    } else {
      // Создаём нового клиента
      const uuid = uuidv4();
      const clientInfo = await panel.addClient(INBOUND_ID, email, uuid, duration);
      configToken = generateConfigToken(clientInfo, duration);

      // Сохраняем trial в KV
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

    // РЕДИРЕКТ на /api/go/[token] который откроет приложение
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'botinstasgram.vercel.app';
    const goUrl = `${protocol}://${host}/api/go/${configToken}`;

    return res.redirect(302, goUrl);

  } catch (error: any) {
    logger.error(LogEvent.USER_CREATION_FAILED, 'Bot get-vpn error', { error: error.message });
    return res.status(500).send(`
      <!DOCTYPE html>
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>❌ Ошибка сервера</h1>
        <p>${error.message}</p>
      </body></html>
    `);
  }
}
