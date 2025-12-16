# 🏗️ АРХИТЕКТУРА ПРОЕКТА VPN CONNECT

**Версия:** 2.1.0  
**Дата:** 16 декабря 2025  
**Статус:** Production Ready (85%)

---

## 📐 ОБЩАЯ АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   API Layer  │  │   Utilities  │      │
│  │              │  │              │  │              │      │
│  │ - index.html │  │ - payment/*  │  │ - panel.ts   │      │
│  │ - test.html  │  │ - config/*   │  │ - jwt.ts     │      │
│  │ - success.   │  │ - users/*    │  │ - logger.ts  │      │
│  │   html       │  │ - health     │  │ - rate-limit │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  ЮKassa API  │ │  3X-UI Panel │ │   Client     │
    │              │ │              │ │  (v2rayN/NG) │
    │ - Payments   │ │ - Users      │ │              │
    │ - Webhooks   │ │ - Configs    │ │ - Connects   │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🗂️ СТРУКТУРА ФАЙЛОВ

### **Корневая структура:**

```
BotiNstsgram/
├── api/                      # Serverless API endpoints
│   ├── config/
│   │   └── [token].ts       # GET /api/config/:token
│   ├── create-user/
│   │   └── index.ts         # POST /api/create-user
│   ├── health/
│   │   └── index.ts         # GET /api/health
│   ├── link/
│   │   └── [token].ts       # GET /api/link/:token
│   ├── payment/
│   │   ├── create.ts        # POST /api/payment/create
│   │   ├── status.ts        # GET /api/payment/status
│   │   └── webhook.ts       # POST /api/payment/webhook
│   └── users/
│       └── [uuid]/
│           └── traffic.ts   # GET /api/users/:uuid/traffic
│
├── public/                   # Static frontend files
│   ├── index.html           # Landing page
│   ├── test.html            # Free test page
│   ├── success.html         # Payment success page
│   ├── offer.html           # Terms of service
│   ├── privacy.html         # Privacy policy
│   └── *.png                # Images
│
├── utils/                    # Shared utilities
│   ├── jwt.ts               # JWT token management
│   ├── logger.ts            # Structured logging
│   ├── panel.ts             # 3X-UI API client
│   ├── payment-helpers.ts   # Payment utilities
│   ├── rate-limit.ts        # Rate limiting
│   └── routing.json         # Xray routing rules
│
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies (LOCKED VERSIONS)
├── tsconfig.json            # TypeScript configuration
├── vercel.json              # Vercel deployment config
├── README.md                # Main documentation
├── TODO.md                  # Project status
├── SPEC.md                  # Technical specification
└── ARCHITECTURE.md          # This file
```

---

## 🔄 ПОТОК ДАННЫХ

### **1. Платёжный поток:**

```
User → index.html → POST /api/payment/create → ЮKassa
                                                    │
                                                    ▼
User ← success.html ← POST /api/payment/webhook ← ЮKassa
         │
         ▼
    GET /api/payment/status (polling)
         │
         ▼
    GET /api/config/:token (download config)
```

### **2. Бесплатный тест:**

```
User → test.html → POST /api/create-user → 3X-UI Panel
                                               │
                                               ▼
User ← QR Code ← GET /api/link/:token ← JWT Token
```

### **3. Проверка трафика:**

```
User → GET /api/users/:uuid/traffic → 3X-UI Panel → Traffic Stats
```

---

## 🔐 БЕЗОПАСНОСТЬ

### **Уровни защиты:**

1. **Rate Limiting** (in-memory)

   - Payment create: 5 req/min
   - User create: 10 req/min
   - Config fetch: 30 req/min
   - Status check: 60 req/min

2. **JWT Tokens** (stateless)

   - HS256 algorithm
   - Expiration: 365 days
   - Embedded client info (no DB needed)

3. **CORS** (configured)

   - Allow-Origin: \*
   - Allow-Methods: GET, POST, OPTIONS
   - Allow-Headers: Content-Type, Authorization

4. **Input Validation**

   - Email format check
   - Plan duration: 1-365 days
   - Amount: 1-100000 rubles
   - UUID format validation

5. **Environment Variables**
   - Validation on startup
   - Fail-fast if missing critical vars

---

## 📊 МОНИТОРИНГ

### **Логируемые события:**

```typescript
// User events
-user_created -
  user_creation_failed -
  // Config events
  config_generated -
  config_generation_failed -
  // Panel events
  panel_login_success -
  panel_login_failed -
  panel_api_error -
  // Token events
  token_generated -
  token_expired -
  token_invalid -
  // Payment events
  payment_created -
  payment_succeeded -
  payment_failed -
  webhook_received -
  webhook_ignored -
  // Security events
  rate_limit_exceeded -
  // Traffic events
  traffic_checked;
```

### **Health Check:**

```bash
GET /api/health

Response:
{
  "timestamp": "2025-12-16T11:00:00.000Z",
  "status": "healthy" | "degraded" | "unhealthy",
  "services": {
    "jwt": { "status": "ok" },
    "yookassa": { "status": "ok" },
    "panel": { "status": "ok" },
    "reality": { "status": "ok" }
  }
}
```

---

## 🔧 ТЕХНОЛОГИЧЕСКИЙ СТЕК

| Компонент       | Технология        | Версия | Причина выбора               |
| --------------- | ----------------- | ------ | ---------------------------- |
| **Runtime**     | Node.js           | 18+    | Vercel requirement           |
| **Framework**   | Vercel Serverless | -      | Zero config, auto-scaling    |
| **Language**    | TypeScript        | 5.3.3  | Type safety                  |
| **HTTP Client** | Axios             | 1.6.7  | Reliable, well-tested        |
| **Auth**        | JWT               | 9.0.2  | Stateless, scalable          |
| **Payment**     | ЮKassa API        | v3     | Russian market leader        |
| **VPN Panel**   | 3X-UI             | Latest | Open source, Reality support |
| **Protocol**    | VLESS Reality     | -      | Modern, unblockable          |

---

## 🚀 DEPLOYMENT

### **Vercel Configuration:**

```json
{
  "rewrites": [
    { "source": "/api/config/:token", "destination": "/api/config/[token]" },
    { "source": "/api/link/:token", "destination": "/api/link/[token]" }
  ],
  "functions": {
    "api/payment/webhook.ts": { "maxDuration": 30 },
    "api/create-user/index.ts": { "maxDuration": 30 }
  }
}
```

### **Environment Variables (Required):**

```bash
# Critical (must have)
JWT_SECRET=xxx
PANEL_URL=https://xxx:2053
PANEL_USER=admin
PANEL_PASS=xxx
INBOUND_ID=1

# Payment (for production)
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_xxx

# Reality (from 3X-UI)
REALITY_PK=xxx
REALITY_SHORT_ID=xxx
SNI_DOMAIN=yahoo.com
```

---

## 📈 МАСШТАБИРОВАНИЕ

### **Текущие ограничения:**

1. **In-memory storage:**

   - Rate limiting: сбрасывается при cold start
   - Payment records: теряются при рестарте
   - **Решение:** Migr migrate to Vercel KV

2. **Single region:**

   - Vercel auto-deploys globally
   - But 3X-UI panel is single-server
   - **Решение:** Multi-region 3X-UI setup

3. **No database:**
   - Stateless JWT (good!)
   - But no user management
   - **Решение:** Add PostgreSQL for analytics

### **Roadmap для масштабирования:**

**Phase 1: Persistent Storage**

- [ ] Vercel KV for rate limiting
- [ ] Vercel KV for payment records
- [ ] PostgreSQL for user analytics

**Phase 2: Multi-region**

- [ ] Multiple 3X-UI servers
- [ ] Geo-routing based on user location
- [ ] Load balancing

**Phase 3: Advanced Features**

- [ ] Admin dashboard
- [ ] Real-time analytics
- [ ] Auto-renewal subscriptions
- [ ] Referral system

---

## 🔍 КРИТИЧЕСКИЕ ТОЧКИ

### **Что может сломаться:**

1. **3X-UI Panel недоступен**

   - Impact: Не создаются пользователи
   - Mitigation: Health check + retry logic
   - Monitoring: panel_api_error events

2. **JWT_SECRET изменился**

   - Impact: Все токены невалидны
   - Mitigation: НИКОГДА НЕ МЕНЯТЬ в продакшене
   - Monitoring: token_invalid events

3. **ЮKassa webhook не доходит**

   - Impact: Платежи не подтверждаются
   - Mitigation: Manual verification via status API
   - Monitoring: webhook_received events

4. **Rate limit in-memory сбросился**
   - Impact: Возможен спам
   - Mitigation: Migrate to Vercel KV
   - Monitoring: rate_limit_exceeded events

---

## 🧪 ТЕСТИРОВАНИЕ

### **Чек-лист перед продакшеном:**

- [ ] Health check возвращает 200
- [ ] Тестовый платёж проходит
- [ ] Webhook вызывается
- [ ] Config скачивается
- [ ] VPN подключается
- [ ] Instagram/YouTube работают
- [ ] Rate limiting срабатывает
- [ ] Логи пишутся корректно

### **Тестовые данные:**

```bash
# YooKassa test card
Card: 5555 5555 5555 4477
Expiry: 12/24
CVC: 123

# Test email
Email: test_user_${timestamp}@vpn.local

# Test UUID
UUID: Generated via uuidv4()
```

---

## 📝 CHANGELOG

### **v2.1.0 (2025-12-16)**

- ✅ Added rate limiting
- ✅ Added structured logging
- ✅ Added health check endpoint
- ✅ Added traffic statistics endpoint
- ✅ Improved documentation
- ✅ Fixed package versions

### **v2.0.0 (2025-12-15)**

- ✅ Initial release
- ✅ YooKassa integration
- ✅ 3X-UI integration
- ✅ VLESS Reality support
- ✅ Responsive UI

---

## 🔗 ССЫЛКИ

- **Production:** https://botinstasgram.vercel.app/
- **GitHub:** https://github.com/slava9999-dev/Botinstasgram
- **Vercel:** https://vercel.com/dashboard
- **3X-UI:** https://github.com/mhsanaei/3x-ui
- **ЮKassa:** https://yookassa.ru/developers

---

**Документ обновлён:** 16 декабря 2025  
**Автор:** NeuroExpert Architect  
**Статус:** ✅ Зацементировано
