# 🎛️ РУКОВОДСТВО АДМИНИСТРАТОРА VPN CONNECT

**Версия:** 1.0  
**Дата:** 18 декабря 2025  
**Для:** Администратора сервиса

---

## 📊 АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  TELEGRAM BOT   │────▶│   VERCEL        │────▶│   VPS (3X-UI)   │
│  (Пользователи) │     │   (API + KV)    │     │   (VPN сервер)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

| Компонент        | URL                      | Назначение                        |
| ---------------- | ------------------------ | --------------------------------- |
| **Telegram Bot** | @your_bot                | Интерфейс пользователей           |
| **Vercel**       | botinstasgram.vercel.app | API + база данных (KV)            |
| **3X-UI Panel**  | https://YOUR_VPS_IP:PORT | VPN сервер + управление клиентами |

---

# 1️⃣ VERCEL KV (БАЗА ДАННЫХ)

## Что хранится в Vercel KV:

| Ключ           | Данные | Описание                           |
| -------------- | ------ | ---------------------------------- |
| `trial:TG_ID`  | JSON   | Информация о trial пользователе    |
| `payment:ID`   | JSON   | Данные платежа                     |
| `ratelimit:IP` | число  | Счётчик запросов для rate limiting |

## Как просмотреть данные:

### Через Vercel Dashboard:

1. Откройте https://vercel.com/dashboard
2. Выберите проект `Botinstasgram`
3. Вкладка **Storage** → **KV**
4. Вы увидите все ключи и их значения

### Через CLI:

```bash
# Установите Vercel CLI
npm i -g vercel

# Авторизуйтесь
vercel login

# Просмотр всех ключей
vercel kv keys "*"

# Получить конкретное значение
vercel kv get "trial:123456789"

# Удалить ключ
vercel kv del "trial:123456789"
```

## Полезные операции:

### Просмотр всех trial пользователей:

```bash
vercel kv keys "trial:*"
```

### Просмотр всех платежей:

```bash
vercel kv keys "payment:*"
```

### Сброс trial для пользователя (дать новый trial):

```bash
vercel kv del "trial:TELEGRAM_ID"
```

---

# 2️⃣ 3X-UI ПАНЕЛЬ (VPN СЕРВЕР)

## Доступ к панели:

| Параметр | Значение                               |
| -------- | -------------------------------------- |
| URL      | `https://YOUR_VPS_IP:YOUR_PORT/panel/` |
| Логин    | Ваш PANEL_USER                         |
| Пароль   | Ваш PANEL_PASS                         |

## Основные разделы:

### 📊 Dashboard (Главная)

- **System Status** — нагрузка CPU, RAM, диск
- **Network Traffic** — входящий/исходящий трафик
- **Active Connections** — текущие подключения

### 📋 Inbounds (Входящие подключения)

Здесь ваш VLESS Reality inbound с клиентами.

**Просмотр клиентов:**

1. Нажмите на ваш inbound
2. Раскройте список клиентов
3. Для каждого клиента видно:
   - `email` — идентификатор (tg_XXXXXX@vpn.local)
   - `expiryTime` — дата истечения
   - `enable` — активен ли
   - `up/down` — трафик

### 👥 Управление клиентами:

**Заблокировать клиента:**

1. Найдите клиента по email
2. Нажмите Edit (редактировать)
3. Снимите галочку `Enable`
4. Сохраните

**Удалить клиента:**

1. Найдите клиента
2. Нажмите Delete
3. Подтвердите

**Продлить подписку:**

1. Найдите клиента
2. Edit → измените `expiryTime`
3. Формат: Unix timestamp в миллисекундах или дата

**Посмотреть трафик клиента:**

1. Inbounds → ваш inbound
2. В таблице видно `up` (исходящий) и `down` (входящий) в байтах

---

# 3️⃣ МОНИТОРИНГ VPS СЕРВЕРА

## SSH подключение:

```bash
ssh root@YOUR_VPS_IP
```

## Основные команды мониторинга:

### Нагрузка системы:

```bash
# Общая информация
htop

# Или если htop не установлен
top

# Краткая информация
uptime
```

### Использование диска:

```bash
df -h
```

### Использование RAM:

```bash
free -h
```

### Сетевой трафик:

```bash
# Установите если нет
apt install vnstat

# Статистика за сегодня
vnstat -d

# Статистика за месяц
vnstat -m

# Живой мониторинг
vnstat -l
```

### Статус 3X-UI:

```bash
# Проверить статус
systemctl status x-ui

# Перезапустить
systemctl restart x-ui

# Логи
journalctl -u x-ui -f
```

### Статус Xray:

```bash
# Проверить статус
systemctl status xray

# Перезапустить
systemctl restart xray

# Логи
journalctl -u xray -f
```

### Активные соединения:

```bash
# Все соединения на порту VPN (замените 443 на ваш порт)
ss -tnp | grep 443

# Количество соединений
ss -tnp | grep 443 | wc -l
```

---

# 4️⃣ POWERSHELL СКРИПТЫ ДИАГНОСТИКИ

## Сохраните эти скрипты в папку `scripts/`

---

## 4.1 Проверка здоровья API

Создайте файл `scripts/check-health.ps1`:

```powershell
# check-health.ps1 - Проверка работоспособности API

$baseUrl = "https://botinstasgram.vercel.app"

Write-Host "🔍 ДИАГНОСТИКА VPN CONNECT" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка API health
Write-Host "1. Проверка API Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 10
    if ($health.StatusCode -eq 200) {
        Write-Host "   ✅ API работает (HTTP 200)" -ForegroundColor Green
        $data = $health.Content | ConvertFrom-Json
        Write-Host "   📊 Panel: $($data.panel)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ API недоступен: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Проверка лендинга
Write-Host ""
Write-Host "2. Проверка лендинга..." -ForegroundColor Yellow
try {
    $landing = Invoke-WebRequest -Uri "$baseUrl/" -Method Head -TimeoutSec 10
    if ($landing.StatusCode -eq 200) {
        Write-Host "   ✅ Лендинг работает" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Лендинг недоступен" -ForegroundColor Red
}

# 3. Проверка оферты
Write-Host ""
Write-Host "3. Проверка договора оферты..." -ForegroundColor Yellow
try {
    $offer = Invoke-WebRequest -Uri "$baseUrl/offer.html" -Method Head -TimeoutSec 10
    if ($offer.StatusCode -eq 200) {
        Write-Host "   ✅ Оферта доступна" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Оферта недоступна" -ForegroundColor Red
}

# 4. Проверка бота
Write-Host ""
Write-Host "4. Проверка Telegram Bot API..." -ForegroundColor Yellow
try {
    $botActions = Invoke-WebRequest -Uri "$baseUrl/api/bot/actions?action=offer" -Method Get -MaximumRedirection 0 -ErrorAction SilentlyContinue
} catch {
    if ($_.Exception.Response.StatusCode -eq 302) {
        Write-Host "   ✅ Bot Actions работает (редирект на оферту)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Bot Actions: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Диагностика завершена!" -ForegroundColor Cyan
```

---

## 4.2 Проверка VPS и 3X-UI

Создайте файл `scripts/check-vps.ps1`:

```powershell
# check-vps.ps1 - Проверка VPS и 3X-UI

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsIP,

    [Parameter(Mandatory=$true)]
    [int]$VpnPort = 443
)

Write-Host "🖥️ ДИАГНОСТИКА VPS" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# 1. Ping VPS
Write-Host "1. Ping VPS ($VpsIP)..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $VpsIP -Count 3 -Quiet
if ($ping) {
    Write-Host "   ✅ VPS доступен" -ForegroundColor Green
} else {
    Write-Host "   ❌ VPS не отвечает на ping" -ForegroundColor Red
}

# 2. Проверка VPN порта
Write-Host ""
Write-Host "2. Проверка порта VPN ($VpnPort)..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($VpsIP, $VpnPort)
    $tcpClient.Close()
    Write-Host "   ✅ Порт $VpnPort открыт" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Порт $VpnPort закрыт или недоступен" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Для подробной диагностики подключитесь по SSH:" -ForegroundColor Gray
Write-Host "ssh root@$VpsIP" -ForegroundColor White
```

---

## 4.3 Мониторинг Vercel логов

Создайте файл `scripts/watch-logs.ps1`:

```powershell
# watch-logs.ps1 - Просмотр логов Vercel

Write-Host "📋 Для просмотра логов Vercel в реальном времени:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Откройте: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Выберите проект Botinstasgram" -ForegroundColor White
Write-Host "3. Вкладка 'Logs'" -ForegroundColor White
Write-Host "4. Выберите 'Runtime Logs' для API логов" -ForegroundColor White
Write-Host ""
Write-Host "Или через CLI:" -ForegroundColor Yellow
Write-Host "vercel logs --follow" -ForegroundColor Green
```

---

## 4.4 Быстрая проверка всего

Создайте файл `scripts/full-check.ps1`:

```powershell
# full-check.ps1 - Полная проверка системы

param(
    [string]$VpsIP = "",
    [int]$VpnPort = 443
)

$baseUrl = "https://botinstasgram.vercel.app"

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     VPN CONNECT - ПОЛНАЯ ДИАГНОСТИКА   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Время: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

$results = @()

# 1. Vercel API
Write-Host "📡 VERCEL API" -ForegroundColor Yellow
Write-Host "─────────────" -ForegroundColor Gray

$endpoints = @(
    @{Name="Health"; Url="/api/health"},
    @{Name="Landing"; Url="/"},
    @{Name="Offer"; Url="/offer.html"},
    @{Name="Success"; Url="/success.html"}
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$($ep.Url)" -Method Head -TimeoutSec 10
        Write-Host "   ✅ $($ep.Name)" -ForegroundColor Green
        $results += [PSCustomObject]@{Component=$ep.Name; Status="OK"}
    } catch {
        Write-Host "   ❌ $($ep.Name)" -ForegroundColor Red
        $results += [PSCustomObject]@{Component=$ep.Name; Status="FAIL"}
    }
}

# 2. VPS (если указан)
if ($VpsIP) {
    Write-Host ""
    Write-Host "🖥️ VPS SERVER" -ForegroundColor Yellow
    Write-Host "─────────────" -ForegroundColor Gray

    # Ping
    $ping = Test-Connection -ComputerName $VpsIP -Count 1 -Quiet
    if ($ping) {
        Write-Host "   ✅ Ping" -ForegroundColor Green
        $results += [PSCustomObject]@{Component="VPS Ping"; Status="OK"}
    } else {
        Write-Host "   ❌ Ping" -ForegroundColor Red
        $results += [PSCustomObject]@{Component="VPS Ping"; Status="FAIL"}
    }

    # Port
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($VpsIP, $VpnPort)
        $tcpClient.Close()
        Write-Host "   ✅ Port $VpnPort" -ForegroundColor Green
        $results += [PSCustomObject]@{Component="VPN Port"; Status="OK"}
    } catch {
        Write-Host "   ❌ Port $VpnPort" -ForegroundColor Red
        $results += [PSCustomObject]@{Component="VPN Port"; Status="FAIL"}
    }
}

# Итоги
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
$okCount = ($results | Where-Object { $_.Status -eq "OK" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count

if ($failCount -eq 0) {
    Write-Host "✅ ВСЁ РАБОТАЕТ! ($okCount/$($results.Count) проверок)" -ForegroundColor Green
} else {
    Write-Host "⚠️ ЕСТЬ ПРОБЛЕМЫ: $failCount из $($results.Count) проверок failed" -ForegroundColor Red
}
Write-Host ""
```

---

# 5️⃣ БЫСТРЫЕ КОМАНДЫ

## Терминал (PowerShell):

```powershell
# Проверить API
Invoke-WebRequest -Uri "https://botinstasgram.vercel.app/api/health" | Select-Object StatusCode, Content

# Проверить оплату работает (должен редиректить на YooKassa)
Invoke-WebRequest -Uri "https://botinstasgram.vercel.app/api/bot/actions?action=pay&tg_id=123" -MaximumRedirection 0

# Проверить создание VPN (должен редиректить на /api/go/)
Invoke-WebRequest -Uri "https://botinstasgram.vercel.app/api/bot/actions?action=vpn&tg_id=123" -MaximumRedirection 0
```

## SSH команды для VPS:

```bash
# Быстрая проверка всего
systemctl status x-ui && systemctl status xray && free -h && df -h

# Количество активных VPN соединений
ss -tnp | grep :443 | wc -l

# Топ пользователей по трафику (в 3X-UI панели)

# Перезагрузка VPN сервера
systemctl restart x-ui && systemctl restart xray
```

---

# 6️⃣ ЧТО ДЕЛАТЬ ЕСЛИ...

## ❌ API не отвечает:

1. Проверьте статус Vercel: https://vercel-status.com
2. Проверьте логи: Vercel Dashboard → Logs
3. Сделайте Redeploy: Deployments → Redeploy

## ❌ VPN не подключается:

1. Проверьте VPS доступен: `ping YOUR_VPS_IP`
2. Проверьте порт открыт: `Test-NetConnection YOUR_VPS_IP -Port 443`
3. Проверьте 3X-UI работает: SSH → `systemctl status x-ui`
4. Проверьте Xray работает: SSH → `systemctl status xray`

## ❌ Оплата не работает:

1. Проверьте переменные в Vercel: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`
2. Проверьте что ключи боевые (не тестовые)
3. Проверьте webhook URL в ЮKassa: `https://botinstasgram.vercel.app/api/payment/webhook`

## ❌ Бот не отвечает:

1. Проверьте `TELEGRAM_BOT_TOKEN` в Vercel
2. Проверьте webhook: `https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo`
3. Переустановите webhook: запустите `scripts/setup-telegram-webhook.js`

---

# 7️⃣ МЕТРИКИ И KPI

## Ключевые метрики для отслеживания:

| Метрика           | Где смотреть     | Норма         |
| ----------------- | ---------------- | ------------- |
| API время ответа  | Vercel Analytics | < 500ms       |
| Rate limit errors | Vercel Logs      | < 1% запросов |
| Успешные платежи  | ЮKassa Dashboard | -             |
| Активные клиенты  | 3X-UI Panel      | -             |
| Трафик VPN        | 3X-UI / vnstat   | -             |
| CPU VPS           | htop / 3X-UI     | < 80%         |
| RAM VPS           | free -h          | < 80%         |
| Диск VPS          | df -h            | < 80%         |

---

# 8️⃣ КОНТАКТЫ И РЕСУРСЫ

| Ресурс           | URL                                |
| ---------------- | ---------------------------------- |
| Vercel Dashboard | https://vercel.com/dashboard       |
| ЮKassa Dashboard | https://yookassa.ru/my             |
| 3X-UI GitHub     | https://github.com/MHSanaei/3x-ui  |
| Telegram Bot API | https://core.telegram.org/bots/api |

---

**Удачного запуска! 🚀**
