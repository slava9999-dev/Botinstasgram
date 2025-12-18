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
      web_app?: { url: string };  // ✅ Telegram Mini App support
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
 * Send VPN link - простые инструкции, профессиональный дизайн
 */
async function sendVPNLink(botToken: string, chatId: number, userId: number, firstName: string) {
  const baseUrl = process.env.BASE_URL || 'https://botinstasgram.vercel.app';
    
  const vpnApiUrl = `${baseUrl}/api/bot/actions?action=vpn&tg_id=${userId}`;
  const payApiUrl = `${baseUrl}/api/bot/actions?action=pay&tg_id=${userId}`;
  const offerUrl = `${baseUrl}/offer.html`;
  
  const message: TelegramMessage = {
    chat_id: chatId,
    text: 
      `👋 Привет, <b>${firstName}</b>!\n\n` +
      
      `🛡 <b>VPN Connect</b> — безлимитный доступ\n\n` +
      
      `▶️ YouTube   📸 Instagram   👤 Facebook\n` +
      `🐦 Twitter   🎵 Spotify   🎬 Netflix\n` +
      `💬 ChatGPT   🎮 Discord   📺 Twitch\n\n` +
      
      `✅ Все зарубежные сервисы\n` +
      `✅ Российские банки работают\n` +
      `✅ Высокая скорость\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `🎁 <b>3 ДНЯ БЕСПЛАТНО</b>\n` +
      `💰 Потом всего <b>99₽/месяц</b>\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `📱 <b>КАК ПОДКЛЮЧИТЬ:</b>\n\n` +
      
      `<b>ШАГ 1:</b> Выберите ваше устройство\n` +
      `и скачайте приложение 👇\n\n` +
      
      `<b>ШАГ 2:</b> Вернитесь сюда и нажмите\n` +
      `"🚀 ПОЛУЧИТЬ VPN БЕСПЛАТНО"\n` +
      `Всё настроится автоматически! ✨`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        // ШАГ 1: Выбор устройства
        [
          {
            text: '📱 Скачать для iPhone',
            url: 'https://apps.apple.com/app/streisand/id6450534064'
          }
        ],
        [
          {
            text: '🤖 Скачать для Android',
            url: 'https://play.google.com/store/apps/details?id=app.hiddify.com'
          }
        ],
        [
          {
            text: '💻 Скачать для ПК',
            url: 'https://github.com/hiddify/hiddify-next/releases'
          }
        ],
        [
          {
            text: '📦 Скачать напрямую (APK)',
            url: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Android-universal.apk'
          }
        ],
        // ШАГ 2: Получить VPN
        [
          {
            text: '🚀 ПОЛУЧИТЬ VPN БЕСПЛАТНО',
            url: vpnApiUrl
          }
        ],
        // Оплата
        [
          {
            text: '💳 Оплатить 99₽/месяц',
            url: payApiUrl
          }
        ],
        // Юридическое
        [
          {
            text: '📄 Договор оферты',
            url: offerUrl
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
          `<b>Поддержка:</b> @vpn_connect_support`,
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
