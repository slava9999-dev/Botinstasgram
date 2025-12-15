import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateConfigToken, TokenPayload } from '../../utils/jwt';
import routingData from '../../utils/routing.json';

/**
 * GET /api/config/[token]
 * Returns Xray JSON config for v2rayN/v2rayNG clients.
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

  const xrayConfig = buildXrayConfig(payload);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="xray_config.json"');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  
  return res.status(200).json(xrayConfig);
}

function buildXrayConfig(client: TokenPayload): object {
  return {
    log: {
      loglevel: "warning",
      access: "",
      error: ""
    },
    dns: {
      servers: [
        {
          address: "1.1.1.1",
          domains: [
            "geosite:instagram",
            "geosite:facebook",
            "geosite:meta",
            "geosite:whatsapp"
          ]
        },
        {
          address: "223.5.5.5",
          domains: ["geosite:cn"]
        },
        "8.8.8.8"
      ],
      queryStrategy: "UseIPv4"
    },
    inbounds: [
      {
        tag: "socks-in",
        port: 10808,
        protocol: "socks",
        settings: {
          auth: "noauth",
          udp: true,
          ip: "127.0.0.1"
        },
        sniffing: {
          enabled: true,
          destOverride: ["http", "tls", "quic"],
          routeOnly: false
        }
      },
      {
        tag: "http-in",
        port: 10809,
        protocol: "http",
        settings: {},
        sniffing: {
          enabled: true,
          destOverride: ["http", "tls", "quic"],
          routeOnly: false
        }
      }
    ],
    outbounds: [
      {
        tag: "PROXY",
        protocol: "vless",
        settings: {
          vnext: [{
            address: client.serverAddress,
            port: client.port,
            users: [{
              id: client.uuid,
              flow: "xtls-rprx-vision",
              encryption: "none",
              level: 0
            }]
          }]
        },
        streamSettings: {
          network: "tcp",
          security: "reality",
          realitySettings: {
            show: false,
            fingerprint: "chrome",
            serverName: client.serverName,
            publicKey: client.publicKey,
            shortId: client.shortId,
            spiderX: "/"
          },
          tcpSettings: {
            header: {
              type: "none"
            }
          }
        },
        mux: {
          enabled: false
        }
      },
      {
        tag: "DIRECT",
        protocol: "freedom",
        settings: {
          domainStrategy: "UseIP"
        }
      },
      {
        tag: "BLOCK",
        protocol: "blackhole",
        settings: {
          response: {
            type: "http"
          }
        }
      }
    ],
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: [
        {
          type: "field",
          ip: ["geoip:private"],
          outboundTag: "DIRECT"
        },
        {
          type: "field",
          domain: routingData.metaDomains,
          outboundTag: "PROXY"
        },
        {
          type: "field",
          ip: routingData.metaIPs,
          outboundTag: "PROXY"
        },
        {
          type: "field",
          protocol: ["bittorrent"],
          outboundTag: "DIRECT"
        },
        {
          type: "field",
          network: "udp,tcp",
          outboundTag: "DIRECT"
        }
      ]
    }
  };
}
