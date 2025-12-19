import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PanelManager } from '../../utils/panel';
import { logger, LogEvent } from '../../utils/logger';
import { getBaseUrl } from '../../utils/constants';

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
    logger.error(LogEvent.CONFIG_ERROR, 'TELEGRAM_BOT_TOKEN not configured');
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

    logger.info(LogEvent.USER_CREATED, `Bot received message from ${firstName}`, { userId, text, firstName });

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

    // Handle /status command - показать сколько дней осталось
    if (text.startsWith('/status')) {
      await sendStatus(BOT_TOKEN, chatId, userId, firstName);
      return res.status(200).json({ ok: true });
    }

    // Handle /offer command - отправляем ссылку на оферту
    if (text.startsWith('/offer')) {
      await sendMessage(BOT_TOKEN, {
        chat_id: chatId,
        text: '📄 <b>Договор оферты</b>\n\nhttps://botinstasgram.vercel.app/offer.html',
        parse_mode: 'HTML'
      });
      return res.status(200).json({ ok: true });
    }

    // Default response
    await sendMessage(BOT_TOKEN, {
      chat_id: chatId,
      text: '👋 Используйте команду /start для получения VPN'
    });

    return res.status(200).json({ ok: true });

  } catch (error: any) {
    logger.error(LogEvent.CONFIG_ERROR, 'Error processing bot update', { error: error.message });
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}

/**
 * Send VPN link - простые инструкции, профессиональный дизайн
 */
async function sendVPNLink(botToken: string, chatId: number, userId: number, firstName: string) {
  const baseUrl = getBaseUrl();
    
  const vpnApiUrl = `${baseUrl}/api/bot/actions?action=vpn&tg_id=${userId}`;
  const payApiUrl = `${baseUrl}/api/bot/actions?action=pay&tg_id=${userId}`;
  // Оферта через API (обходит блокировку .html на мобильных)
  const offerUrl = `${baseUrl}/api/bot/actions?action=offer`;
  
  const message: TelegramMessage = {
    chat_id: chatId,
    text: 
      `👋 Привет, <b>${firstName}</b>!\n\n` +
      
      `🛡 <b>SmartVPN</b> — Умный VPN для России\n` +
      `с технологией раздельной маршрутизации\n\n` +
      
      `✅ Доступ к заблокированным сайтам и соцсетям\n` +
      `✅ Российские сервисы работают напрямую\n` +
      `✅ Банки и госпорталы без отключения VPN\n` +
      `✅ Высокая скорость и безопасность\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `🎁 <b>3 ДНЯ БЕСПЛАТНО</b>\n` +
      `💰 Потом всего <b>99₽/месяц</b>\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `📱 <b>КАК ПОДКЛЮЧИТЬ:</b>\n\n` +
      
      `<b>ШАГ 1:</b> Выберите ваше устройство\n` +
      `и скачайте приложение 👇\n\n` +
      
      `<b>ШАГ 2:</b> Вернитесь сюда и нажмите\n` +
      `"🚀 ПОЛУЧИТЬ VPN БЕСПЛАТНО"\n` +
      `Всё настроится автоматически! ✨\n\n` +
      
      `💡 <i>Умная маршрутизация автоматически\n` +
      `определяет, какие сайты открывать через VPN,\n` +
      `а какие напрямую. Никаких сложных настроек!</i>`,
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
        // Моя подписка - Mini App
        [
          {
            text: '📊 Моя подписка',
            web_app: { url: `${baseUrl}/account.html` }
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
    text: `ℹ️ <b>Помощь SmartVPN</b>\n\n` +
          `<b>Доступные команды:</b>\n` +
          `/start - Получить 3 дня бесплатно\n` +
          `/status - Проверить подписку\n` +
          `/help - Показать эту справку\n\n` +
          `<b>Как это работает:</b>\n` +
          `1. Нажми /start\n` +
          `2. Скачай приложение для своего устройства\n` +
          `3. Нажми "🚀 ПОЛУЧИТЬ VPN БЕСПЛАТНО"\n` +
          `4. Всё настроится автоматически!\n\n` +
          `<b>Что такое умная маршрутизация?</b>\n` +
          `VPN автоматически определяет:\n` +
          `• Заблокированные сайты → через VPN\n` +
          `• Российские сервисы → напрямую\n\n` +
          `Банки, Госуслуги, местные сайты работают\n` +
          `без отключения VPN!\n\n` +
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
    logger.error(LogEvent.CONFIG_ERROR, 'Failed to send Telegram message', { error });
    throw new Error(`Failed to send message: ${error}`);
  }

  return response.json();
}

/**
 * Send subscription status
 */
async function sendStatus(botToken: string, chatId: number, userId: number, firstName: string) {
  const baseUrl = getBaseUrl();
  const payApiUrl = `${baseUrl}/api/bot/actions?action=pay&tg_id=${userId}`;
  
  try {
    const INBOUND_ID = parseInt(process.env.INBOUND_ID || '1', 10);
    const email = `tg_${userId}@vpn.local`;
    const panel = new PanelManager();
    
    const client = await panel.getClientByEmail(INBOUND_ID, email);
    
    let statusText: string;
    let showPayButton = false;
    
    if (!client) {
      statusText = 
        `👋 <b>${firstName}</b>, вы ещё не получали VPN!\n\n` +
        `Нажмите /start чтобы получить\n` +
        `🎁 <b>3 дня бесплатно</b>`;
    } else {
      const now = Date.now();
      const expiryTime = client.expiryTime;
      
      if (!expiryTime || expiryTime === 0) {
        statusText = 
          `✅ <b>${firstName}</b>, ваша подписка:\n\n` +
          `📅 Статус: <b>Безлимит</b>\n` +
          `🟢 VPN: Активен`;
      } else if (expiryTime < now) {
        const expiredDaysAgo = Math.floor((now - expiryTime) / (24 * 60 * 60 * 1000));
        statusText = 
          `❌ <b>${firstName}</b>, подписка истекла!\n\n` +
          `📅 Истекла: ${expiredDaysAgo} дней назад\n` +
          `🔴 VPN: Не активен\n\n` +
          `Продлите подписку чтобы продолжить пользоваться VPN 👇`;
        showPayButton = true;
      } else {
        const daysLeft = Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000));
        const expiryDate = new Date(expiryTime).toLocaleDateString('ru-RU');
        
        let statusEmoji = '🟢';
        let urgencyText = '';
        
        if (daysLeft <= 3) {
          statusEmoji = '🟡';
          urgencyText = '\n\n⚠️ <b>Подписка скоро истечёт!</b>';
          showPayButton = true;
        }
        
        statusText = 
          `✅ <b>${firstName}</b>, ваша подписка:\n\n` +
          `📅 Осталось: <b>${daysLeft} ${getDaysWord(daysLeft)}</b>\n` +
          `📆 До: ${expiryDate}\n` +
          `${statusEmoji} VPN: Активен${urgencyText}`;
      }
    }
    
    const message: TelegramMessage = {
      chat_id: chatId,
      text: statusText,
      parse_mode: 'HTML',
      reply_markup: showPayButton ? {
        inline_keyboard: [
          [{ text: '💳 Продлить подписку 99₽', url: payApiUrl }]
        ]
      } : undefined
    };
    
    await sendMessage(botToken, message);
    
  } catch (error: any) {
    logger.error(LogEvent.CONFIG_ERROR, 'Error getting user status', { error: error.message, userId });
    await sendMessage(botToken, {
      chat_id: chatId,
      text: `❌ Не удалось получить статус.\n\nПопробуйте позже или напишите /start`,
      parse_mode: 'HTML'
    });
  }
}

/**
 * Helper: склонение слова "день"
 */
function getDaysWord(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дней';
  }
  
  if (lastDigit === 1) {
    return 'день';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }
  
  return 'дней';
}
