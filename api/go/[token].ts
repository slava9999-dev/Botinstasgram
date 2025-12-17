import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateConfigToken } from '../../utils/jwt';

/**
 * GET /api/go/[token]
 * 
 * 🪄 МАГИЧЕСКАЯ КНОПКА - Smart Router
 * 
 * Определяет платформу пользователя и:
 * - iOS: Показывает страницу с FoXray/Streisand + subscription link
 * - Android: Deep link в Hiddify + APK fallback
 * - Desktop: Subscription URL + инструкции
 * 
 * Цель: Максимально приблизиться к ONE-CLICK!
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return res.status(400).send(errorPage('Неверная ссылка'));
  }

  const payload = validateConfigToken(token);
  
  if (!payload) {
    console.error('[Go] Invalid token access attempt');
    return res.status(401).send(errorPage(
      'Ссылка истекла или недействительна. Пожалуйста, создайте новый VPN конфиг на главной странице.'
    ));
  }

  const userAgent = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);
  const isMac = /macintosh|mac os x/i.test(userAgent);
  const isWindows = /windows/i.test(userAgent);

  // Get base URL
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['host'] || 'botinstasgram.vercel.app';
  const baseUrl = `${protocol}://${host}`;
  const subUrl = `${baseUrl}/api/sub/${token}`;

  // Generate VLESS URI for QR
  const vlessUri = buildVlessUri(payload, baseUrl);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (isIOS) {
    return res.status(200).send(iosPage(subUrl, vlessUri));
  }

  if (isAndroid) {
    return res.status(200).send(androidPage(subUrl, vlessUri));
  }

  if (isWindows) {
    return res.status(200).send(windowsPage(subUrl, vlessUri));
  }

  if (isMac) {
    return res.status(200).send(macPage(subUrl, vlessUri));
  }

  // Fallback: show all options
  return res.status(200).send(universalPage(subUrl, vlessUri));
}

function buildVlessUri(client: any, baseUrl: string): string {
  const params = new URLSearchParams({
    type: 'tcp',
    security: 'reality',
    pbk: client.publicKey,
    fp: 'chrome',
    sni: client.serverName,
    sid: client.shortId,
    flow: 'xtls-rprx-vision'
  });
  return `vless://${client.uuid}@${client.serverAddress}:${client.port}?${params.toString()}#VPN-Instagram`;
}

// ============================================
// HTML PAGES
// ============================================

const styles = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
    color: #fff;
  }
  .card {
    max-width: 420px;
    margin: 0 auto;
    background: #fff;
    border-radius: 24px;
    padding: 30px 25px;
    color: #1a1a2e;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  h1 { font-size: 24px; text-align: center; margin-bottom: 10px; }
  h2 { font-size: 18px; margin: 20px 0 10px; color: #333; }
  p { color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 15px; }
  .step {
    background: #f8fafc;
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border-radius: 50%;
    font-size: 14px;
    font-weight: 700;
    margin-right: 10px;
  }
  .btn {
    display: block;
    width: 100%;
    padding: 16px;
    text-align: center;
    text-decoration: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    margin-top: 10px;
    transition: all 0.3s;
    border: none;
    cursor: pointer;
  }
  .btn-green {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
  }
  .btn-blue {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #fff;
  }
  .btn-orange {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #fff;
  }
  .btn:hover { transform: translateY(-2px); opacity: 0.95; }
  .copy-box {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .copy-box input {
    flex: 1;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 12px;
    font-family: monospace;
  }
  .copy-btn {
    padding: 12px 16px;
    background: #667eea;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }
  .warning {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 12px;
    padding: 12px;
    font-size: 13px;
    color: #92400e;
    margin-top: 15px;
  }
  .success {
    background: #d1fae5;
    border: 1px solid #10b981;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    margin-top: 20px;
  }
  .success .icon { font-size: 48px; }
  .success h3 { color: #059669; margin: 10px 0; }
  .icon-big { font-size: 60px; text-align: center; display: block; margin-bottom: 15px; }
</style>
<script>
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Скопировано!');
  });
}
</script>
`;

function iosPage(subUrl: string, vlessUri: string): string {
  // FoXray deep links:
  // foxray://add?url=<subscription_url>
  // foxray://import/<base64>
  const foxrayDeepLink = `foxray://add?url=${encodeURIComponent(subUrl)}`;
  const foxrayVlessDeepLink = `foxray://import/${Buffer.from(vlessUri).toString('base64')}`;
  
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN для iPhone</title>
  ${styles}
  <script>
    // Попытка автоматически открыть FoXray
    function tryOpenApp() {
      const foxrayLink = '${foxrayDeepLink}';
      const appStoreLink = 'https://apps.apple.com/app/foxray/id6448898396';
      
      // Пробуем открыть приложение
      window.location.href = foxrayLink;
      
      // Если не получилось через 2 секунды - предлагаем скачать
      setTimeout(function() {
        if (document.visibilityState === 'visible') {
          // Пользователь всё ещё на странице - значит приложение не открылось
          document.getElementById('install-step').style.display = 'block';
          document.getElementById('connecting-msg').style.display = 'none';
        }
      }, 2000);
    }
    
    // Автозапуск при загрузке
    window.onload = function() {
      tryOpenApp();
    };
  </script>
</head>
<body>
  <div class="card">
    <span class="icon-big">📱</span>
    <h1>VPN для iPhone</h1>
    
    <div id="connecting-msg" style="text-align: center; padding: 20px;">
      <p style="font-size: 18px;">⏳ Открываем FoXray...</p>
      <p style="color: #666; font-size: 14px;">Если приложение не открылось, нажмите кнопку ниже</p>
    </div>
    
    <div id="install-step" style="display: none;">
      <div class="step">
        <h2><span class="step-num">1</span>Установи FoXray</h2>
        <p>Бесплатное приложение из App Store</p>
        <a href="https://apps.apple.com/app/foxray/id6448898396" class="btn btn-blue" target="_blank">
          📲 Открыть App Store
        </a>
      </div>
    </div>

    <div class="step">
      <h2><span class="step-num">2</span>Добавь VPN</h2>
      <p>Нажми кнопку — FoXray откроется и добавит сервер автоматически!</p>
      <a href="${foxrayDeepLink}" class="btn btn-green">
        ⚡ ПОДКЛЮЧИТЬ VPN
      </a>
      <div class="warning">
        💡 Если не открылось: скопируй ссылку и вставь в FoXray вручную
        (+ → Subscription URL → Вставь ссылку)
      </div>
      <div class="copy-box">
        <input type="text" value="${subUrl}" readonly id="sub-url">
        <button class="copy-btn" onclick="copyToClipboard('${subUrl}')">📋</button>
      </div>
    </div>

    <div class="success">
      <div class="icon">🎉</div>
      <h3>Почти готово!</h3>
      <p>После добавления включи VPN в приложении и открой Instagram!</p>
    </div>
  </div>
</body>
</html>`
}

function androidPage(subUrl: string, vlessUri: string): string {
  // Hiddify deep link formats:
  // hiddify://import/<encoded_url>
  // hiddify://add?url=<subscription_url>
  const hiddifyDeepLink = `hiddify://import/${encodeURIComponent(subUrl)}`;
  const hiddifyAddLink = `hiddify://add?url=${encodeURIComponent(subUrl)}`;
  
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN для Android</title>
  ${styles}
  <script>
    // Попытка автоматически открыть Hiddify
    function tryOpenApp() {
      const hiddifyLink = '${hiddifyDeepLink}';
      
      // Пробуем открыть приложение
      window.location.href = hiddifyLink;
      
      // Если не получилось через 2 секунды - показываем инструкции
      setTimeout(function() {
        if (document.visibilityState === 'visible') {
          document.getElementById('install-step').style.display = 'block';
          document.getElementById('connecting-msg').style.display = 'none';
        }
      }, 2000);
    }
    
    // Автозапуск при загрузке
    window.onload = function() {
      tryOpenApp();
    };
  </script>
</head>
<body>
  <div class="card">
    <span class="icon-big">🤖</span>
    <h1>VPN для Android</h1>
    
    <div id="connecting-msg" style="text-align: center; padding: 20px;">
      <p style="font-size: 18px;">⏳ Открываем Hiddify...</p>
      <p style="color: #666; font-size: 14px;">Если приложение не открылось, нажмите кнопку ниже</p>
    </div>

    <div id="install-step" style="display: none;">
      <div class="step">
        <h2><span class="step-num">1</span>Установи Hiddify</h2>
        <p>Бесплатное приложение</p>
        <a href="https://play.google.com/store/apps/details?id=app.hiddify.com" class="btn btn-blue" target="_blank">
          📲 Google Play
        </a>
        <a href="https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Android-universal.apk" class="btn btn-orange" target="_blank">
          📦 Скачать APK напрямую
        </a>
        <div class="warning">
          ⚠️ Если нет в Play Store — скачай APK. Это официальная версия с GitHub!
        </div>
      </div>
    </div>

    <div class="step">
      <h2><span class="step-num">2</span>Добавь VPN</h2>
      <p>Нажми кнопку — Hiddify откроется и добавит сервер автоматически!</p>
      <a href="${hiddifyDeepLink}" class="btn btn-green">
        ⚡ ПОДКЛЮЧИТЬ VPN
      </a>
      <div class="warning">
        💡 Если не открылось: открой Hiddify → нажми + → выбери "Добавить из буфера"
      </div>
      <div class="copy-box">
        <input type="text" value="${subUrl}" readonly>
        <button class="copy-btn" onclick="copyToClipboard('${subUrl}')">📋</button>
      </div>
    </div>

    <div class="success">
      <div class="icon">🎉</div>
      <h3>Почти готово!</h3>
      <p>Нажми "Подключить" в Hiddify и открой Instagram!</p>
    </div>
  </div>
</body>
</html>`;
}

function windowsPage(subUrl: string, vlessUri: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN для Windows</title>
  ${styles}
</head>
<body>
  <div class="card">
    <span class="icon-big">💻</span>
    <h1>VPN для Windows</h1>
    <p style="text-align: center;">Instagram и YouTube на компьютере!</p>

    <div class="step">
      <h2><span class="step-num">1</span>Скачай Hiddify</h2>
      <p>Бесплатная программа для Windows</p>
      <a href="https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-Windows-Setup-x64.exe" class="btn btn-blue" target="_blank">
        💾 Скачать Hiddify
      </a>
    </div>

    <div class="step">
      <h2><span class="step-num">2</span>Добавь VPN</h2>
      <p>Открой Hiddify → нажми <b>+</b> → выбери <b>"Добавить из буфера"</b></p>
      <p>Сначала скопируй эту ссылку:</p>
      <div class="copy-box">
        <input type="text" value="${subUrl}" readonly>
        <button class="copy-btn" onclick="copyToClipboard('${subUrl}')">📋 Копировать</button>
      </div>
    </div>

    <div class="step">
      <h2><span class="step-num">3</span>Подключись</h2>
      <p>Нажми большую кнопку <b>"Подключить"</b> в Hiddify</p>
    </div>

    <div class="success">
      <div class="icon">🎉</div>
      <h3>Готово!</h3>
      <p>Открой браузер и зайди в Instagram!</p>
    </div>
  </div>
</body>
</html>`;
}

function macPage(subUrl: string, vlessUri: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN для macOS</title>
  ${styles}
</head>
<body>
  <div class="card">
    <span class="icon-big">🍎</span>
    <h1>VPN для macOS</h1>
    <p style="text-align: center;">Instagram и YouTube на Mac!</p>

    <div class="step">
      <h2><span class="step-num">1</span>Скачай Hiddify</h2>
      <a href="https://github.com/hiddify/hiddify-next/releases/latest/download/Hiddify-MacOS.dmg" class="btn btn-blue" target="_blank">
        💾 Скачать для macOS
      </a>
    </div>

    <div class="step">
      <h2><span class="step-num">2</span>Добавь VPN</h2>
      <p>Открой Hiddify → <b>+</b> → <b>"Добавить из буфера"</b></p>
      <div class="copy-box">
        <input type="text" value="${subUrl}" readonly>
        <button class="copy-btn" onclick="copyToClipboard('${subUrl}')">📋 Копировать</button>
      </div>
    </div>

    <div class="success">
      <div class="icon">🎉</div>
      <h3>Готово!</h3>
      <p>Подключись и открой Instagram!</p>
    </div>
  </div>
</body>
</html>`;
}

function universalPage(subUrl: string, vlessUri: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN Подключение</title>
  ${styles}
</head>
<body>
  <div class="card">
    <span class="icon-big">🌐</span>
    <h1>VPN для всех устройств</h1>

    <div class="step">
      <h2>Ссылка на подписку:</h2>
      <div class="copy-box">
        <input type="text" value="${subUrl}" readonly>
        <button class="copy-btn" onclick="copyToClipboard('${subUrl}')">📋</button>
      </div>
    </div>

    <div class="step">
      <h2>Выбери своё устройство:</h2>
      <a href="https://apps.apple.com/app/foxray/id6448898396" class="btn btn-blue">📱 iPhone (FoXray)</a>
      <a href="https://play.google.com/store/apps/details?id=app.hiddify.com" class="btn btn-green">🤖 Android (Hiddify)</a>
      <a href="https://github.com/hiddify/hiddify-next/releases" class="btn btn-orange">💻 Windows/Mac</a>
    </div>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ошибка</title>
  ${styles}
</head>
<body>
  <div class="card">
    <span class="icon-big">❌</span>
    <h1>Ошибка</h1>
    <p style="text-align: center;">${message}</p>
    <a href="/" class="btn btn-blue">← На главную</a>
  </div>
</body>
</html>`;
}
