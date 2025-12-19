import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { logger, LogEvent } from './logger';

export interface ClientInfo {
  uuid: string;
  email: string;
  inboundId: number;
  serverAddress: string;
  port: number;
  publicKey: string;
  shortId: string;
  serverName: string;
}

export interface InboundConfig {
  id: number;
  up: number;
  down: number;
  total: number;
  remark: string;
  enable: boolean;
  expiryTime: number;
  clientStats?: any[];
  settings: string;
  streamSettings: string;
  sniffing?: string;
  port: number;
  protocol: string;
}

export interface TrafficStats {
  email: string;
  uuid: string;
  up: number;
  down: number;
  total: number;
  expiryTime: number;
}

/**
 * Stateless PanelManager for Vercel Serverless.
 * Must be instantiated per request.
 */
export class PanelManager {
  private axiosInstance: AxiosInstance;
  private cookie: string | null = null;
  private baseURL: string; // Changed from panelUrl
  private username: string;
  private password: string;

  // Static cache for Vercel warm instances
  private static cachedCookie: string | null = null;
  private static sessionExpiry: number = 0;
  private readonly SESSION_TTL = 60 * 60 * 1000; // 1 hour

  // Compatibility getter for existing error handlers
  private get panelUrl(): string {
    return this.baseURL;
  }

  constructor() {
    this.baseURL = process.env.PANEL_URL?.replace(/\/$/, '') || ''; // Changed from panelUrl
    this.username = process.env.PANEL_USER || '';
    this.password = process.env.PANEL_PASS || '';
    
    // Reuse cached cookie if available
    if (PanelManager.cachedCookie && Date.now() < PanelManager.sessionExpiry) {
      this.cookie = PanelManager.cachedCookie;
    }
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL, // Changed from panelUrl
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Игнорируем SSL ошибки для самоподписанных сертификатов (часто на VPS)
      httpsAgent: new https.Agent({  
        rejectUnauthorized: false
      })
    });

    // Set cookie header if we have one
    if (this.cookie) {
      this.axiosInstance.defaults.headers.common['Cookie'] = this.cookie;
    }
  }

  async login(retryCount = 0): Promise<void> {
    // Skip login if we already have a valid session
    if (this.cookie && Date.now() < PanelManager.sessionExpiry) {
      logger.debug(LogEvent.PANEL_SESSION_CACHED, 'Using cached session');
      return;
    }

    try {
      logger.info(LogEvent.PANEL_LOGIN_SUCCESS, `Attempting login (attempt ${retryCount + 1}/4)`, { panelUrl: this.baseURL, attempt: retryCount + 1 });
      
      const response = await this.axiosInstance.post('/login', {
        username: this.username,
        password: this.password
      });

      if (response.data.success) {
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.cookie = cookies.join(';');
          this.axiosInstance.defaults.headers.common['Cookie'] = this.cookie;
          
          // Update static cache
          PanelManager.cachedCookie = this.cookie;
          PanelManager.sessionExpiry = Date.now() + this.SESSION_TTL;
          
          logger.info(LogEvent.PANEL_LOGIN_SUCCESS, 'Login successful, session cached');
        } else {
          logger.warn(LogEvent.PANEL_LOGIN_FAILED, 'Login response OK but no cookies received');
        }
      } else {
        const errorMsg = response.data.msg || 'Unknown error';
        logger.error(LogEvent.PANEL_LOGIN_FAILED, 'Login failed', { error: errorMsg });
        throw new Error('Login failed: ' + errorMsg);
      }
    } catch (error: any) {
      // Детальное логирование разных типов ошибок
      const errorType = error.code || error.name || 'UnknownError';
      
      logger.error(LogEvent.PANEL_CONNECTION_ERROR, 'Login error', {
        type: errorType,
        message: error.message,
        panelUrl: this.panelUrl,
        attempt: retryCount + 1,
        maxAttempts: 4
      });
      
      // Специфичные сообщения для разных ошибок
      if (errorType === 'ECONNREFUSED') {
        logger.error(LogEvent.PANEL_CONNECTION_ERROR, 'Connection refused. Check if panel is running and firewall allows connections.');
      } else if (errorType === 'ETIMEDOUT') {
        logger.error(LogEvent.PANEL_CONNECTION_ERROR, 'Connection timeout. Panel may be slow or unreachable.');
      } else if (errorType === 'ENOTFOUND') {
        logger.error(LogEvent.PANEL_CONNECTION_ERROR, 'DNS resolution failed. Check PANEL_URL in environment variables.');
      } else if (error.response?.status === 401) {
        logger.error(LogEvent.PANEL_CONNECTION_ERROR, 'Invalid credentials. Check PANEL_USER and PANEL_PASS.');
      } else if (error.response?.status === 403) {
        logger.error(LogEvent.PANEL_CONNECTION_ERROR, 'Access forbidden. Check panel permissions.');
      }
      
      // Retry logic
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        logger.info(LogEvent.PANEL_LOGIN_FAILED, `Retrying in ${delay}ms...`, { delay, retryCount: retryCount + 1 });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.login(retryCount + 1);
      }
      
      // После всех попыток - выбрасываем понятную ошибку
      const userFriendlyError = new Error(
        `Failed to connect to 3X-UI panel after 4 attempts. ` +
        `Last error: ${error.message}. ` +
        `Please check PANEL_URL, credentials, and VPS accessibility.`
      );
      logger.error(LogEvent.PANEL_LOGIN_FAILED, 'All login attempts failed', { attempts: 4 });
      throw userFriendlyError;
    }
  }

  private async ensureLoggedIn(): Promise<void> {
    if (!this.cookie) {
      await this.login();
    }
  }

  async getInboundDetails(inboundId: number): Promise<InboundConfig> {
    await this.ensureLoggedIn();
    const response = await this.axiosInstance.get(`/panel/api/inbounds/get/${inboundId}`);
    if (response.data.success) {
      return response.data.obj;
    }
    throw new Error('Failed to get inbound details');
  }

  /**
   * Проверяет существует ли клиент с данным email
   * Используется для проверки: получал ли пользователь trial
   */
  async getClientByEmail(inboundId: number, email: string): Promise<{
    uuid: string;
    email: string;
    expiryTime: number;
    enable: boolean;
    inboundId: number;
    serverAddress: string;
    port: number;
    publicKey: string;
    shortId: string;
    serverName: string;
  } | null> {
    try {
      const inbound = await this.getInboundDetails(inboundId);
      const settings = JSON.parse(inbound.settings);
      
      const client = settings.clients?.find((c: any) => c.email === email);
      
      if (!client) {
        return null;
      }

      // Parse Reality settings
      let serverName = process.env.SNI_DOMAIN || 'www.microsoft.com';
      let publicKey = process.env.REALITY_PK || '';
      let shortId = process.env.REALITY_SHORT_ID || '';
      
      try {
        const streamSettings = JSON.parse(inbound.streamSettings);
        if (streamSettings.realitySettings) {
          serverName = streamSettings.realitySettings.serverName || serverName;
          publicKey = streamSettings.realitySettings.publicKey || publicKey;
          shortId = streamSettings.realitySettings.shortId || shortId;
        }
      } catch (e) {
        logger.warn(LogEvent.PANEL_API_ERROR, 'Failed to parse stream settings', { error: String(e) });
      }

      return {
        uuid: client.id,
        email: client.email,
        expiryTime: client.expiryTime || 0,
        enable: client.enable !== false,
        inboundId,
        serverAddress: new URL(this.panelUrl).hostname,
        port: inbound.port,
        publicKey,
        shortId,
        serverName
      };
    } catch (error) {
      logger.error(LogEvent.PANEL_API_ERROR, 'Error getting client by email', { email, error: String(error) });
      return null;
    }
  }

  async addClient(inboundId: number, email: string, uuid: string, totalDays: number = 30): Promise<ClientInfo> {
    await this.ensureLoggedIn();

    const inbound = await this.getInboundDetails(inboundId);
    const settings = JSON.parse(inbound.settings);

    // Parse Reality settings
    let serverName = process.env.SNI_DOMAIN || 'www.microsoft.com';
    let publicKey = process.env.REALITY_PK || '';
    let shortId = process.env.REALITY_SHORT_ID || '';
    const port = inbound.port;

    try {
      const streamSettings = JSON.parse(inbound.streamSettings);
      if (streamSettings.realitySettings) {
        serverName = streamSettings.realitySettings.serverName || serverName;
        publicKey = streamSettings.realitySettings.publicKey || publicKey;
        shortId = streamSettings.realitySettings.shortId || shortId;
      }
    } catch (e) {
      logger.warn(LogEvent.PANEL_API_ERROR, 'Failed to parse stream settings', { error: String(e) });
    }

    // Check if client already exists
    const existingClient = settings.clients?.find((c: any) => c.email === email);
    if (existingClient) {
      return {
        uuid: existingClient.id,
        email: existingClient.email,
        inboundId,
        serverAddress: new URL(this.panelUrl).hostname,
        port,
        publicKey,
        shortId,
        serverName
      };
    }

    // ✅ PRODUCTION: Правильный расчёт времени истечения
    // 3X-UI использует Unix timestamp в миллисекундах
    const expiryTime = totalDays > 0 
      ? Date.now() + (totalDays * 24 * 60 * 60 * 1000) 
      : 0; // 0 = unlimited

    const expiryDate = expiryTime > 0 
      ? new Date(expiryTime).toISOString() 
      : 'unlimited';
    
    logger.info(LogEvent.PANEL_CLIENT_CREATED, 'Creating client', { email, uuid, expiryTime, expiryDate });

    const newClient = {
      id: uuid,
      email: email,
      flow: 'xtls-rprx-vision',
      limitIp: 0,
      totalGB: 0,
      expiryTime: expiryTime,
      enable: true,
      tgId: "",
      subId: ""
    };

    // Try addClient endpoint first (3X-UI standard)
    try {
      const addResponse = await this.axiosInstance.post('/panel/api/inbounds/addClient', {
        id: inboundId,
        settings: JSON.stringify({ clients: [newClient] })
      });
      if (!addResponse.data.success) {
        throw new Error(addResponse.data.msg);
      }
    } catch (e) {
      // Fallback: full inbound update
      settings.clients = settings.clients || [];
      settings.clients.push(newClient);
      
      const updateResponse = await this.axiosInstance.post(`/panel/api/inbounds/update/${inboundId}`, {
        up: inbound.up,
        down: inbound.down,
        total: inbound.total,
        remark: inbound.remark,
        enable: inbound.enable,
        expiryTime: inbound.expiryTime,
        listen: "",
        port: inbound.port,
        protocol: inbound.protocol,
        settings: JSON.stringify(settings),
        streamSettings: inbound.streamSettings,
        sniffing: inbound.sniffing || JSON.stringify({ enabled: true, destOverride: ["http", "tls", "quic"] })
      });

      if (!updateResponse.data.success) {
        throw new Error('Failed to update inbound: ' + updateResponse.data.msg);
      }
    }

    return {
      uuid,
      email,
      inboundId,
      serverAddress: new URL(this.panelUrl).hostname,
      port,
      publicKey,
      shortId,
      serverName
    };
  }

  async getClientTraffic(uuid: string, inboundId: number): Promise<TrafficStats | null> {
    await this.ensureLoggedIn();

    try {
      const inbound = await this.getInboundDetails(inboundId);
      const settings = JSON.parse(inbound.settings);
      const client = settings.clients?.find((c: any) => c.id === uuid);

      if (!client) return null;

      if (inbound.clientStats && Array.isArray(inbound.clientStats)) {
        const stats = inbound.clientStats.find((s: any) => s.email === client.email);
        if (stats) {
          return {
            uuid,
            email: client.email,
            up: stats.up,
            down: stats.down,
            total: stats.total,
            expiryTime: client.expiryTime
          };
        }
      }

      return {
        uuid,
        email: client.email,
        up: 0,
        down: 0,
        total: 0,
        expiryTime: client.expiryTime
      };
    } catch (e) {
      logger.error(LogEvent.TRAFFIC_ERROR, 'Error fetching traffic stats', { error: String(e) });
      return null;
    }
  }

  /**
   * Продлить подписку существующего клиента
   * Если клиент истёк - продлевает от текущего времени
   * Если клиент активен - добавляет дни к текущему expiryTime
   */
  async extendClientByEmail(inboundId: number, email: string, additionalDays: number): Promise<{
    success: boolean;
    uuid: string;
    newExpiryTime: number;
    message: string;
  } | null> {
    await this.ensureLoggedIn();

    try {
      const inbound = await this.getInboundDetails(inboundId);
      const settings = JSON.parse(inbound.settings);
      
      const clientIndex = settings.clients?.findIndex((c: any) => c.email === email);
      
      if (clientIndex === -1 || clientIndex === undefined) {
        logger.info(LogEvent.PANEL_CLIENT_EXTENDED, 'Client not found for extension', { email });
        return null;
      }

      const client = settings.clients[clientIndex];
      const now = Date.now();
      const additionalMs = additionalDays * 24 * 60 * 60 * 1000;
      
      // Если клиент истёк или expiryTime = 0 - начинаем от текущего времени
      // Если клиент активен - добавляем к текущему времени истечения
      let newExpiryTime: number;
      if (!client.expiryTime || client.expiryTime < now) {
        newExpiryTime = now + additionalMs;
        logger.info(LogEvent.PANEL_CLIENT_EXTENDED, 'Client expired, extending from now', { email });
      } else {
        newExpiryTime = client.expiryTime + additionalMs;
        logger.info(LogEvent.PANEL_CLIENT_EXTENDED, 'Client active, adding days', { email, additionalDays });
      }

      // Обновляем клиента
      settings.clients[clientIndex].expiryTime = newExpiryTime;
      settings.clients[clientIndex].enable = true; // Включаем если был выключен

      // Сохраняем изменения
      const updateResponse = await this.axiosInstance.post('/panel/api/inbounds/update/' + inboundId, {
        id: inboundId,
        remark: inbound.remark,
        enable: true,
        expiryTime: inbound.expiryTime,
        listen: "",
        port: inbound.port,
        protocol: inbound.protocol,
        settings: JSON.stringify(settings),
        streamSettings: inbound.streamSettings,
        sniffing: inbound.sniffing || JSON.stringify({ enabled: true, destOverride: ["http", "tls", "quic"] })
      });

      if (!updateResponse.data.success) {
        throw new Error('Failed to update client: ' + updateResponse.data.msg);
      }

      const expiryDate = new Date(newExpiryTime).toISOString();
      logger.info(LogEvent.PANEL_CLIENT_EXTENDED, 'Client extended successfully', { email, expiryDate, newExpiryTime });

      return {
        success: true,
        uuid: client.id,
        newExpiryTime,
        message: `Extended until ${expiryDate}`
      };

    } catch (error: any) {
      logger.error(LogEvent.PANEL_API_ERROR, 'Error extending client', { email, error: error.message });
      return null;
    }
  }
}
