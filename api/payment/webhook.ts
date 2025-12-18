import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { PanelManager } from '../../utils/panel';
import { generateConfigToken } from '../../utils/jwt';
import { logger, LogEvent } from '../../utils/logger';
import { PaymentStorage, PaymentRecord } from '../../utils/storage';

/**
 * POST /api/payment/webhook
 * YooKassa webhook handler for payment confirmation.
 * 
 * SECURITY:
 * - Validates that request comes from YooKassa IP range
 * - Stores payments in Vercel KV (persistent)
 * - Logs all webhook events
 * 
 * Flow:
 * 1. YooKassa sends notification when payment is captured
 * 2. We verify the source IP
 * 3. Create user in 3X-UI panel
 * 4. Store payment data in Vercel KV
 * 
 * YooKassa notification format:
 * {
 *   "type": "notification",
 *   "event": "payment.succeeded" | "payment.canceled" | "payment.waiting_for_capture",
 *   "object": {
 *     "id": "payment_id",
 *     "status": "succeeded",
 *     "amount": { "value": "99.00", "currency": "RUB" },
 *     "metadata": { "email": "user@example.com", "telegramId": "123456789" }
 *   }
 * }
 */

// ============================================
// YOOKASSA IP VERIFICATION
// ============================================

// YooKassa official IP ranges (as of 2024)
// Source: https://yookassa.ru/developers/using-api/webhooks
const YOOKASSA_IP_RANGES = [
  '185.71.76.', '185.71.77.',   // 185.71.76.0/24, 185.71.77.0/24
  '77.75.153.', '77.75.154.',   // 77.75.153.0/24
  '77.75.156.', '77.75.157.',   // Additional ranges
];

/**
 * Verify that request comes from YooKassa IP
 */
function isYooKassaIP(req: VercelRequest): boolean {
  // Get client IP from various headers
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  let clientIP: string | null = null;
  
  if (typeof forwardedFor === 'string') {
    // x-forwarded-for may contain multiple IPs, take the first one
    clientIP = forwardedFor.split(',')[0].trim();
  } else if (typeof realIP === 'string') {
    clientIP = realIP.trim();
  }
  
  if (!clientIP) {
    console.warn('[Webhook] Could not determine client IP');
    // In development, allow requests without IP check
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }
  
  console.log(`[Webhook] Request from IP: ${clientIP}`);
  
  // Check if IP starts with any of the YooKassa ranges
  const isValid = YOOKASSA_IP_RANGES.some(range => clientIP!.startsWith(range));
  
  if (!isValid) {
    console.warn(`[Webhook] IP ${clientIP} not in YooKassa range!`);
  }
  
  return isValid;
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ SECURITY: Verify YooKassa IP
    if (!isYooKassaIP(req)) {
      console.error('[Webhook] Request from unauthorized IP');
      // Return 200 to not reveal security check to attacker
      return res.status(200).json({ status: 'ignored' });
    }

    const notification = req.body;

    // Validate notification structure
    if (!notification || !notification.event || !notification.object) {
      console.error('[Webhook] Invalid notification structure:', notification);
      return res.status(400).json({ error: 'Invalid notification format' });
    }

    const { event, object: payment } = notification;

    // Log webhook received
    logger.logWebhookReceived(event, payment.id);

    // Only process successful payments
    if (event !== 'payment.succeeded' && event !== 'payment.waiting_for_capture') {
      logger.info(LogEvent.WEBHOOK_IGNORED, `Ignoring event: ${event}`, { event, paymentId: payment.id });
      return res.status(200).json({ status: 'ignored', event });
    }

    // For waiting_for_capture, we need to capture it (auto-capture should be enabled)
    if (payment.status !== 'succeeded' && payment.status !== 'waiting_for_capture') {
      console.log(`[Webhook] Payment not succeeded yet: ${payment.status}`);
      return res.status(200).json({ status: 'pending', paymentStatus: payment.status });
    }

    // Check if already processed (using KV now!)
    const existingPayment = await PaymentStorage.getById(payment.id);
    if (existingPayment) {
      console.log(`[Webhook] Payment already processed: ${payment.id}`);
      return res.status(200).json({ 
        status: 'already_processed',
        configUrl: existingPayment.configUrl 
      });
    }

    // Extract data from metadata
    const email = payment.metadata?.email || `user_${payment.id}@vpn.local`;
    const telegramId = payment.metadata?.telegramId;
    const amount = parseFloat(payment.amount?.value || '99');

    // Create or extend user in 3X-UI panel
    const INBOUND_ID = parseInt(process.env.INBOUND_ID || '1', 10);
    const planDuration = 30; // days

    let configToken: string;
    let configUrl: string;
    let uuid: string;
    let isExtension = false;

    try {
      const panel = new PanelManager();
      
      // ✅ Сначала проверяем - есть ли уже такой пользователь
      const existingClient = await panel.getClientByEmail(INBOUND_ID, email);
      
      if (existingClient) {
        // ✅ ПРОДЛЕНИЕ ПОДПИСКИ существующего пользователя
        console.log(`[Webhook] Found existing client ${email}, extending subscription`);
        
        const extensionResult = await panel.extendClientByEmail(INBOUND_ID, email, planDuration);
        
        if (extensionResult) {
          uuid = extensionResult.uuid;
          isExtension = true;
          console.log(`[Webhook] ✅ Extended ${email} until ${extensionResult.message}`);
          
          // Генерируем токен с данными клиента
          configToken = generateConfigToken({
            uuid: existingClient.uuid,
            email: existingClient.email,
            inboundId: existingClient.inboundId,
            serverAddress: existingClient.serverAddress,
            port: existingClient.port,
            publicKey: existingClient.publicKey,
            shortId: existingClient.shortId,
            serverName: existingClient.serverName
          }, planDuration);
        } else {
          throw new Error('Failed to extend subscription');
        }
      } else {
        // ✅ НОВЫЙ ПОЛЬЗОВАТЕЛЬ - создаём
        console.log(`[Webhook] Creating new client ${email}`);
        uuid = uuidv4();
        const clientInfo = await panel.addClient(INBOUND_ID, email, uuid, planDuration);
        configToken = generateConfigToken(clientInfo, planDuration);
      }

      // Build config URL
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.BASE_URL || 'https://botinstasgram.vercel.app';
      
      configUrl = `${baseUrl}/api/go/${configToken}`;
    } catch (panelError: any) {
      console.error('[Webhook] Panel error:', panelError.message);
      // Still acknowledge the webhook, but log the error
      return res.status(200).json({ 
        status: 'panel_error',
        error: panelError.message,
        paymentId: payment.id
      });
    }

    const expiresAt = new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000);

    // ✅ Save to Vercel KV (persistent!)
    const record: PaymentRecord = {
      paymentId: payment.id,
      email,
      telegramId,
      amount,
      configToken,
      configUrl,
      uuid,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'succeeded'
    };

    await PaymentStorage.save(record);

    console.log(`[Webhook] ✅ Payment confirmed and saved: ${payment.id}, email: ${email}`);

    return res.status(200).json({
      status: 'success',
      paymentId: payment.id,
      email,
      configUrl,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    // Always return 200 to YooKassa to prevent retries on our errors
    return res.status(200).json({
      status: 'error',
      error: error.message
    });
  }
}
