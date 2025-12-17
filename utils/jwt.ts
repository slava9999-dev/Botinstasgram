import jwt from 'jsonwebtoken';

export interface TokenPayload {
  uuid: string;
  email: string;
  inboundId: number;
  serverAddress: string;
  port: number;
  publicKey: string;
  shortId: string;
  serverName: string;
  iat: number;
  exp: number;
}

/**
 * Get JWT_SECRET from environment with validation.
 * Throws error if not configured - this is intentional for security.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in Vercel or .env file.');
  }
  return secret;
}

/**
 * Generate a config token embedding all client info.
 * No Redis needed - the JWT itself is the source of truth.
 */
export function generateConfigToken(clientInfo: {
  uuid: string;
  email: string;
  inboundId: number;
  serverAddress: string;
  port: number;
  publicKey: string;
  shortId: string;
  serverName: string;
}, expiresInDays: number = 365): string {
  
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    uuid: clientInfo.uuid,
    email: clientInfo.email,
    inboundId: clientInfo.inboundId,
    serverAddress: clientInfo.serverAddress,
    port: clientInfo.port,
    publicKey: clientInfo.publicKey,
    shortId: clientInfo.shortId,
    serverName: clientInfo.serverName
  };

  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: `${expiresInDays}d`
  });
}

/**
 * Validate and decode a config token.
 * Returns null if invalid or expired.
 */
export function validateConfigToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    console.error('JWT Verification Failed:', error);
    // Для отладки можно временно раскомментировать:
    // console.log('Token:', token);
    // console.log('Secret (first 3 chars):', getJwtSecret().substring(0, 3));
    return null;
  }
}
