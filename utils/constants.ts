/**
 * 🔒 PROJECT CONSTANTS - DO NOT MODIFY
 * 
 * This file contains critical constants that should NEVER be changed
 * in production without careful consideration and testing.
 * 
 * Version: 2.1.0
 * Last updated: 2025-12-16
 */

// ============================================
// 🔐 SECURITY CONSTANTS
// ============================================

/**
 * JWT Configuration
 * WARNING: Changing these will invalidate all existing tokens!
 */
export const JWT_CONFIG = {
  ALGORITHM: 'HS256' as const,
  DEFAULT_EXPIRY_DAYS: 365,
  MIN_SECRET_LENGTH: 32,
} as const;

/**
 * Rate Limiting Configuration
 * Adjust these carefully - too strict = bad UX, too loose = security risk
 */
export const RATE_LIMITS = {
  PAYMENT_CREATE: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
  },
  USER_CREATE: {
    maxRequests: 10,
    windowMs: 60000,
  },
  CONFIG_FETCH: {
    maxRequests: 30,
    windowMs: 60000,
  },
  STATUS_CHECK: {
    maxRequests: 60,
    windowMs: 60000,
  },
  WEBHOOK: {
    maxRequests: 100,
    windowMs: 60000,
  },
} as const;

// ============================================
// 💳 PAYMENT CONSTANTS
// ============================================

/**
 * Payment Configuration
 */
export const PAYMENT_CONFIG = {
  DEFAULT_AMOUNT: 99, // rubles
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 100000,
  DEFAULT_PLAN_DURATION: 30, // days
  CURRENCY: 'RUB' as const,
} as const;

/**
 * Trial Configuration
 */
export const TRIAL_CONFIG = {
  DURATION_DAYS: 3,
  ONE_PER_USER: true,
  REQUIRE_TELEGRAM_ID: true,
} as const;

/**
 * Telegram Bot Configuration
 */
export const TELEGRAM_CONFIG = {
  SUPPORT_USERNAME: '@vpn_connect_support',
  SUPPORT_LINK: 'https://t.me/vpn_connect_support',
  BOT_USERNAME: '@VPNConnectBot', // TODO: Update with real bot username
} as const;

/**
 * YooKassa API
 */
export const YOOKASSA_CONFIG = {
  API_URL: 'https://api.yookassa.ru/v3',
  TIMEOUT: 30000, // 30 seconds
} as const;

// ============================================
// 🖥️ PANEL CONSTANTS
// ============================================

/**
 * 3X-UI Panel Configuration
 */
export const PANEL_CONFIG = {
  DEFAULT_INBOUND_ID: 1,
  LOGIN_RETRY_ATTEMPTS: 3,
  LOGIN_RETRY_DELAY_MS: 1000,
  REQUEST_TIMEOUT: 15000, // 15 seconds
} as const;

/**
 * VLESS Reality Configuration
 */
export const REALITY_CONFIG = {
  DEFAULT_SNI: 'www.microsoft.com',
  FLOW: 'xtls-rprx-vision' as const,
  FINGERPRINT: 'chrome' as const,
  SPIDER_X: '/',
} as const;

// ============================================
// 🌐 XRAY CONFIGURATION
// ============================================

/**
 * Xray Inbound Ports
 * These must match the client configuration
 */
export const XRAY_PORTS = {
  SOCKS: 10808,
  HTTP: 10809,
} as const;

/**
 * Xray Outbound Tags
 */
export const XRAY_TAGS = {
  PROXY: 'PROXY',
  DIRECT: 'DIRECT',
  BLOCK: 'BLOCK',
} as const;

/**
 * DNS Servers
 */
export const DNS_SERVERS = {
  CLOUDFLARE: '1.1.1.1',
  ALIBABA: '223.5.5.5',
  GOOGLE: '8.8.8.8',
} as const;

// ============================================
// 📊 MONITORING CONSTANTS
// ============================================

/**
 * Health Check Configuration
 */
export const HEALTH_CHECK = {
  TIMEOUT: 5000, // 5 seconds
  CACHE_TTL: 60000, // 1 minute
} as const;

/**
 * Logging Configuration
 */
export const LOGGING = {
  SERVICE_NAME: 'vpn-connect',
  MAX_LOG_LENGTH: 1000, // characters
  SENSITIVE_FIELDS: ['password', 'secret', 'token', 'key'],
} as const;

// ============================================
// 🔗 URL CONSTANTS
// ============================================

/**
 * Application URLs
 */
export const APP_URLS = {
  PRODUCTION: 'https://botinstasgram.vercel.app',
  GITHUB: 'https://github.com/slava9999-dev/Botinstasgram',
  SUPPORT_EMAIL: 'support@vpnconnect.ru', // TODO: Update with real email
} as const;

/**
 * Client Application Downloads
 */
export const CLIENT_APPS = {
  // Recommended clients
  IOS_FOXRAY: 'https://apps.apple.com/app/foxray/id6448898396',
  ANDROID_HIDDIFY: 'https://play.google.com/store/apps/details?id=app.hiddify.com',
  ANDROID_APK: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Android-universal.apk',
  WINDOWS_HIDDIFY: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Windows-Setup-x64.exe',
  MACOS_HIDDIFY: 'https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-MacOS.dmg',
  HIDDIFY_RELEASES: 'https://github.com/hiddify/hiddify-next/releases',
  // Legacy clients (for reference)
  WINDOWS_V2RAYN: 'https://github.com/2dust/v2rayN/releases',
  IOS_SHADOWROCKET: 'https://apps.apple.com/app/shadowrocket/id932747118',
} as const;

// ============================================
// 📝 VALIDATION CONSTANTS
// ============================================

/**
 * Input Validation Rules
 */
export const VALIDATION = {
  EMAIL: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 254,
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PLAN_DURATION: {
    MIN_DAYS: 1,
    MAX_DAYS: 365,
  },
  UUID: {
    REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
} as const;

// ============================================
// 🚨 ERROR CODES
// ============================================

/**
 * Standard Error Codes
 * Use these for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  
  // Validation
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_DURATION: 'INVALID_DURATION',
  INVALID_UUID: 'INVALID_UUID',
  INVALID_TELEGRAM_ID: 'INVALID_TELEGRAM_ID',
  
  // Trial
  TRIAL_EXPIRED: 'TRIAL_EXPIRED',
  TRIAL_ALREADY_USED: 'TRIAL_ALREADY_USED',
  TELEGRAM_ID_REQUIRED: 'TELEGRAM_ID_REQUIRED',
  
  // Panel
  PANEL_NOT_CONFIGURED: 'PANEL_NOT_CONFIGURED',
  PANEL_CONNECTION_FAILED: 'PANEL_CONNECTION_FAILED',
  PANEL_API_ERROR: 'PANEL_API_ERROR',
  
  // Payment
  PAYMENT_NOT_CONFIGURED: 'PAYMENT_NOT_CONFIGURED',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // User
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_CREATION_FAILED: 'USER_CREATION_FAILED',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
} as const;

// ============================================
// 📦 TYPE EXPORTS
// ============================================

/**
 * Export types for use in other files
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type XrayTag = typeof XRAY_TAGS[keyof typeof XRAY_TAGS];
export type Currency = typeof PAYMENT_CONFIG.CURRENCY;

// ============================================
// 🔒 FREEZE ALL CONSTANTS
// ============================================

/**
 * Freeze all exported constants to prevent accidental modification
 */
Object.freeze(JWT_CONFIG);
Object.freeze(RATE_LIMITS);
Object.freeze(PAYMENT_CONFIG);
Object.freeze(TRIAL_CONFIG);
Object.freeze(TELEGRAM_CONFIG);
Object.freeze(YOOKASSA_CONFIG);
Object.freeze(PANEL_CONFIG);
Object.freeze(REALITY_CONFIG);
Object.freeze(XRAY_PORTS);
Object.freeze(XRAY_TAGS);
Object.freeze(DNS_SERVERS);
Object.freeze(HEALTH_CHECK);
Object.freeze(LOGGING);
Object.freeze(APP_URLS);
Object.freeze(CLIENT_APPS);
Object.freeze(VALIDATION);
Object.freeze(ERROR_CODES);

