/**
 * Structured logger for monitoring and debugging
 * Logs events according to Technical Specification section 9
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum LogEvent {
  // User management
  USER_CREATED = 'user_created',
  USER_CREATION_FAILED = 'user_creation_failed',
  
  // Config generation
  CONFIG_GENERATED = 'config_generated',
  CONFIG_GENERATION_FAILED = 'config_generation_failed',
  CONFIG_ERROR = 'config_error',
  
  // Panel operations
  PANEL_LOGIN_SUCCESS = 'panel_login_success',
  PANEL_LOGIN_FAILED = 'panel_login_failed',
  PANEL_API_ERROR = 'panel_api_error',
  
  // Token management
  TOKEN_GENERATED = 'token_generated',
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_INVALID = 'token_invalid',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Payment events
  PAYMENT_CREATED = 'payment_created',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  WEBHOOK_RECEIVED = 'webhook_received',
  WEBHOOK_IGNORED = 'webhook_ignored',
  
  // Traffic
  TRAFFIC_CHECKED = 'traffic_checked',
  
  // Telegram Bot events
  BOT_MESSAGE = 'bot_message',
  BOT_COMMAND = 'bot_command',
  BOT_ERROR = 'bot_error'
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private serviceName: string = 'vpn-connect';
  private environment: string = process.env.NODE_ENV || 'development';

  /**
   * Log a structured event
   */
  log(level: LogLevel, event: LogEvent, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      service: this.serviceName,
      environment: this.environment,
      ...context
    };

    // In production, this would go to a logging service (Datadog, Sentry, etc.)
    // For now, output to console in structured JSON format
    const output = JSON.stringify(logEntry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.DEBUG:
        console.debug(output);
        break;
    }
  }

  debug(event: LogEvent, message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, event, message, context);
  }

  info(event: LogEvent, message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, event, message, context);
  }

  warn(event: LogEvent, message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, event, message, context);
  }

  error(event: LogEvent, message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, event, message, context);
  }

  /**
   * Log user creation event
   */
  logUserCreated(uuid: string, email: string, duration: number): void {
    this.info(LogEvent.USER_CREATED, 'New user created', {
      uuid,
      email,
      planDuration: duration
    });
  }

  /**
   * Log config generation
   */
  logConfigGenerated(uuid: string, durationMs: number): void {
    this.info(LogEvent.CONFIG_GENERATED, 'Config generated successfully', {
      uuid,
      duration_ms: durationMs
    });
  }

  /**
   * Log panel login
   */
  logPanelLogin(success: boolean, error?: string): void {
    if (success) {
      this.info(LogEvent.PANEL_LOGIN_SUCCESS, 'Successfully logged into 3X-UI panel');
    } else {
      this.error(LogEvent.PANEL_LOGIN_FAILED, 'Failed to login to 3X-UI panel', { error });
    }
  }

  /**
   * Log panel API error
   */
  logPanelApiError(operation: string, error: string): void {
    this.error(LogEvent.PANEL_API_ERROR, `Panel API error during ${operation}`, {
      operation,
      error
    });
  }

  /**
   * Log token events
   */
  logTokenExpired(uuid: string): void {
    this.warn(LogEvent.TOKEN_EXPIRED, 'Token expired', { uuid });
  }

  logTokenInvalid(reason: string): void {
    this.warn(LogEvent.TOKEN_INVALID, 'Invalid token', { reason });
  }

  /**
   * Log rate limit violation
   */
  logRateLimitExceeded(endpoint: string, clientIp: string): void {
    this.warn(LogEvent.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', {
      endpoint,
      client_ip: clientIp
    });
  }

  /**
   * Log payment events
   */
  logPaymentCreated(paymentId: string, amount: number, email: string): void {
    this.info(LogEvent.PAYMENT_CREATED, 'Payment created', {
      payment_id: paymentId,
      amount,
      email
    });
  }

  logPaymentSucceeded(paymentId: string, email: string): void {
    this.info(LogEvent.PAYMENT_SUCCEEDED, 'Payment succeeded', {
      payment_id: paymentId,
      email
    });
  }

  logPaymentFailed(paymentId: string, reason: string): void {
    this.error(LogEvent.PAYMENT_FAILED, 'Payment failed', {
      payment_id: paymentId,
      reason
    });
  }

  logWebhookReceived(event: string, paymentId: string): void {
    this.info(LogEvent.WEBHOOK_RECEIVED, 'Webhook received from YooKassa', {
      event,
      payment_id: paymentId
    });
  }

  /**
   * Log traffic check
   */
  logTrafficChecked(uuid: string, upload: number, download: number): void {
    this.debug(LogEvent.TRAFFIC_CHECKED, 'Traffic statistics retrieved', {
      uuid,
      upload_bytes: upload,
      download_bytes: download,
      total_bytes: upload + download
    });
  }
}

// Export singleton instance
export const logger = new Logger();
