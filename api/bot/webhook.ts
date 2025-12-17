import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Telegram Bot Webhook Handler
 * 
 * Обрабатывает команды от Telegram бота и отправляет пользователям
 * персональные ссылки с их Telegram ID.
 * 
 * POST /api/bot/webhook
 */

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

interface TelegramMessage {
  chat_id: number;
  text: string;
  parse_mode?: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string;
      url?: string;
      callback_data?: string;
    }>>;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN) {
    console.error('[Bot] TELEGRAM_BOT_TOKEN not configured');
    return res.status(500).json({ error: 'Bot not configured' });
  }

  try {
    const update: TelegramUpdate = req.body;
    
    // Ignore updates without message
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const userId = message.from.id;
    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from.first_name;

    console.log(`[Bot] Received message from ${firstName} (${userId}): ${text}`);

    // Handle /start command
    if (text.startsWith('/start')) {
      await sendVPNLink(BOT_TOKEN, chatId, userId, firstName);
      return res.status(200).json({ ok: true });
    }

    // Handle /help command
    if (text.startsWith('/help')) {
      await sendHelp(BOT_TOKEN, chatId);
      return res.status(200).json({ ok: true });
    }

    // Default response
    await sendMessage(BOT_TOKEN, {
      chat_id: chatId,
      text: '👋 Используйте команду /start для получения VPN'
    });

    return res.status(200).json({ ok: true });

  } catch (error: any) {
    console.error('[Bot] Error processing update:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}

/**
 * Send VPN link to user
 */
async function sendVPNLink(botToken: string, chatId: number, userId: number, firstName: string) {
  const vpnUrl = `https://botinstasgram.vercel.app?tg_id=${userId}`;
  
  const message: TelegramMessage = {
    chat_id: chatId,
    text: `👋 Привет, ${firstName}!\n\n` +
          `🔐 Получи бесплатный VPN для доступа к Instagram и YouTube!\n\n` +
          `✨ Что ты получишь:\n` +
          `• 3 дня бесплатного доступа\n` +
          `• Безлимитный трафик\n` +
          `• Высокая скорость\n` +
          `• Работает на всех устройствах\n\n` +
          `📱 Нажми кнопку ниже для получения VPN:`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Получить VPN БЕСПЛАТНО',
            url: vpnUrl
          }
        ],
        [
          {
            text: '💳 Купить подписку (99₽/месяц)',
            url: vpnUrl
          }
        ]
      ]
    }
  };

  await sendMessage(botToken, message);
}

/**
 * Send help message
 */
async function sendHelp(botToken: string, chatId: number) {
  const message: TelegramMessage = {
    chat_id: chatId,
    text: `ℹ️ <b>Помощь</b>\n\n` +
          `<b>Доступные команды:</b>\n` +
          `/start - Получить VPN\n` +
          `/help - Показать эту справку\n\n` +
          `<b>Как это работает:</b>\n` +
          `1. Нажми /start\n` +
          `2. Нажми кнопку "Получить VPN"\n` +
          `3. Следуй инструкциям на сайте\n` +
          `4. Наслаждайся доступом к Instagram!\n\n` +
          `<b>Поддержка:</b> @your_support_username`,
    parse_mode: 'HTML'
  };

  await sendMessage(botToken, message);
}

/**
 * Send message via Telegram Bot API
 */
async function sendMessage(botToken: string, message: TelegramMessage) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Bot] Failed to send message:', error);
    throw new Error(`Failed to send message: ${error}`);
  }

  return response.json();
}
