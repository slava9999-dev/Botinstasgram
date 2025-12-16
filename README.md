# 🚀 VPN Connect — Smart Config Generator v2.0

**Полнофункциональный VPN-сервис с автоматической генерацией VLESS Reality конфигов и интеграцией платежей ЮKassa.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/slava9999-dev/Botinstasgram)

---

## ✨ Возможности

- 🔐 **Автоматическое создание пользователей** в 3X-UI панели
- 💳 **Интеграция с ЮKassa** — приём платежей с автоматической активацией
- 📱 **Адаптивный UI** — работает на всех устройствах
- 🎯 **Простой onboarding** — пользователь получает VPN за 3 клика
- 🔒 **VLESS Reality** — современный протокол с защитой от блокировок
- ⚡ **Serverless** — деплой на Vercel без серверов
- 🎨 **Красивый дизайн** — премиум UI/UX

---

## 🏗️ Архитектура

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  Vercel API  │─────▶│  3X-UI API  │
│  (Browser)  │◀─────│  (Serverless)│◀─────│   (Panel)   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  ЮKassa API │
                     │  (Payments) │
                     └─────────────┘
```

---

## 📡 API Endpoints

### 1. **POST `/api/payment/create`**

Создание платежа в ЮKassa.

**Request:**

```json
{
  "amount": 99,
  "description": "VPN подписка на 30 дней",
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "paymentId": "2d8f5c8a-000f-5000-8000-1234567890ab",
    "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
    "status": "pending"
  }
}
```

---

### 2. **POST `/api/payment/webhook`**

Webhook для обработки уведомлений от ЮKassa (вызывается автоматически).

**Flow:**

1. ЮKassa отправляет уведомление о успешной оплате
2. Создаётся пользователь в 3X-UI
3. Генерируется JWT токен с конфигом
4. Данные сохраняются для `/api/payment/status`

---

### 3. **GET `/api/payment/status?payment_id=xxx`**

Проверка статуса платежа (используется на `success.html`).

**Response:**

```json
{
  "success": true,
  "confirmed": true,
  "data": {
    "configUrl": "https://botinstasgram.vercel.app/api/config/eyJhbGc...",
    "email": "user@example.com",
    "expiresAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### 4. **POST `/api/create-user`**

Создание пользователя напрямую (для тестов или Telegram бота).

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
    "configToken": "eyJhbGc...",
    "configUrl": "https://botinstasgram.vercel.app/api/config/eyJhbGc...",
    "expiresAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### 5. **GET `/api/config/:token`**

Получение Xray JSON конфига для импорта в v2rayN/v2rayNG.

**Response:** JSON файл с полной конфигурацией.

---

### 6. **GET `/api/link/:token`**

Получение VLESS URI для быстрого импорта.

**Response:**

```json
{
  "success": true,
  "vlessUri": "vless://uuid@server:port?type=tcp&security=reality...",
  "serverName": "VPN-Connect",
  "expiresAt": "2025-01-15T10:00:00Z"
}
```

---

## 🚀 Деплой на Vercel

### Шаг 1: Клонировать репозиторий

```bash
git clone https://github.com/slava9999-dev/Botinstasgram.git
cd Botinstasgram
```

### Шаг 2: Установить зависимости

```bash
npm install
```

### Шаг 3: Настроить переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

**Обязательные переменные:**

| Variable              | Описание                         | Где взять                                                            |
| --------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `JWT_SECRET`          | Секрет для JWT (мин. 32 символа) | `openssl rand -base64 32`                                            |
| `YOOKASSA_SHOP_ID`    | ID магазина ЮKassa               | [yookassa.ru/my/shop-settings](https://yookassa.ru/my/shop-settings) |
| `YOOKASSA_SECRET_KEY` | Секретный ключ ЮKassa            | Там же                                                               |
| `PANEL_URL`           | URL 3X-UI панели                 | `https://YOUR_VPS_IP:2053`                                           |
| `PANEL_USER`          | Логин панели                     | Из установки 3X-UI                                                   |
| `PANEL_PASS`          | Пароль панели                    | Из установки 3X-UI                                                   |
| `INBOUND_ID`          | ID inbound'а                     | Обычно `1`                                                           |
| `REALITY_PK`          | Reality Public Key               | Из настроек inbound                                                  |
| `REALITY_SHORT_ID`    | Reality Short ID                 | Из настроек inbound                                                  |
| `SNI_DOMAIN`          | SNI домен                        | `yahoo.com`                                                          |

### Шаг 4: Деплой

```bash
# Через Vercel CLI
vercel --prod

# Или через GitHub
git push origin main
# Затем импортируйте на vercel.com
```

### Шаг 5: Добавить переменные в Vercel

1. Перейдите в **Vercel Dashboard** → Ваш проект → **Settings** → **Environment Variables**
2. Добавьте **ВСЕ** переменные из `.env`
3. Выберите **Production**, **Preview**, **Development**
4. Сохраните и сделайте **Redeploy**

---

## 🛠️ Локальная разработка

```bash
# Установить Vercel CLI
npm i -g vercel

# Запустить dev сервер
npm run dev

# Откроется на http://localhost:3000
```

---

## 📱 Приложения для пользователей

| Платформа   | Приложение   | Ссылка                                                                     |
| ----------- | ------------ | -------------------------------------------------------------------------- |
| **Windows** | v2rayN       | [GitHub](https://github.com/2dust/v2rayN/releases)                         |
| **Android** | v2rayNG      | [Google Play](https://play.google.com/store/apps/details?id=com.v2ray.ang) |
| **iOS**     | Shadowrocket | [App Store](https://apps.apple.com/app/shadowrocket/id932747118) (платное) |
| **macOS**   | V2rayU       | [GitHub](https://github.com/yanue/V2rayU/releases)                         |

---

## 🔧 Настройка 3X-UI на VPS

### 1. Купить VPS

Рекомендуемые провайдеры:

- [Aeza](https://aeza.net) — от 200₽/мес
- [Timeweb Cloud](https://timeweb.cloud) — от 249₽/мес
- [VDSina](https://vdsina.ru) — от 200₽/мес

**Требования:**

- 1 CPU, 1 GB RAM, 10 GB SSD
- Ubuntu 22.04 LTS
- Локация: Нидерланды / Германия

### 2. Установить 3X-UI

```bash
ssh root@YOUR_VPS_IP

# Установка
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

### 3. Создать VLESS Reality Inbound

1. Зайти в панель: `https://YOUR_VPS_IP:2053`
2. **Inbounds** → **Add Inbound**
3. Настройки:
   - Protocol: **VLESS**
   - Network: **TCP**
   - Security: **Reality**
   - uTLS: **Chrome**
   - Dest: `yahoo.com:443`
   - SNI: `yahoo.com`
4. Нажать **Generate** для Reality Keys
5. **Сохранить** Public Key и Short ID

---

## 🧪 Тестирование

### Тестовый платёж

1. Используйте тестовые ключи ЮKassa (`test_...`)
2. Тестовая карта: `5555 5555 5555 4477`, срок `12/24`, CVC `123`
3. Проверьте, что webhook вызывается (логи в Vercel)

### Проверка конфига

```bash
# Скачать конфиг
curl https://botinstasgram.vercel.app/api/config/YOUR_TOKEN > config.json

# Проверить структуру
cat config.json | jq .
```

---

## 📊 Мониторинг

### Vercel Logs

```bash
vercel logs --follow
```

### Проверка webhook'ов

1. Vercel Dashboard → Functions → `api/payment/webhook.ts`
2. Смотрите логи вызовов

---

## 🔒 Безопасность

- ✅ JWT токены с expiration
- ✅ CORS настроен
- ✅ Валидация всех входных данных
- ✅ Безопасное хранение секретов в Vercel Environment Variables
- ⚠️ **TODO**: Rate limiting (планируется)

---

## 📄 Лицензия

MIT License

---

## 🤝 Поддержка

- **GitHub Issues**: [Создать issue](https://github.com/slava9999-dev/Botinstasgram/issues)
- **Email**: support@vpnconnect.ru (замените на свой)

---

## 📝 Changelog

### v2.0.0 (2025-12-16)

- ✅ Интеграция с ЮKassa
- ✅ Автоматическое создание пользователей
- ✅ VLESS Reality поддержка
- ✅ Адаптивный UI
- ✅ Webhook обработка

### v1.0.0 (2025-12-15)

- 🎉 Первый релиз

---

**Made with ❤️ by NeuroExpert Team**
