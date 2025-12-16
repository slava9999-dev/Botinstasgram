import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PanelManager } from '../../utils/panel';

/**
 * GET /api/health
 * Health check endpoint for monitoring
 * 
 * Checks:
 * - Environment variables
 * - 3X-UI panel connectivity
 * - JWT secret presence
 * - YooKassa credentials
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
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
      const panel = new PanelManager();
      await panel.login();
      checks.services.panel = { status: 'ok' };
    } catch (error: any) {
      checks.services.panel = { 
        status: 'error', 
        message: `Panel connection failed: ${error.message}` 
      };
    }
  }

  // Check Reality settings
  const hasReality = process.env.REALITY_PK && 
                     process.env.REALITY_SHORT_ID && 
                     process.env.SNI_DOMAIN;
  checks.services.reality = hasReality
    ? { status: 'ok' }
    : { status: 'warning', message: 'Reality settings not fully configured' };

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
