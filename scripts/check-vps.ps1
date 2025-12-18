# ═══════════════════════════════════════════════════════════════
# VPN CONNECT - ПРОВЕРКА VPS СЕРВЕРА
# Запуск: .\scripts\check-vps.ps1 -VpsIP "YOUR_VPS_IP" -VpnPort 443
# ═══════════════════════════════════════════════════════════════

param(
    [Parameter(Mandatory = $true)]
    [string]$VpsIP,
    
    [int]$VpnPort = 443,
    [int]$PanelPort = 2053
)

Write-Host ""
Write-Host "🖥️ ДИАГНОСТИКА VPS СЕРВЕРА" -ForegroundColor Cyan
Write-Host "═══════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "VPS IP: $VpsIP" -ForegroundColor Gray
Write-Host "VPN Port: $VpnPort" -ForegroundColor Gray
Write-Host "Panel Port: $PanelPort" -ForegroundColor Gray
Write-Host ""

# 1. Ping VPS
Write-Host "1️⃣ Ping VPS..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $VpsIP -Count 3 -Quiet
if ($ping) {
    $pingResult = Test-Connection -ComputerName $VpsIP -Count 3
    $avgLatency = ($pingResult | Measure-Object -Property ResponseTime -Average).Average
    Write-Host "   ✅ VPS доступен (avg latency: $([math]::Round($avgLatency))ms)" -ForegroundColor Green
}
else {
    Write-Host "   ❌ VPS не отвечает на ping" -ForegroundColor Red
    Write-Host "   (Возможно ping заблокирован на VPS, проверьте порты)" -ForegroundColor Gray
}

# 2. Проверка VPN порта
Write-Host ""
Write-Host "2️⃣ Проверка VPN порта ($VpnPort)..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($VpsIP, $VpnPort, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(5000, $false)
    
    if ($wait) {
        $tcpClient.EndConnect($connect)
        $tcpClient.Close()
        Write-Host "   ✅ Порт $VpnPort ОТКРЫТ - VPN доступен!" -ForegroundColor Green
    }
    else {
        $tcpClient.Close()
        Write-Host "   ❌ Порт $VpnPort ЗАКРЫТ или timeout" -ForegroundColor Red
        Write-Host "   Проверьте: firewall, ufw, iptables на VPS" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Ошибка подключения к порту $VpnPort" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
}

# 3. Проверка Panel порта
Write-Host ""
Write-Host "3️⃣ Проверка Panel порта ($PanelPort)..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($VpsIP, $PanelPort, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(5000, $false)
    
    if ($wait) {
        $tcpClient.EndConnect($connect)
        $tcpClient.Close()
        Write-Host "   ✅ Порт $PanelPort ОТКРЫТ - Panel доступна!" -ForegroundColor Green
    }
    else {
        $tcpClient.Close()
        Write-Host "   ⚠️ Порт $PanelPort закрыт (нормально если используете другой порт)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ⚠️ Panel порт $PanelPort недоступен" -ForegroundColor Yellow
}

# Подсказки
Write-Host ""
Write-Host "═══════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 SSH КОМАНДЫ ДЛЯ VPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Подключение:" -ForegroundColor Gray
Write-Host "   ssh root@$VpsIP" -ForegroundColor White
Write-Host ""
Write-Host "   Проверка сервисов:" -ForegroundColor Gray
Write-Host "   systemctl status x-ui" -ForegroundColor White
Write-Host "   systemctl status xray" -ForegroundColor White
Write-Host ""
Write-Host "   Перезапуск VPN:" -ForegroundColor Gray
Write-Host "   systemctl restart x-ui && systemctl restart xray" -ForegroundColor White
Write-Host ""
Write-Host "   Логи:" -ForegroundColor Gray
Write-Host "   journalctl -u x-ui -f" -ForegroundColor White
Write-Host ""
