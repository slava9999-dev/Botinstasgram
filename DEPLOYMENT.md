# ✅ PRE-DEPLOYMENT CHECKLIST

**Версия:** 2.1.0  
**Дата:** 16 декабря 2025

---

## 🔴 КРИТИЧЕСКИЕ ПРОВЕРКИ (ОБЯЗАТЕЛЬНО!)

### **1. Environment Variables**

```bash
# Проверка наличия всех переменных
□ JWT_SECRET установлен (мин. 32 символа)
□ PANEL_URL установлен (https://IP:2053)
□ PANEL_USER установлен
□ PANEL_PASS установлен
□ INBOUND_ID установлен (обычно 1)
□ REALITY_PK установлен
□ REALITY_SHORT_ID установлен
□ SNI_DOMAIN установлен (yahoo.com)

# Для продакшена с платежами
□ YOOKASSA_SHOP_ID установлен
□ YOOKASSA_SECRET_KEY установлен (live_xxx)
```

**Как проверить:**

```bash
# В Vercel Dashboard
Settings → Environment Variables → Production

# Локально
cat .env | grep -v "^#" | grep -v "^$"
```

---

### **2. 3X-UI Panel Connectivity**

```bash
# Проверка доступности панели
□ Panel доступен по HTTPS
□ Сертификат валиден (или self-signed принят)
□ Логин/пароль корректны
□ Inbound создан и активен
□ Reality настройки корректны

# Тест подключения
curl -k https://YOUR_VPS_IP:2053/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASS"}'

# Ожидаемый ответ:
# {"success":true,"msg":""}
```

---

### **3. YooKassa Configuration**

```bash
# Для тестирования
□ Тестовые ключи (test_xxx) работают
□ Webhook URL настроен: https://botinstasgram.vercel.app/api/payment/webhook
□ События настроены: payment.succeeded, payment.canceled

# Для продакшена
□ Боевые ключи (live_xxx) получены
□ Магазин верифицирован
□ ИП/Самозанятый оформлен
□ Webhook URL обновлён на продакшен
```

**Тест webhook:**

```bash
# Отправить тестовое уведомление из ЮKassa Dashboard
# Проверить логи в Vercel: Functions → webhook.ts
```

---

## 🟡 ВАЖНЫЕ ПРОВЕРКИ

### **4. API Endpoints**

```bash
# Health check
□ GET /api/health возвращает 200
□ Все сервисы показывают "ok"

# Config generation
□ POST /api/create-user создаёт пользователя
□ GET /api/config/:token возвращает JSON
□ GET /api/link/:token возвращает VLESS URI

# Payment flow
□ POST /api/payment/create создаёт платёж
□ POST /api/payment/webhook обрабатывает callback
□ GET /api/payment/status возвращает статус

# Traffic stats
□ GET /api/users/:uuid/traffic возвращает данные
```

**Автоматический тест:**

```bash
# Создать test-suite.sh
#!/bin/bash
BASE_URL="https://botinstasgram.vercel.app"

echo "Testing health..."
curl -s $BASE_URL/api/health | jq .

echo "Testing create user..."
curl -s -X POST $BASE_URL/api/create-user \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","planDuration":1}' | jq .
```

---

### **5. Frontend Pages**

```bash
□ / (index.html) загружается
□ /test.html загружается
□ /success.html загружается
□ /offer.html загружается
□ /privacy.html загружается
□ Все изображения загружаются
□ Кнопки кликабельны
□ Формы отправляются
```

---

### **6. Security**

```bash
□ Rate limiting работает (5 req/min для платежей)
□ CORS настроен корректно
□ JWT токены валидируются
□ Чувствительные данные не логируются
□ HTTPS используется везде
```

**Тест rate limiting:**

```bash
# Отправить 6 запросов подряд
for i in {1..6}; do
  curl -X POST https://botinstasgram.vercel.app/api/payment/create \
    -H "Content-Type: application/json" \
    -d '{"amount":99,"email":"test@test.com"}'
  echo ""
done

# 6-й запрос должен вернуть 429 Too Many Requests
```

---

## 🟢 ОПЦИОНАЛЬНЫЕ ПРОВЕРКИ

### **7. Performance**

```bash
□ Время ответа API < 2 секунд
□ Размер страниц < 500KB
□ Изображения оптимизированы
□ Нет memory leaks
```

---

### **8. Monitoring**

```bash
□ Логи пишутся в Vercel
□ Ошибки видны в Functions
□ Health check можно мониторить
□ Webhook события логируются
```

---

### **9. Documentation**

```bash
□ README.md актуален
□ TODO.md актуален
□ ARCHITECTURE.md создан
□ .env.example полный
□ Комментарии в коде
```

---

## 🚀 DEPLOYMENT STEPS

### **Шаг 1: Pre-flight**

```bash
# 1. Проверить все чекбоксы выше
# 2. Убедиться что все тесты проходят
# 3. Сделать backup текущей версии

git tag v2.1.0-pre-deploy
git push origin v2.1.0-pre-deploy
```

### **Шаг 2: Deploy**

```bash
# 1. Push в main
git push origin main

# 2. Дождаться успешного build в Vercel
# Vercel Dashboard → Deployments → Latest

# 3. Проверить production URL
curl https://botinstasgram.vercel.app/api/health
```

### **Шаг 3: Post-deployment**

```bash
# 1. Smoke test всех критичных endpoints
# 2. Проверить логи на ошибки
# 3. Сделать тестовый платёж
# 4. Проверить что VPN работает

# 5. Если всё ОК - создать release tag
git tag v2.1.0
git push origin v2.1.0
```

---

## 🔥 ROLLBACK PLAN

### **Если что-то сломалось:**

```bash
# 1. В Vercel Dashboard
Deployments → Previous deployment → Promote to Production

# 2. Или через CLI
vercel rollback

# 3. Проверить что откатилось
curl https://botinstasgram.vercel.app/api/health

# 4. Исправить проблему локально
# 5. Повторить deployment
```

---

## 📊 SUCCESS CRITERIA

### **Deployment считается успешным если:**

- ✅ Health check возвращает "healthy"
- ✅ Тестовый платёж проходит полный цикл
- ✅ Config скачивается и импортируется
- ✅ VPN подключается к Instagram/YouTube
- ✅ Нет критичных ошибок в логах
- ✅ Rate limiting работает
- ✅ Все страницы загружаются < 2 сек

---

## 🆘 TROUBLESHOOTING

### **Проблема: Health check fails**

```bash
# Проверить логи
vercel logs --follow

# Проверить env variables
vercel env ls

# Проверить доступность панели
curl -k https://YOUR_VPS_IP:2053
```

### **Проблема: Webhook не вызывается**

```bash
# 1. Проверить URL в ЮKassa
# 2. Проверить логи в Vercel Functions
# 3. Отправить тестовое уведомление из ЮKassa Dashboard
# 4. Проверить что endpoint возвращает 200
```

### **Проблема: Config не работает**

```bash
# 1. Проверить Reality параметры
# 2. Проверить что inbound активен в 3X-UI
# 3. Проверить что порт 443 открыт на VPS
# 4. Проверить SNI domain
```

---

## 📞 CONTACTS

**В случае критических проблем:**

- GitHub Issues: https://github.com/slava9999-dev/Botinstasgram/issues
- Vercel Support: https://vercel.com/support
- 3X-UI Docs: https://github.com/mhsanaei/3x-ui
- ЮKassa Support: https://yookassa.ru/support

---

**Последнее обновление:** 16 декабря 2025  
**Статус:** ✅ Ready for deployment
