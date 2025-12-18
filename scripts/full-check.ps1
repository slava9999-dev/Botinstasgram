# ═══════════════════════════════════════════════════════════════
# VPN CONNECT - ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ
# Запуск: .\scripts\full-check.ps1 -VpsIP "YOUR_VPS_IP" -VpnPort 443
# ═══════════════════════════════════════════════════════════════

param(
    [string]$VpsIP = "",
    [int]$VpnPort = 443
)

$baseUrl = "https://botinstasgram.vercel.app"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          VPN CONNECT - ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Время: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
if ($VpsIP) { Write-Host "VPS IP: $VpsIP" -ForegroundColor Gray }
Write-Host ""

$results = @()

# ═══════════════════════════════════════════════════════════════
# 1. VERCEL API
# ═══════════════════════════════════════════════════════════════
Write-Host "📡 VERCEL API" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$endpoints = @(
    @{Name="Health API"; Url="/api/health"; Method="GET"},
    @{Name="Landing Page"; Url="/"; Method="HEAD"},
    @{Name="Offer Page"; Url="/offer.html"; Method="HEAD"},
    @{Name="Success Page"; Url="/success.html"; Method="HEAD"},
    @{Name="Privacy Page"; Url="/privacy.html"; Method="HEAD"}
)

foreach ($ep in $endpoints) {
    try {
        $start = Get-Date
        if ($ep.Method -eq "HEAD") {
            $response = Invoke-WebRequest -Uri "$baseUrl$($ep.Url)" -Method Head -TimeoutSec 10
        } else {
            $response = Invoke-WebRequest -Uri "$baseUrl$($ep.Url)" -Method Get -TimeoutSec 10
        }
        $duration = ((Get-Date) - $start).TotalMilliseconds
        Write-Host "   ✅ $($ep.Name) (${duration}ms)" -ForegroundColor Green
        $results += [PSCustomObject]@{Component=$ep.Name; Status="OK"; Time="${duration}ms"}
    } catch {
        Write-Host "   ❌ $($ep.Name): $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{Component=$ep.Name; Status="FAIL"; Time="-"}
    }
}

# ═══════════════════════════════════════════════════════════════
# 2. BOT ACTIONS API
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "🤖 BOT ACTIONS API" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

# Проверка offer action
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/bot/actions?action=offer" -Method Get -MaximumRedirection 0 -ErrorAction Stop
    Write-Host "   ⚠️ Offer action: неожиданный ответ" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Write-Host "   ✅ Offer action (редирект OK)" -ForegroundColor Green
        $results += [PSCustomObject]@{Component="Bot Offer Action"; Status="OK"; Time="-"}
    } else {
        Write-Host "   ❌ Offer action: $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{Component="Bot Offer Action"; Status="FAIL"; Time="-"}
    }
}

# ═══════════════════════════════════════════════════════════════
# 3. VPS SERVER (если указан)
# ═══════════════════════════════════════════════════════════════
if ($VpsIP) {
    Write-Host ""
    Write-Host "🖥️ VPS SERVER" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
    
    # Ping
    Write-Host "   Проверка ping..." -ForegroundColor Gray
    $ping = Test-Connection -ComputerName $VpsIP -Count 2 -Quiet
    if ($ping) {
        $pingResult = Test-Connection -ComputerName $VpsIP -Count 1
        $latency = $pingResult.ResponseTime
        Write-Host "   ✅ Ping OK (${latency}ms)" -ForegroundColor Green
        $results += [PSCustomObject]@{Component="VPS Ping"; Status="OK"; Time="${latency}ms"}
    } else {
        Write-Host "   ❌ VPS не отвечает на ping" -ForegroundColor Red
        $results += [PSCustomObject]@{Component="VPS Ping"; Status="FAIL"; Time="-"}
    }
    
    # VPN Port
    Write-Host "   Проверка порта $VpnPort..." -ForegroundColor Gray
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($VpsIP, $VpnPort, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(5000, $false)
        if ($wait) {
            $tcpClient.EndConnect($connect)
            $tcpClient.Close()
            Write-Host "   ✅ Port $VpnPort открыт" -ForegroundColor Green
            $results += [PSCustomObject]@{Component="VPN Port $VpnPort"; Status="OK"; Time="-"}
        } else {
            Write-Host "   ❌ Port $VpnPort timeout" -ForegroundColor Red
            $results += [PSCustomObject]@{Component="VPN Port $VpnPort"; Status="FAIL"; Time="-"}
        }
    } catch {
        Write-Host "   ❌ Port $VpnPort: $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{Component="VPN Port $VpnPort"; Status="FAIL"; Time="-"}
    }
} else {
    Write-Host ""
    Write-Host "💡 Для проверки VPS добавьте параметр: -VpsIP 'YOUR_IP'" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════════
# ИТОГИ
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
$okCount = ($results | Where-Object { $_.Status -eq "OK" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count

if ($failCount -eq 0) {
    Write-Host "✅ ВСЁ РАБОТАЕТ! ($okCount из $total проверок пройдено)" -ForegroundColor Green
} elseif ($failCount -lt ($total / 2)) {
    Write-Host "⚠️ ЕСТЬ ПРЕДУПРЕЖДЕНИЯ: $failCount из $total проверок не пройдено" -ForegroundColor Yellow
} else {
    Write-Host "❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ: $failCount из $total проверок не пройдено" -ForegroundColor Red
}

Write-Host ""
Write-Host "Детальные результаты:" -ForegroundColor Gray
$results | Format-Table -AutoSize

Write-Host ""
