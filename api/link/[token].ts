import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateConfigToken, TokenPayload } from '../../utils/jwt';

/**
 * GET /api/link/[token]
 * Returns VLESS URI link for easy import into v2rayN/v2rayNG.
 * Much simpler than JSON config!
 * 
 * User just clicks the link or scans QR code.
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

  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required', code: 'TOKEN_MISSING' });
  }

  const payload = validateConfigToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
  }

  // Build VLESS URI
  const vlessUri = buildVlessUri(payload);

  // Return as JSON with the link
  return res.status(200).json({
    success: true,
    vlessUri: vlessUri,
    serverName: 'VPN-Connect',
    expiresAt: new Date(payload.exp * 1000).toISOString()
  });
}

function buildVlessUri(client: TokenPayload): string {
  // VLESS URI format:
  // vless://uuid@server:port?type=tcp&security=reality&pbk=publicKey&fp=chrome&sni=serverName&sid=shortId&flow=xtls-rprx-vision#name
  
  const params = new URLSearchParams({
    type: 'tcp',
    security: 'reality',
    pbk: client.publicKey,
    fp: 'chrome',
    sni: client.serverName,
    sid: client.shortId,
    flow: 'xtls-rprx-vision',
    spx: '/'
  });

  const serverName = encodeURIComponent('VPN-Connect');
  
  return `vless://${client.uuid}@${client.serverAddress}:${client.port}?${params.toString()}#${serverName}`;
}
