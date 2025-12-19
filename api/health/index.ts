import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PanelManager } from '../../utils/panel';
import { validateEnvironment, logEnvironmentStatus } from '../../utils/env-validator';
import { checkKVHealth } from '../../utils/storage';
import { logger, LogEvent } from '../../utils/logger';


/**
 * GET /api/health
 * Health check endpoint for monitoring
 * 
 * Checks:
 * - Environment variables
 * - 3X-UI panel connectivity
 * - JWT secret presence
 * - YooKassa credentials
 * - Storage (Vercel KV / in-memory)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Note: CORS headers are set globally in vercel.json
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as Record<string, { status: string; message?: string }>
  };

  // Check JWT_SECRET
  checks.services.jwt = process.env.JWT_SECRET 
    ? { status: 'ok' }
    : { status: 'error', message: 'JWT_SECRET not configured' };

  // Check YooKassa credentials
  const hasYooKassa = process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY;
  checks.services.yookassa = hasYooKassa
    ? { status: 'ok' }
    : { status: 'warning', message: 'YooKassa credentials not configured' };

  // Check 3X-UI panel configuration
  const hasPanelConfig = process.env.PANEL_URL && 
                         process.env.PANEL_USER && 
                         process.env.PANEL_PASS &&
                         process.env.INBOUND_ID;
  
  if (!hasPanelConfig) {
    checks.services.panel = { 
      status: 'error', 
      message: 'Panel credentials not configured' 
    };
  } else {
    // Try to connect to panel
    try {
      logger.info(LogEvent.HEALTH_CHECK, 'Testing panel connection...');
      const panel = new PanelManager();
      await panel.login();
      checks.services.panel = { status: 'ok' };
      logger.info(LogEvent.HEALTH_PANEL_OK, 'Panel connection successful');
    } catch (error: any) {
      logger.error(LogEvent.HEALTH_PANEL_FAILED, 'Panel connection failed', { error: error.message });
      checks.services.panel = { 
        status: 'error', 
        message: `Panel connection failed: ${error.message}` 
      };
    }
  }

  // Log full environment status for debugging
  logEnvironmentStatus();

  // Check Reality settings
  const hasReality = process.env.REALITY_PK && 
                     process.env.REALITY_SHORT_ID && 
                     process.env.SNI_DOMAIN;
  checks.services.reality = hasReality
    ? { status: 'ok' }
    : { status: 'warning', message: 'Reality settings not fully configured' };

  // Check KV Storage
  try {
    const kvHealth = await checkKVHealth();
    checks.services.storage = {
      status: kvHealth.available ? 'ok' : 'warning',
      message: `Using ${kvHealth.type}${kvHealth.latencyMs ? ` (${kvHealth.latencyMs}ms)` : ''}`
    };
  } catch (error: any) {
    checks.services.storage = {
      status: 'warning',
      message: `Storage check failed: ${error.message}`
    };
  }

  // Determine overall status
  const hasErrors = Object.values(checks.services).some(s => s.status === 'error');
  const hasWarnings = Object.values(checks.services).some(s => s.status === 'warning');
  
  if (hasErrors) {
    checks.status = 'unhealthy';
  } else if (hasWarnings) {
    checks.status = 'degraded';
  }

  // Return appropriate status code
  const statusCode = checks.status === 'healthy' ? 200 : 
                     checks.status === 'degraded' ? 200 : 503;

  return res.status(statusCode).json(checks);
}
