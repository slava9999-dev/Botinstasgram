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
 * Send VPN link with PHOTO and direct API calls
 */
async function sendVPNLink(botToken: string, chatId: number, userId: number, firstName: string) {
  // ✅ Динамический base URL
  const baseUrl = process.env.BASE_URL || 'https://botinstasgram.vercel.app';
    
  // ОБЪЕДИНЁННЫЙ API (экономим serverless функции!)
  const vpnApiUrl = `${baseUrl}/api/bot/actions?action=vpn&tg_id=${userId}`;
  const payApiUrl = `${baseUrl}/api/bot/actions?action=pay&tg_id=${userId}`;
  const offerUrl = `${baseUrl}/offer.html`;
  const photoUrl = `${baseUrl}/all.png`;  // Картинка с сервисами
  
  // Отправляем ФОТО с caption и кнопками
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
  const payload = {
    chat_id: chatId,
    photo: photoUrl,
    caption: 
      `👋 Привет, <b>${firstName}</b>!\n\n` +
      `🛡️ <b>VPN Connect</b>\n` +
      `Безлимитный доступ ко всем сервисам\n\n` +
      
      `╔═══════════════════╗\n` +
      `║  ▶️ YouTube        ║\n` +
      `║  📸 Instagram      ║\n` +
      `║  👤 Facebook       ║\n` +
      `║  🐦 Twitter/X      ║\n` +
      `║  🎵 Spotify        ║\n` +
      `║  🎬 Netflix        ║\n` +
      `║  💬 ChatGPT        ║\n` +
      `║  🎮 Discord        ║\n` +
      `╚═══════════════════╝\n\n` +
      
      `✅ <b>Все зарубежные сервисы</b>\n` +
      `✅ <b>Российские банки работают</b>\n` +
      `✅ <b>Высокая скорость</b>\n\n` +
      
      `🎁 <b>3 ДНЯ БЕСПЛАТНО</b>\n` +
      `💰 Потом <b>99₽/месяц</b>\n\n` +
      
      `━━━━━━━━━━━━━━━━━━\n` +
      `<b>⚡ 3 ПРОСТЫХ ШАГА:</b>\n\n` +
      `<b>1️⃣</b> Скачай приложение ниже\n` +
      `<b>2️⃣</b> Нажми "🚀 Получить VPN"\n` +
      `<b>3️⃣</b> Готово! Всё настроится само`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        // Row 1: ГЛАВНАЯ КНОПКА - яркая и заметная
        [
          {
            text: '🚀 ПОЛУЧИТЬ VPN БЕСПЛАТНО 🎁',
            url: vpnApiUrl
          }
        ],
        // Row 2: Download apps
        [
          {
            text: '📱 iPhone',
            url: 'https://apps.apple.com/app/streisand/id6450534064'
          },
          {
            text: '🤖 Android',
            url: 'https://play.google.com/store/apps/details?id=app.hiddify.com'
          }
        ],
        // Row 3: Desktop + APK
        [
          {
            text: '💻 Компьютер',
            url: 'https://github.com/hiddify/hiddify-next/releases'
          },
          {
            text: '📦 APK',
            url: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Android-universal.apk'
          }
        ],
        // Row 4: Payment - яркая кнопка
        [
          {
            text: '💳 ОПЛАТИТЬ 99₽/месяц 💎',
            url: payApiUrl
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Bot] Failed to send photo:', error);
    throw new Error(`Failed to send photo: ${error}`);
  }

  return response.json();
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
