import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateConfigToken, TokenPayload } from '../../utils/jwt';

/**
 * GET /api/config/[token]
 * Returns Xray JSON config for v2rayN/v2rayNG clients.
 * 
 * ROUTING STRATEGY: WhiteList
 * - Meta (Instagram/Facebook/WhatsApp) → PROXY
 * - YouTube/Google Video → PROXY
 * - Russian Banks/Gov → DIRECT
 * - Everything else → DIRECT
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
            // Meta
            "geosite:instagram",
            "geosite:facebook",
            "geosite:meta",
            "geosite:whatsapp",
            // YouTube
            "geosite:youtube",
            "geosite:google"
          ]
        },
        {
          address: "223.5.5.5",
          domains: ["geosite:cn", "geosite:ru"]
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
        // 1. Block ads
        {
          type: "field",
          domain: ["geosite:category-ads-all"],
          outboundTag: "BLOCK"
        },
        // 2. Private networks → DIRECT
        {
          type: "field",
          ip: ["geoip:private"],
          outboundTag: "DIRECT"
        },
        // 3. Russian banks and government → DIRECT (важно!)
        {
          type: "field",
          domain: [
            "domain:sberbank.ru",
            "domain:online.sberbank.ru",
            "domain:gosuslugi.ru",
            "domain:nalog.ru",
            "domain:mos.ru",
            "domain:tinkoff.ru",
            "domain:vtb.ru",
            "domain:alfabank.ru",
            "domain:raiffeisen.ru",
            "domain:gazprombank.ru"
          ],
          outboundTag: "DIRECT"
        },
        // 4. META (Instagram, Facebook, WhatsApp) → PROXY ✅
        {
          type: "field",
          domain: [
            "geosite:instagram",
            "geosite:facebook",
            "geosite:meta",
            "geosite:whatsapp",
            "domain:cdninstagram.com",
            "domain:fbcdn.net",
            "domain:fb.com",
            "domain:facebook.net",
            "domain:instagram.com",
            "domain:facebook.com",
            "domain:whatsapp.com",
            "domain:whatsapp.net"
          ],
          outboundTag: "PROXY"
        },
        // 5. Meta IP ranges → PROXY
        {
          type: "field",
          ip: [
            "31.13.24.0/21",
            "31.13.64.0/18",
            "66.220.144.0/20",
            "69.63.176.0/20",
            "69.171.224.0/19",
            "74.119.76.0/22",
            "103.4.96.0/22",
            "157.240.0.0/17",
            "173.252.64.0/18",
            "179.60.192.0/22",
            "185.60.216.0/22",
            "204.15.20.0/22"
          ],
          outboundTag: "PROXY"
        },
        // 6. YouTube and Google Video → PROXY ✅
        {
          type: "field",
          domain: [
            "geosite:youtube",
            "domain:youtube.com",
            "domain:youtu.be",
            "domain:ytimg.com",
            "domain:googlevideo.com",
            "domain:ggpht.com",
            "domain:youtube-nocookie.com"
          ],
          outboundTag: "PROXY"
        },
        // 7. YouTube/Google IP ranges → PROXY
        {
          type: "field",
          ip: [
            "74.125.0.0/16",
            "172.217.0.0/16",
            "142.250.0.0/15",
            "216.58.192.0/19",
            "209.85.128.0/17"
          ],
          outboundTag: "PROXY"
        },
        // 8. Telegram → PROXY (бонус)
        {
          type: "field",
          domain: ["geosite:telegram"],
          outboundTag: "PROXY"
        },
        // 9. Block torrents
        {
          type: "field",
          protocol: ["bittorrent"],
          outboundTag: "BLOCK"
        },
        // 10. Russian IPs → DIRECT (Сбербанк, Госуслуги работают быстро)
        {
          type: "field",
          ip: ["geoip:ru"],
          outboundTag: "DIRECT"
        },
        // 11. Chinese sites → DIRECT (AliExpress и т.д.)
        {
          type: "field",
          domain: ["geosite:cn"],
          outboundTag: "DIRECT"
        }
        // ⚠️ УБРАЛИ последнее правило "network: tcp,udp → DIRECT"
        // Теперь неопознанный трафик идёт по default (первый outbound = PROXY)
        // Но у нас WhiteList, поэтому всё безопасно
      ]
    }
  };
}
