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
 * Send VPN link with all buttons: VPN, Payment, Apps, Offer
 */
async function sendVPNLink(botToken: string, chatId: number, userId: number, firstName: string) {
  // ✅ Динамический base URL
  const baseUrl = process.env.BASE_URL || 'https://botinstasgram.vercel.app';
    
  const vpnUrl = `${baseUrl}?tg_id=${userId}`;
  const payUrl = `${baseUrl}?tg_id=${userId}&action=pay`;
  const offerUrl = `${baseUrl}/offer.html`;
  
  const message: TelegramMessage = {
    chat_id: chatId,
    text: `👋 Привет, <b>${firstName}</b>!\n\n` +
          `🛡️ <b>VPN Connect</b> — безлимитный доступ\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `▶️ YouTube  •  📸 Instagram  •  👤 Facebook\n` +
          `🐦 Twitter  •  🎵 Spotify  •  🎬 Netflix\n` +
          `💬 ChatGPT  •  🎮 Discord  •  📺 Twitch\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `✅ <b>Все зарубежные сервисы</b>\n` +
          `✅ <b>Российские банки и сервисы</b>\n` +
          `✅ <b>Высокая скорость</b>\n\n` +
          `🎁 <b>3 дня БЕСПЛАТНО</b>\n` +
          `💰 Далее всего <b>99₽/месяц</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📲 <b>Как подключиться:</b>\n\n` +
          `<b>1.</b> Скачай приложение (кнопки ниже)\n` +
          `<b>2.</b> Нажми "🚀 Получить VPN"\n` +
          `<b>3.</b> Готово — VPN настроится автоматически!`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        // Row 1: Main action - Get VPN
        [
          {
            text: '🚀 ПОЛУЧИТЬ VPN БЕСПЛАТНО',
            url: vpnUrl
          }
        ],
        // Row 2: Download apps
        [
          {
            text: '📱 iPhone (Streisand)',
            url: 'https://apps.apple.com/app/streisand/id6450534064'
          },
          {
            text: '🤖 Android (Hiddify)',
            url: 'https://play.google.com/store/apps/details?id=app.hiddify.com'
          }
        ],
        // Row 3: Desktop + APK
        [
          {
            text: '💻 Windows/Mac',
            url: 'https://github.com/hiddify/hiddify-next/releases'
          },
          {
            text: '📦 APK (без Play Store)',
            url: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Android-universal.apk'
          }
        ],
        // Row 4: Payment
        [
          {
            text: '💳 ОПЛАТИТЬ 99₽/месяц',
            url: payUrl
          }
        ],
        // Row 5: Legal
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
