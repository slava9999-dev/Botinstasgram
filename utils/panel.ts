import axios, { AxiosInstance } from 'axios';

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
  private panelUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.panelUrl = process.env.PANEL_URL || '';
    this.username = process.env.PANEL_USER || '';
    this.password = process.env.PANEL_PASS || '';

    this.axiosInstance = axios.create({
      baseURL: this.panelUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  async login(retryCount = 0): Promise<void> {
    try {
      const response = await this.axiosInstance.post('/login', {
        username: this.username,
        password: this.password
      });

      if (response.data.success) {
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.cookie = cookies.join(';');
          this.axiosInstance.defaults.headers.common['Cookie'] = this.cookie;
        }
      } else {
        throw new Error('Login failed: ' + response.data.msg);
      }
    } catch (error) {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.login(retryCount + 1);
      }
      throw error;
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
      let serverName = process.env.SNI_DOMAIN || 'yahoo.com';
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
        console.warn('Failed to parse stream settings', e);
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
      console.error('Error getting client by email:', error);
      return null;
    }
  }

  async addClient(inboundId: number, email: string, uuid: string, totalDays: number = 30): Promise<ClientInfo> {
    await this.ensureLoggedIn();

    const inbound = await this.getInboundDetails(inboundId);
    const settings = JSON.parse(inbound.settings);

    // Parse Reality settings
    let serverName = process.env.SNI_DOMAIN || 'yahoo.com';
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
      console.warn('Failed to parse stream settings', e);
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

    const expiryTime = totalDays > 0 ? Date.now() + totalDays * 24 * 60 * 60 * 1000 : 0;

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
      console.error('Error fetching traffic stats', e);
      return null;
    }
  }
}
