import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PanelManager } from '../../../utils/panel';
import { validateConfigToken } from '../../../utils/jwt';

/**
 * GET /api/users/:uuid/traffic
 * Get traffic statistics for a user
 * 
 * Response:
 * {
 *   "upload": 1073741824,
 *   "download": 5368709120,
 *   "total": 6442450944,
 *   "expiryDate": "2025-01-15T10:00:00Z"
 * }
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

  try {
    const { uuid } = req.query;

    if (!uuid || typeof uuid !== 'string') {
      return res.status(400).json({ 
        error: 'UUID is required', 
        code: 'INVALID_UUID' 
      });
    }

    // Get inbound ID from env
    const INBOUND_ID = parseInt(process.env.INBOUND_ID || '1', 10);

    // Get traffic stats from panel
    const panel = new PanelManager();
    const stats = await panel.getClientTraffic(uuid, INBOUND_ID);

    if (!stats) {
      return res.status(404).json({ 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      });
    }

    // Format response according to spec
    return res.status(200).json({
      upload: stats.up,
      download: stats.down,
      total: stats.total,
      expiryDate: new Date(stats.expiryTime).toISOString()
    });

  } catch (error: any) {
    console.error('[Traffic] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    });
  }
}
