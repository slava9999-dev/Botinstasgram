import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/bot/pay?tg_id=123456789
 * 
 * ПРЯМОЙ API для оплаты из Telegram бота
 * БЕЗ ЛЕНДИНГА! Сразу создаёт платёж и редиректит на YooKassa
 */

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

  try {
    const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
    const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

    if (!SHOP_ID || !SECRET_KEY) {
      return res.status(500).send(`
        <!DOCTYPE html>
        <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Оплата не настроена</h1>
          <p>Обратитесь в поддержку</p>
        </body></html>
      `);
    }

    const amount = 99;
    const planDuration = 30;
    const description = `VPN подписка на ${planDuration} дней`;
    const idempotenceKey = uuidv4();
    
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
      metadata: {
        email: `tg_${telegramId}@vpn.local`,
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

    const payment = response.data;

    // РЕДИРЕКТ сразу на YooKassa
    return res.redirect(302, payment.confirmation.confirmation_url);

  } catch (error: any) {
    console.error('Bot payment error:', error.response?.data || error.message);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>❌ Ошибка создания платежа</h1>
        <p>${error.response?.data?.description || error.message}</p>
      </body></html>
    `);
  }
}
