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

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

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

  return jwt.sign(payload, JWT_SECRET, {
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
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
