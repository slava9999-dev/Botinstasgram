import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateConfigToken, TokenPayload } from '../../utils/jwt';

/**
 * GET /api/sub/[token]
 * 
 * Returns subscription URL format (Base64 encoded VLESS URI).
 * This is what Hiddify, Streisand, FoXray, v2rayN understand!
 * 
 * User workflow:
 * 1. App opens subscription URL
 * 2. App downloads this response
 * 3. App decodes Base64 → gets vless:// link
 * 4. App auto-imports the server
 * 5. User just clicks "Connect"!
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
    return res.status(400).send('Invalid token');
  }

  const payload = validateConfigToken(token);
  
  if (!payload) {
    console.error('Token validation failed for token:', token.substring(0, 10) + '...');
    return res.status(401).send('Token invalid. Check server logs. Make sure JWT_SECRET matches.');
  }

  // Build VLESS URI
  const vlessUri = buildVlessUri(payload);
  
  // Encode to Base64 (subscription format)
  const subscription = Buffer.from(vlessUri).toString('base64');
  
  // Headers for subscription
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="vpn_subscription.txt"');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  
  // Optional: Subscription-Userinfo header (shows traffic/expiry in apps)
  const expiryTimestamp = payload.exp;
  res.setHeader('Subscription-Userinfo', `upload=0; download=0; total=10737418240; expire=${expiryTimestamp}`);
  
  // Profile update interval (1 hour)
  res.setHeader('Profile-Update-Interval', '1');
  
  return res.status(200).send(subscription);
}

function buildVlessUri(client: TokenPayload): string {
  // VLESS URI format:
  // vless://uuid@server:port?params#name
  
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

  const serverName = encodeURIComponent('VPN-Instagram-YouTube');
  
  return `vless://${client.uuid}@${client.serverAddress}:${client.port}?${params.toString()}#${serverName}`;
}
