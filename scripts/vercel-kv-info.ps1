# ═══════════════════════════════════════════════════════════════
# VPN CONNECT - ИНФОРМАЦИЯ О VERCEL KV
# Запуск: .\scripts\vercel-kv-info.ps1
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "📦 VERCEL KV - БАЗА ДАННЫХ" -ForegroundColor Cyan
Write-Host "═══════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔗 WEB ИНТЕРФЕЙС:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Откройте: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "   2. Выберите проект 'Botinstasgram'" -ForegroundColor White
Write-Host "   3. Перейдите во вкладку 'Storage'" -ForegroundColor White
Write-Host "   4. Нажмите на ваш KV store" -ForegroundColor White
Write-Host "   5. Вы увидите все ключи и значения" -ForegroundColor White
Write-Host ""

Write-Host "💻 CLI КОМАНДЫ:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Установка Vercel CLI:" -ForegroundColor Gray
Write-Host "   npm i -g vercel" -ForegroundColor Green
Write-Host ""
Write-Host "   Авторизация:" -ForegroundColor Gray
Write-Host "   vercel login" -ForegroundColor Green
Write-Host ""
Write-Host "   Просмотр всех ключей:" -ForegroundColor Gray
Write-Host '   vercel kv keys "*"' -ForegroundColor Green
Write-Host ""
Write-Host "   Просмотр trial пользователей:" -ForegroundColor Gray
Write-Host '   vercel kv keys "trial:*"' -ForegroundColor Green
Write-Host ""
Write-Host "   Просмотр платежей:" -ForegroundColor Gray
Write-Host '   vercel kv keys "payment:*"' -ForegroundColor Green
Write-Host ""
Write-Host "   Получить значение ключа:" -ForegroundColor Gray
Write-Host '   vercel kv get "trial:123456789"' -ForegroundColor Green
Write-Host ""
Write-Host "   Удалить ключ (сбросить trial):" -ForegroundColor Gray
Write-Host '   vercel kv del "trial:TELEGRAM_ID"' -ForegroundColor Green
Write-Host ""

Write-Host "📊 СТРУКТУРА ДАННЫХ:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   trial:TELEGRAM_ID" -ForegroundColor White
Write-Host "   {" -ForegroundColor Gray
Write-Host '     "telegramId": "123456789",' -ForegroundColor Gray
Write-Host '     "email": "tg_123456789@vpn.local",' -ForegroundColor Gray
Write-Host '     "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",' -ForegroundColor Gray
Write-Host '     "createdAt": "2025-12-18T15:00:00.000Z",' -ForegroundColor Gray
Write-Host '     "expiresAt": "2025-12-21T15:00:00.000Z",' -ForegroundColor Gray
Write-Host '     "used": true' -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════" -ForegroundColor Cyan
Write-Host ""
