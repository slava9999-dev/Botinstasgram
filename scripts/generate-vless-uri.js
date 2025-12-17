/**
 * 🔧 VLESS URI Generator
 * 
 * Генерирует рабочий VLESS URI для ручного тестирования.
 * 
 * Использование:
 * node scripts/generate-vless-uri.js <uuid> <publicKey> <shortId>
 */

// Параметры сервера (из вашей конфигурации)
const SERVER_ADDRESS = '72.56.64.62';
const SERVER_PORT = 443;
const SNI_DOMAIN = 'www.microsoft.com'; // ✅ Синхронизировано с 3X-UI
const FLOW = 'xtls-rprx-vision';
const FINGERPRINT = 'chrome';

// Параметры из аргументов или значения по умолчанию
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🔧 VLESS URI GENERATOR для тестирования               ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Использование:                                                ║
║  node scripts/generate-vless-uri.js <uuid> <publicKey> <sid>   ║
║                                                                ║
║  Примеры:                                                      ║
║  node scripts/generate-vless-uri.js \\                          ║
║    364803ef-60b8-45ff-938d-ab1173633f24 \\                      ║
║    YOUR_PUBLIC_KEY \\                                           ║
║    YOUR_SHORT_ID                                               ║
║                                                                ║
║  Где взять параметры:                                          ║
║  - uuid: из 3X-UI → Inbounds → клиент → ID                     ║
║  - publicKey: 3X-UI → Inbounds → Reality Settings → Public Key ║
║  - shortId: 3X-UI → Inbounds → Reality Settings → Short IDs    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  // Если есть хотя бы UUID, покажем пример
  if (args[0]) {
    console.log(`\n💡 Вы указали UUID: ${args[0]}`);
    console.log(`\n📋 Пример с вашим UUID:\n`);
    console.log(`vless://${args[0]}@${SERVER_ADDRESS}:${SERVER_PORT}?type=tcp&security=reality&pbk=YOUR_PUBLIC_KEY&fp=chrome&sni=${SNI_DOMAIN}&sid=YOUR_SHORT_ID&flow=${FLOW}#VPN-Test`);
  }
  
  process.exit(0);
}

const [uuid, publicKey, shortId] = args;
const configName = args[3] || 'VPN-Instagram';

// Формируем параметры
const params = new URLSearchParams({
  type: 'tcp',
  security: 'reality',
  pbk: publicKey,
  fp: FINGERPRINT,
  sni: SNI_DOMAIN,
  sid: shortId,
  flow: FLOW
});

// Генерируем URI
const vlessUri = `vless://${uuid}@${SERVER_ADDRESS}:${SERVER_PORT}?${params.toString()}#${encodeURIComponent(configName)}`;

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  ✅ VLESS URI СГЕНЕРИРОВАН!                    ║
╠════════════════════════════════════════════════════════════════╣

📋 Параметры:
   • UUID:       ${uuid}
   • Server:     ${SERVER_ADDRESS}:${SERVER_PORT}
   • SNI:        ${SNI_DOMAIN}
   • Public Key: ${publicKey.substring(0, 20)}...
   • Short ID:   ${shortId}
   • Flow:       ${FLOW}

═══════════════════════════════════════════════════════════════

🔗 VLESS URI (скопируйте это):

${vlessUri}

═══════════════════════════════════════════════════════════════

📱 Что делать дальше:
   1. Скопируйте URI выше
   2. Откройте Hiddify (Android) или FoXray (iOS)
   3. Нажмите + → "Добавить из буфера" или "Import"
   4. Включите VPN и проверьте Instagram!

╚════════════════════════════════════════════════════════════════╝
`);

// Также покажем QR-код URL
console.log(`🔲 QR Code URL (откройте в браузере для генерации QR):`);
console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(vlessUri)}`);
console.log('');
