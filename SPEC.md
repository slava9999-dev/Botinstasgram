# 📋 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: SMART CONFIG GENERATOR v2.0

> ⚠️ **ВАЖНО: Этот файл НЕ УДАЛЯТЬ!** Это эталонная спецификация проекта.

---

## 🏗️ АРХИТЕКТУРА

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  Express API │─────▶│  3X-UI API  │
│  (v2rayN)   │◀─────│   (Backend)  │◀─────│   (Panel)   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  Redis/DB   │
                     │  (Tokens)   │
                     └─────────────┘
```

---

## 1. 3X-UI API MANAGER

### 1.1 Класс PanelManager

```typescript
class PanelManager {
  private baseURL: string;
  private cookie: string | null = null;

  // Методы:
  async login(username: string, password: string): Promise<void>;
  async addClient(
    inboundId: number,
    email: string,
    uuid: string
  ): Promise<ClientInfo>;
  async getInboundDetails(inboundId: number): Promise<InboundConfig>;
  async removeClient(inboundId: number, uuid: string): Promise<void>;
  async getClientTraffic(uuid: string): Promise<TrafficStats>;
}

interface ClientInfo {
  uuid: string;
  email: string;
  inboundId: number;
  serverAddress: string;
  port: number;
  publicKey: string;
  shortId: string;
  serverName: string; // SNI для Reality
}
```

### 1.2 Требования к реализации

- ✅ Автоматическая переавторизация при истечении cookie
- ✅ Retry логика с exponential backoff (3 попытки)
- ✅ Валидация ответов от API перед возвратом
- ✅ Логирование всех операций (без чувствительных данных)

---

## 2. CONFIG BUILDER SERVICE

### 2.1 Endpoint: GET /api/config/:token

**Headers Response:**

```
Content-Type: application/json; charset=utf-8
Content-Disposition: attachment; filename="xray_config.json"
Cache-Control: no-store, must-revalidate
```

### 2.2 JSON-КОНФИГУРАЦИЯ

```json
{
  "log": {
    "loglevel": "warning",
    "access": "",
    "error": ""
  },

  "dns": {
    "servers": [
      {
        "address": "1.1.1.1",
        "domains": [
          "geosite:instagram",
          "geosite:facebook",
          "geosite:meta",
          "geosite:whatsapp"
        ]
      },
      {
        "address": "223.5.5.5",
        "domains": ["geosite:cn"]
      },
      "8.8.8.8"
    ],
    "queryStrategy": "UseIPv4"
  },

  "inbounds": [
    {
      "tag": "socks-in",
      "port": 10808,
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true,
        "ip": "127.0.0.1"
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"],
        "routeOnly": false
      }
    },
    {
      "tag": "http-in",
      "port": 10809,
      "protocol": "http",
      "settings": {},
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"],
        "routeOnly": false
      }
    }
  ],

  "outbounds": [
    {
      "tag": "PROXY",
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "${SERVER_IP}",
            "port": 443,
            "users": [
              {
                "id": "${USER_UUID}",
                "flow": "xtls-rprx-vision",
                "encryption": "none",
                "level": 0
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "fingerprint": "chrome",
          "serverName": "${SNI_DOMAIN}",
          "publicKey": "${REALITY_PUB_KEY}",
          "shortId": "${SHORT_ID}",
          "spiderX": "/"
        },
        "tcpSettings": {
          "header": {
            "type": "none"
          }
        }
      },
      "mux": {
        "enabled": false
      }
    },
    {
      "tag": "DIRECT",
      "protocol": "freedom",
      "settings": {
        "domainStrategy": "UseIP"
      }
    },
    {
      "tag": "BLOCK",
      "protocol": "blackhole",
      "settings": {
        "response": {
          "type": "http"
        }
      }
    }
  ],

  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "ip": ["geoip:private"],
        "outboundTag": "DIRECT"
      },
      {
        "type": "field",
        "domain": [
          "geosite:instagram",
          "geosite:facebook",
          "geosite:meta",
          "geosite:whatsapp",
          "domain:cdninstagram.com",
          "domain:fbcdn.net",
          "domain:fb.com",
          "domain:facebook.net",
          "domain:whatsapp.net",
          "regexp:.*\\.instagram\\.com$",
          "regexp:.*\\.facebook\\.com$",
          "regexp:.*\\.fbcdn\\.net$"
        ],
        "outboundTag": "PROXY"
      },
      {
        "type": "field",
        "ip": [
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
        "outboundTag": "PROXY"
      },
      {
        "type": "field",
        "protocol": ["bittorrent"],
        "outboundTag": "DIRECT"
      },
      {
        "type": "field",
        "network": "udp,tcp",
        "outboundTag": "DIRECT"
      }
    ]
  }
}
```

### 2.3 КЛЮЧЕВЫЕ МОМЕНТЫ

| #   | Описание                                                                      |
| --- | ----------------------------------------------------------------------------- |
| 1   | **DNS-секция** – обязательна для корректного резолва Meta-доменов             |
| 2   | **domainStrategy: "IPIfNonMatch"** – если домен не совпал, проверяет IP       |
| 3   | **IP-диапазоны Meta** – добавлены явные подсети Facebook/Instagram            |
| 4   | **Regexp-правила** – ловят динамические поддомены                             |
| 5   | **Порядок правил:** Private IP → Meta домены → Meta IP → Всё остальное DIRECT |
| 6   | **Удалено правило port: 0-65535** – было причиной конфликта                   |

---

## 3. TOKEN MANAGEMENT SERVICE

### 3.1 Генерация токена

```typescript
interface TokenPayload {
  userId: string;
  uuid: string;
  exp: number; // Unix timestamp
  iat: number;
}

function generateConfigToken(userId: string, uuid: string): string {
  const payload: TokenPayload = {
    userId,
    uuid,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 часа
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    algorithm: "HS256",
  });
}
```

### 3.2 Валидация токена

```typescript
async function validateToken(token: string): Promise<ClientInfo | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    if (decoded.exp < Date.now()) {
      return null; // Expired
    }

    // Проверка существования пользователя в Redis/DB
    const clientInfo = await redis.get(`client:${decoded.uuid}`);
    return clientInfo ? JSON.parse(clientInfo) : null;
  } catch (error) {
    return null;
  }
}
```

---

## 4. API ENDPOINTS

### 4.1 POST /api/users/create

**Request:**

```json
{
  "email": "user@example.com",
  "planDuration": 30
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uuid": "abc-123-def",
    "configToken": "eyJhbGc...",
    "configUrl": "https://api.yourdomain.com/api/config/eyJhbGc...",
    "expiresAt": "2025-01-15T10:00:00Z"
  }
}
```

### 4.2 GET /api/config/:token

**Response:** JSON config (как выше)

**Error cases:**

```json
{
  "error": "Invalid or expired token",
  "code": "TOKEN_INVALID"
}
```

### 4.3 GET /api/users/:uuid/traffic

**Response:**

```json
{
  "upload": 1073741824,
  "download": 5368709120,
  "total": 6442450944,
  "expiryDate": "2025-01-15T10:00:00Z"
}
```

---

## 5. MIDDLEWARE & SECURITY

### 5.1 Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

const configLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // максимум 10 запросов
  message: "Too many config requests",
});

app.get("/api/config/:token", configLimiter, handleConfigRequest);
```

### 5.2 Request Validation

```typescript
import { body, param, validationResult } from "express-validator";

const createUserValidation = [
  body("email").isEmail().normalizeEmail(),
  body("planDuration").isInt({ min: 1, max: 365 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
```

---

## 6. ENVIRONMENT VARIABLES

```env
# 3X-UI Panel
PANEL_URL=https://your-vps-ip:2053
PANEL_USERNAME=admin
PANEL_PASSWORD=your-password
INBOUND_ID=1

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Redis (опционально)
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=production

# Reality Settings (получаются из 3X-UI)
REALITY_PUBLIC_KEY=your-public-key
REALITY_SHORT_ID=your-short-id
SNI_DOMAIN=www.microsoft.com
```

---

## 7. TESTING CHECKLIST

### Unit Tests

- [ ] PanelManager.login() с неверными креденшалами
- [ ] PanelManager.addClient() с дубликатом email
- [ ] Token generation и validation
- [ ] Config builder с различными параметрами

### Integration Tests

- [ ] Полный flow: создание пользователя → получение конфига
- [ ] Проверка routing rules (mock Xray)
- [ ] Обработка ошибок 3X-UI API

### Manual Tests

- [ ] Импорт конфига в v2rayN/v2rayNG
- [ ] Проверка доступа к Instagram через PROXY
- [ ] Проверка прямого доступа к Google/YouTube (DIRECT)
- [ ] Проверка с `curl --socks5 127.0.0.1:10808`

---

## 8. DEPLOYMENT

### Docker Compose

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

---

## 9. МОНИТОРИНГ

### Логируемые события

- Создание пользователя
- Генерация конфига
- Ошибки авторизации в 3X-UI
- Истечение токенов
- Rate limit violations

### Метрики (Prometheus)

- `http_requests_total{endpoint, status}`
- `config_generation_duration_seconds`
- `panel_api_errors_total`

---

## 📅 История изменений

| Дата       | Версия | Описание                  |
| ---------- | ------ | ------------------------- |
| 2025-12-16 | 2.0    | Зацементировано в SPEC.md |
