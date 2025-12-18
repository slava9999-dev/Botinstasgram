# ═══════════════════════════════════════════════════════════════
# VPN CONNECT - ПРОВЕРКА ЗДОРОВЬЯ API
# Запуск: .\scripts\check-health.ps1
# ═══════════════════════════════════════════════════════════════

$baseUrl = "https://botinstasgram.vercel.app"

Write-Host ""
Write-Host "🔍 ДИАГНОСТИКА VPN CONNECT API" -ForegroundColor Cyan
Write-Host "═══════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка API health
Write-Host "1️⃣ Проверка /api/health..." -ForegroundColor Yellow
try {
    $start = Get-Date
    $health = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 10
    $duration = ((Get-Date) - $start).TotalMilliseconds
    
    if ($health.StatusCode -eq 200) {
        Write-Host "   ✅ API работает (HTTP 200, ${duration}ms)" -ForegroundColor Green
        try {
            $data = $health.Content | ConvertFrom-Json
            Write-Host "   📊 Status: $($data.status)" -ForegroundColor Gray
            Write-Host "   📊 Panel: $($data.panel)" -ForegroundColor Gray
        }
        catch {
            Write-Host "   📄 Response: $($health.Content.Substring(0, [Math]::Min(100, $health.Content.Length)))..." -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "   ❌ API недоступен" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Проверка лендинга
Write-Host ""
Write-Host "2️⃣ Проверка Landing Page..." -ForegroundColor Yellow
try {
    $landing = Invoke-WebRequest -Uri "$baseUrl/" -Method Head -TimeoutSec 10
    Write-Host "   ✅ Лендинг работает (HTTP $($landing.StatusCode))" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Лендинг недоступен" -ForegroundColor Red
}

# 3. Проверка оферты
Write-Host ""
Write-Host "3️⃣ Проверка Offer Page..." -ForegroundColor Yellow
try {
    $offer = Invoke-WebRequest -Uri "$baseUrl/offer.html" -Method Head -TimeoutSec 10
    Write-Host "   ✅ Оферта доступна (HTTP $($offer.StatusCode))" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Оферта недоступна" -ForegroundColor Red
}

# 4. Проверка success page
Write-Host ""
Write-Host "4️⃣ Проверка Success Page..." -ForegroundColor Yellow
try {
    $success = Invoke-WebRequest -Uri "$baseUrl/success.html" -Method Head -TimeoutSec 10
    Write-Host "   ✅ Success страница доступна" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Success страница недоступна" -ForegroundColor Red
}

# 5. Проверка bot actions
Write-Host ""
Write-Host "5️⃣ Проверка Bot Actions..." -ForegroundColor Yellow
try {
    $botActions = Invoke-WebRequest -Uri "$baseUrl/api/bot/actions?action=offer" -Method Get -MaximumRedirection 0 -ErrorAction Stop
    Write-Host "   ⚠️ Неожиданный ответ (ожидался редирект)" -ForegroundColor Yellow
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Write-Host "   ✅ Bot Actions работает (редирект на оферту)" -ForegroundColor Green
    }
    else {
        Write-Host "   ⚠️ Bot Actions: HTTP $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "═══════════════════════════════" -ForegroundColor Cyan
Write-Host "Диагностика завершена!" -ForegroundColor Cyan
Write-Host ""
