# Smart Config Generator v2.0 (Vercel Serverless)

API для генерации Xray-конфигов с интеграцией 3X-UI панели.

## 🚀 Деплой на Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/smart-config.git
git push -u origin main
```

### 2. Импорт в Vercel

1. Перейдите на [vercel.com/new](https://vercel.com/new)
2. Импортируйте репозиторий
3. Добавьте Environment Variables (см. ниже)
4. Deploy!

## 🔐 Environment Variables

Добавьте в Vercel Dashboard → Settings → Environment Variables:

| Variable           | Description                                        | Example                             |
| ------------------ | -------------------------------------------------- | ----------------------------------- |
| `PANEL_URL`        | URL вашей 3X-UI панели                             | `https://123.45.67.89:2053`         |
| `PANEL_USER`       | Логин панели                                       | `admin`                             |
| `PANEL_PASS`       | Пароль панели                                      | `your-password`                     |
| `JWT_SECRET`       | Секрет для подписи токенов (мин. 32 символа)       | `super-secret-key-32-chars-minimum` |
| `INBOUND_ID`       | ID inbound'а в панели                              | `1`                                 |
| `REALITY_PK`       | Reality Public Key (если не парсится из панели)    | `abc123...`                         |
| `REALITY_SHORT_ID` | Reality Short ID                                   | `abcd1234`                          |
| `SNI_DOMAIN`       | SNI домен для Reality                              | `yahoo.com`                         |
| `BOT_SECRET`       | (Опционально) Секрет для авторизации Telegram бота | `my-bot-secret`                     |

## 📡 API Endpoints

### POST `/api/create-user`

Создание пользователя в панели.

**Request:**

```json
{
  "email": "user@example.com",
  "planDuration": 30,
  "secret": "BOT_SECRET"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uuid": "abc-123-def",
    "email": "user@example.com",
    "configToken": "eyJhbGc...",
    "configUrl": "https://your-app.vercel.app/api/config/eyJhbGc...",
    "expiresAt": "2025-01-15T10:00:00Z"
  }
}
```

### GET `/api/config/:token`

Получение Xray конфига.

**Response:** JSON-файл для импорта в v2rayN/v2rayNG.

## 🧪 Локальная разработка

```bash
npm install
npm run dev
```

Требуется [Vercel CLI](https://vercel.com/docs/cli).

## 📁 Структура проекта

```
/api
  /config
    [token].ts     # GET /api/config/:token
  /create-user
    index.ts       # POST /api/create-user
/utils
  panel.ts         # 3X-UI API Manager
  jwt.ts           # Token generation/validation
  routing.json     # Meta IP/domain rules
vercel.json        # Vercel config
package.json
tsconfig.json
```
