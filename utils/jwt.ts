import jwt from 'jsonwebtoken';
import { logger, LogEvent } from './logger';

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
 * 
 * Enhanced with detailed error logging for debugging 401 errors.
 */
export function validateConfigToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as TokenPayload;
    
    // Additional expiration check for better error messages
    const now = Date.now();
    const expMs = decoded.exp * 1000; // JWT exp is in seconds
    
    if (expMs < now) {
      const expiredAgo = Math.floor((now - expMs) / 1000 / 60); // minutes
      logger.warn(LogEvent.TOKEN_EXPIRED, 'Token expired', {
        expiredAt: new Date(expMs).toISOString(),
        expiredAgoMinutes: expiredAgo,
        now: new Date(now).toISOString()
      });
      return null;
    }
    
    // Validation successful
    logger.debug(LogEvent.TOKEN_VALIDATED, 'Token validated successfully', {
      uuid: decoded.uuid.substring(0, 8) + '...',
      email: decoded.email,
      expiresIn: Math.floor((expMs - now) / 1000 / 60 / 60 / 24) + ' days'
    });
    
    return decoded;
    
  } catch (error: any) {
    // Detailed error logging for different JWT error types
    const errorType = error.name || 'UnknownError';
    const errorMsg = error.message || 'No error message';
    
    logger.error(LogEvent.TOKEN_INVALID, 'Validation failed', {
      errorType,
      errorMessage: errorMsg,
      tokenPreview: token.substring(0, 20) + '...',
      secretConfigured: !!process.env.JWT_SECRET
    });
    
    // Different handling for different error types
    if (errorType === 'TokenExpiredError') {
      logger.warn(LogEvent.TOKEN_EXPIRED, 'Token has expired. User needs to request a new config.');
    } else if (errorType === 'JsonWebTokenError') {
      logger.error(LogEvent.TOKEN_INVALID, 'Invalid token signature or format. Possible causes: wrong secret, corrupted token.');
    } else if (errorType === 'NotBeforeError') {
      logger.warn(LogEvent.TOKEN_INVALID, 'Token used before its validity period.');
    }
    
    return null;
  }
}
