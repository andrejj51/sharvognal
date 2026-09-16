$ErrorActionPreference = 'Stop'
$clubPidPath = Join-Path $PSScriptRoot '.runtime\server.pid'
if (-not (Test-Path -LiteralPath $clubPidPath)) { Write-Host 'Сайт уже остановлен.'; exit 0 }
$clubServerPid = [int](Get-Content -LiteralPath $clubPidPath)
$clubProcessInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$clubServerPid"
$clubServerPath = Join-Path $PSScriptRoot 'server.mjs'
if ($clubProcessInfo -and $clubProcessInfo.Name -eq 'node.exe' -and $clubProcessInfo.CommandLine.Contains($clubServerPath)) {
    Stop-Process -Id $clubServerPid
    Remove-Item -LiteralPath $clubPidPath -Force
    Write-Host 'Сайт остановлен. Все результаты сохранены.'
} elseif (-not $clubProcessInfo) { Remove-Item -LiteralPath $clubPidPath -Force; Write-Host 'Сайт уже остановлен.' }
else { throw 'Не удалось подтвердить процесс сайта. Закройте окно, в котором запущен сервер.' }
