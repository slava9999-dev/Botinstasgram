/**
 * Environment Variables Validator
 * 
 * Проверяет наличие всех критичных переменных окружения при старте.
 * Помогает избежать runtime ошибок из-за отсутствующей конфигурации.
 */

import { logger, LogEvent } from './logger';

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Критичные переменные окружения (обязательные для работы)
 */
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'PANEL_URL',
  'PANEL_USER',
  'PANEL_PASS',
  'INBOUND_ID',
  'REALITY_PK',
  'REALITY_SHORT_ID',
  'SNI_DOMAIN'
] as const;

/**
 * Опциональные переменные (нужны для полной функциональности)
 */
const OPTIONAL_ENV_VARS = [
  'YOOKASSA_SHOP_ID',
  'YOOKASSA_SECRET_KEY'
] as const;

/**
 * Валидирует все обязательные переменные окружения
 */
export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Проверка обязательных переменных
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      // Дополнительные проверки для конкретных переменных
      if (varName === 'JWT_SECRET' && value.length < 32) {
        warnings.push(`${varName} is too short (min 32 characters recommended)`);
      }
      
      if (varName === 'PANEL_URL' && !value.startsWith('http')) {
        warnings.push(`${varName} should start with http:// or https://`);
      }
    }
  }

  // Проверка опциональных переменных (только warnings)
  for (const varName of OPTIONAL_ENV_VARS) {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      warnings.push(`${varName} is not set (payment features will not work)`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Проверяет окружение и выбрасывает ошибку, если что-то не так
 * Использовать в критичных эндпоинтах
 */
export function requireValidEnvironment(): void {
  const result = validateEnvironment();
  
  if (!result.valid) {
    const error = `Missing required environment variables: ${result.missing.join(', ')}\n\n` +
                  `Please check your .env file or Vercel Environment Variables.\n` +
                  `See .env.example for reference.`;
    
    logger.error(LogEvent.ENV_VALIDATION_FAILED, 'Validation failed', { missing: result.missing });
    throw new Error(error);
  }
  
  if (result.warnings.length > 0) {
    logger.warn(LogEvent.ENV_WARNING, 'Configuration warnings', { warnings: result.warnings });
  }
}

/**
 * Логирует статус конфигурации (для debugging)
 */
export function logEnvironmentStatus(): void {
  const result = validateEnvironment();
  
  logger.info(LogEvent.ENV_VALIDATED, 'Configuration status', {
    valid: result.valid,
    missingCount: result.missing.length,
    warningsCount: result.warnings.length
  });
  
  if (result.missing.length > 0) {
    logger.error(LogEvent.ENV_VALIDATION_FAILED, 'Missing variables', { missing: result.missing });
  }
  
  if (result.warnings.length > 0) {
    logger.warn(LogEvent.ENV_WARNING, 'Configuration warnings', { warnings: result.warnings });
  }
  
  // Безопасный вывод установленных переменных (без значений!)
  logger.debug(LogEvent.ENV_VALIDATED, 'Configured variables', {
    JWT_SECRET: !!process.env.JWT_SECRET,
    PANEL_URL: !!process.env.PANEL_URL,
    PANEL_USER: !!process.env.PANEL_USER,
    PANEL_PASS: !!process.env.PANEL_PASS,
    YOOKASSA_SHOP_ID: !!process.env.YOOKASSA_SHOP_ID,
    YOOKASSA_SECRET_KEY: !!process.env.YOOKASSA_SECRET_KEY,
    REALITY_PK: !!process.env.REALITY_PK,
    REALITY_SHORT_ID: !!process.env.REALITY_SHORT_ID
  });
}

/**
 * Получить безопасное значение переменной с fallback
 */
export function getEnvVariable(name: string, defaultValue?: string): string {
  const value = process.env[name];
  
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  
  return value || defaultValue || '';
}
