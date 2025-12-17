/**
 * 🚀 PRODUCTION CONSTANTS
 * Централизованные константы для Production режима
 * 
 * Дата: 17 декабря 2025
 */

// ============================================
// 🌐 URLs
// ============================================
export const URLS = {
  // Base URLs
  PRODUCTION: 'https://botinstasgram.vercel.app',
  
  // Support
  SUPPORT_TELEGRAM: '@vpn_connect_support',
  SUPPORT_LINK: 'https://t.me/vpn_connect_support',
  
  // Legal
  OFFER_PAGE: '/offer.html',
  PRIVACY_PAGE: '/privacy.html',
  
  // App Stores
  FOXRAY_APPSTORE: 'https://apps.apple.com/app/foxray/id6448898396',
  HIDDIFY_PLAYSTORE: 'https://play.google.com/store/apps/details?id=app.hiddify.com',
  HIDDIFY_APK: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Android-universal.apk',
  HIDDIFY_WINDOWS: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Windows-Setup-x64.exe',
  HIDDIFY_MAC: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-MacOS.dmg',
  HIDDIFY_RELEASES: 'https://github.com/hiddify/hiddify-next/releases',
} as const;

// ============================================
// ⏱️ TIMEOUTS & LIMITS
// ============================================
export const LIMITS = {
  // Panel connection
  PANEL_TIMEOUT_MS: 15000,
  PANEL_RETRY_COUNT: 3,
  PANEL_SESSION_TTL_MS: 60 * 60 * 1000, // 1 hour
  
  // Rate limiting
  RATE_LIMIT_PAYMENT_CREATE: { maxRequests: 5, windowMs: 60000 },
  RATE_LIMIT_USER_CREATE: { maxRequests: 10, windowMs: 60000 },
  RATE_LIMIT_CONFIG_FETCH: { maxRequests: 30, windowMs: 60000 },
  RATE_LIMIT_STATUS_CHECK: { maxRequests: 60, windowMs: 60000 },
  
  // JWT
  JWT_MIN_SECRET_LENGTH: 32,
  JWT_DEFAULT_EXPIRY_DAYS: 365,
  
  // Plans
  TRIAL_DAYS: 3,
  MONTHLY_DAYS: 30,
  YEARLY_DAYS: 365,
} as const;

// ============================================
// 💰 PRICING
// ============================================
export const PRICING = {
  TRIAL: {
    price: 0,
    days: 3,
    label: 'Бесплатно',
    description: '3 дня пробного периода',
  },
  MONTHLY: {
    price: 99,
    days: 30,
    label: '99 ₽/мес',
    description: 'Месячная подписка',
  },
  YEARLY: {
    price: 799,
    days: 365,
    label: '799 ₽/год',
    description: 'Годовая подписка (скидка 33%)',
  },
} as const;

// ============================================
// 🔒 SECURITY
// ============================================
export const SECURITY = {
  // CORS
  ALLOWED_ORIGINS: ['*'], // В продакшене можно ограничить
  ALLOWED_METHODS: ['GET', 'POST', 'OPTIONS'],
  ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
  
  // Telegram ID validation
  TELEGRAM_ID_REGEX: /^\d+$/,
  
  // Token validation
  MIN_TOKEN_LENGTH: 50,
} as const;

// ============================================
// 📱 VPN CLIENT SETTINGS
// ============================================
export const VPN_CLIENT = {
  // VLESS Flow
  FLOW: 'xtls-rprx-vision',
  
  // Fingerprint
  FINGERPRINT: 'chrome',
  
  // Transport
  TRANSPORT: 'tcp',
  
  // Security
  SECURITY: 'reality',
  
  // Default SNI options (www.microsoft.com проверен и работает!)
  RECOMMENDED_SNI: [
    'www.microsoft.com', // ✅ Основной - проверен на сервере
    'www.google.com',
    'www.cloudflare.com',
    'yahoo.com',
  ],
} as const;

// ============================================
// 📊 LOGGING
// ============================================
export const LOG_EVENTS = {
  // User events
  USER_CREATED: 'user_created',
  USER_CREATION_FAILED: 'user_creation_failed',
  TRIAL_ALREADY_USED: 'trial_already_used',
  TRIAL_EXPIRED: 'trial_expired',
  
  // Config events  
  CONFIG_GENERATED: 'config_generated',
  CONFIG_GENERATION_FAILED: 'config_generation_failed',
  
  // Panel events
  PANEL_LOGIN_SUCCESS: 'panel_login_success',
  PANEL_LOGIN_FAILED: 'panel_login_failed',
  PANEL_API_ERROR: 'panel_api_error',
  PANEL_SESSION_CACHED: 'panel_session_cached',
  
  // Token events
  TOKEN_GENERATED: 'token_generated',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  
  // Payment events
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  WEBHOOK_RECEIVED: 'webhook_received',
  WEBHOOK_IGNORED: 'webhook_ignored',
  
  // Security events
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_TELEGRAM_ID: 'invalid_telegram_id',
  
  // Traffic events
  TRAFFIC_CHECKED: 'traffic_checked',
} as const;

// ============================================
// 🏢 LEGAL INFO
// ============================================
export const LEGAL = {
  COMPANY_NAME: 'ИП Дмитричев Александр Геннадьевич',
  INN: '520500573503',
  COPYRIGHT_YEAR: 2024,
  SERVICE_NAME: 'VPN Connect',
} as const;

// ============================================
// 🔧 HELPER FUNCTIONS
// ============================================

/**
 * Get base URL for current environment
 */
export function getBaseUrl(): string {
  // Vercel automatically sets this
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Custom base URL
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  // Fallback to production
  return URLS.PRODUCTION;
}

/**
 * Get support contact
 */
export function getSupportContact(): string {
  return process.env.SUPPORT_TELEGRAM || URLS.SUPPORT_TELEGRAM;
}

/**
 * Calculate expiry timestamp
 */
export function calculateExpiryTime(days: number): number {
  if (days <= 0) return 0; // Unlimited
  return Date.now() + (days * 24 * 60 * 60 * 1000);
}

/**
 * Check if expiry time is in the past
 */
export function isExpired(expiryTime: number): boolean {
  if (expiryTime === 0) return false; // Unlimited never expires
  return expiryTime < Date.now();
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(expiryTime: number, locale: string = 'ru-RU'): string {
  if (expiryTime === 0) return 'Безлимит';
  return new Date(expiryTime).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
