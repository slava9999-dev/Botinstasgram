import crypto from 'crypto';

/**
 * Generate idempotency key for YooKassa API
 * Format: uuid-v4 based on timestamp and random data
 */
export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(timestamp + random).digest('hex');
  
  // Format as UUID v4
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * Validate environment variables for YooKassa
 */
export function validateYooKassaEnv(): { shopId: string; secretKey: string } {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error(
      'YooKassa credentials not configured. Please set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY in environment variables.'
    );
  }

  return { shopId, secretKey };
}

/**
 * Validate panel environment variables
 */
export function validatePanelEnv(): {
  panelUrl: string;
  panelUser: string;
  panelPass: string;
  inboundId: number;
} {
  const panelUrl = process.env.PANEL_URL;
  const panelUser = process.env.PANEL_USER;
  const panelPass = process.env.PANEL_PASS;
  const inboundId = process.env.INBOUND_ID;

  if (!panelUrl || !panelUser || !panelPass || !inboundId) {
    throw new Error(
      'Panel credentials not configured. Please set PANEL_URL, PANEL_USER, PANEL_PASS, and INBOUND_ID in environment variables.'
    );
  }

  return {
    panelUrl,
    panelUser,
    panelPass,
    inboundId: parseInt(inboundId, 10)
  };
}

/**
 * Format price for display (rubles)
 */
export function formatPrice(amount: number): string {
  return `${amount}₽`;
}

/**
 * Convert rubles to kopecks (YooKassa uses kopecks)
 */
export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100);
}
