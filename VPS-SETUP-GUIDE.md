# 🛠️ РУКОВОДСТВО ПО НАСТРОЙКЕ VPS ДЛЯ VPN CONNECT

**Дата:** 17 декабря 2025  
**Версия:** 1.0  
**Статус:** 🔴 КРИТИЧЕСКИ ВАЖНО для работы VPN

---

## 🚨 ТЕКУЩАЯ ПРОБЛЕМА

VPN подключается, но трафик не проходит:

- ✅ Подключение установлено
- ✅ Входящий трафик: 122 байт
- ❌ Исходящий трафик: 0 байт
- ❌ Сайты не открываются

---

## 📋 ПОШАГОВОЕ ИСПРАВЛЕНИЕ

### ШАГ 1: Подключение к VPS

```bash
ssh root@72.56.64.62
```

### ШАГ 2: Проверка Firewall

```bash
# Проверка UFW
sudo ufw status

# Если UFW активен, открыть порты:
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw allow 2053/tcp  # Порт панели

# Проверка iptables
sudo iptables -L -n -v

# Разрешить исходящий трафик (если заблокирован):
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A OUTPUT -p udp --dport 443 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
```

### ШАГ 3: Настройка DNS в 3X-UI

1. Откройте панель: `https://72.56.64.62:2053/WIx1sHmHYPPEuG8AKY/panel/`
2. Перейдите в **Настройки панели** → **Xray настройки**
3. Найдите раздел **Xray JSON** или **Настройки Xray**
4. Добавьте блок DNS:

```json
{
  "dns": {
    "servers": [
      {
        "address": "1.1.1.1",
        "port": 53
      },
      {
        "address": "8.8.8.8",
        "port": 53
      },
      "https://dns.google/dns-query",
      "https://cloudflare-dns.com/dns-query"
    ],
    "queryStrategy": "UseIP",
    "disableCache": false,
    "disableFallback": false
  }
}
```

### ШАГ 4: Настройка Routing (Маршрутизация)

В том же разделе **Xray JSON**, добавьте/исправьте routing:

```json
{
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "ip": ["geoip:private"],
        "outboundTag": "blocked"
      },
      {
        "type": "field",
        "protocol": ["bittorrent"],
        "outboundTag": "blocked"
      },
      {
        "type": "field",
        "network": "tcp,udp",
        "outboundTag": "direct"
      }
    ]
  }
}
```

### ШАГ 5: Настройка Outbounds

Убедитесь, что в **Outbounds** есть:

```json
{
  "outbounds": [
    {
      "tag": "direct",
      "protocol": "freedom",
      "settings": {
        "domainStrategy": "UseIP"
      }
    },
    {
      "tag": "blocked",
      "protocol": "blackhole",
      "settings": {}
    }
  ]
}
```

### ШАГ 6: Перезапуск Xray

```bash
# Перезапуск сервиса x-ui
sudo systemctl restart x-ui

# Или через Docker (если используется):
docker restart x-ui

# Проверка статуса
sudo systemctl status x-ui
```

### ШАГ 7: Проверка логов

```bash
# Логи x-ui
journalctl -u x-ui -f

# Логи Xray
tail -f /var/log/xray/access.log
tail -f /var/log/xray/error.log

# Если файлы не найдены, проверьте:
ls -la /usr/local/x-ui/
cat /usr/local/x-ui/x-ui.log
```

---

## 🔍 ДИАГНОСТИКА

### Проверка доступности VPS:

```bash
# С локальной машины:
ping 72.56.64.62
nc -zv 72.56.64.62 443
nc -zv 72.56.64.62 2053
```

### Проверка DNS на VPS:

```bash
# На VPS:
nslookup google.com
dig google.com @1.1.1.1
curl -I https://google.com

# Если DNS не работает:
echo "nameserver 1.1.1.1" > /etc/resolv.conf
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
```

### Проверка NAT:

```bash
# На VPS:
sudo iptables -t nat -L -n -v

# Включить NAT если нужно:
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

### Проверка IP Forwarding:

```bash
# Проверить:
cat /proc/sys/net/ipv4/ip_forward

# Если 0, включить:
echo 1 > /proc/sys/net/ipv4/ip_forward

# Сделать постоянным:
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p
```

---

## ✅ ПОЛНЫЙ РАБОЧИЙ КОНФИГ XRAY

Если ничего не помогает, замените весь Xray config:

```json
{
  "log": {
    "loglevel": "warning",
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log"
  },
  "dns": {
    "servers": ["1.1.1.1", "8.8.8.8", "https://dns.google/dns-query"]
  },
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "yahoo.com:443",
          "xver": 0,
          "serverNames": ["yahoo.com"],
          "privateKey": "YOUR_PRIVATE_KEY",
          "shortIds": ["YOUR_SHORT_ID"]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    }
  ],
  "outbounds": [
    {
      "tag": "direct",
      "protocol": "freedom",
      "settings": {
        "domainStrategy": "UseIP"
      }
    },
    {
      "tag": "blocked",
      "protocol": "blackhole",
      "settings": {}
    }
  ],
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "ip": ["geoip:private"],
        "outboundTag": "blocked"
      },
      {
        "type": "field",
        "protocol": ["bittorrent"],
        "outboundTag": "blocked"
      }
    ]
  }
}
```

---

## 🧪 ТЕСТИРОВАНИЕ

После настройки:

1. **Создайте нового клиента** через бота/сайт
2. **Подключитесь** через Hiddify/FoXray
3. **Проверьте:**
   - `curl https://ifconfig.me` (должен показать IP VPS)
   - Откройте Instagram
   - Откройте YouTube

---

## 📞 ЕСЛИ НЕ РАБОТАЕТ

Соберите информацию:

```bash
# Версия системы
cat /etc/os-release

# Версия x-ui
x-ui version

# Информация об интерфейсах
ip addr

# Таблица маршрутизации
ip route

# Открытые порты
ss -tulpn | grep -E '443|2053'
```

И свяжитесь с поддержкой VPS провайдера — возможно, на их стороне блокировка исходящего трафика.

---

**Документ создан:** 17 декабря 2025  
**Автор:** Lead Developer
