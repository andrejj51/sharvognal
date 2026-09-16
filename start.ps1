param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$clubRoot = $PSScriptRoot
$clubUrl = 'http://127.0.0.1:8787'
try {
    $clubHealth = Invoke-RestMethod "$clubUrl/api/health" -TimeoutSec 2
    if ($clubHealth.app -eq 'zazerkalye-ping-pong') { if (-not $NoBrowser) { Start-Process $clubUrl }; exit 0 }
} catch {}
$clubNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$clubNode = if ($clubNodeCommand) { $clubNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $clubNode)) { throw 'Нужен Node.js 24 или новее: https://nodejs.org/' }
$clubVersion = & $clubNode --version
if ([int]$clubVersion.TrimStart('v').Split('.')[0] -lt 24) { throw 'Обновите Node.js до версии 24 или новее.' }
New-Item -ItemType Directory -Force -Path (Join-Path $clubRoot '.runtime') | Out-Null
$clubProcess = Start-Process -FilePath $clubNode -ArgumentList ('"' + (Join-Path $clubRoot 'server.mjs') + '"') -WorkingDirectory $clubRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $clubRoot '.runtime\server.log') -RedirectStandardError (Join-Path $clubRoot '.runtime\error.log')
$clubReady = $false
for ($clubAttempt = 0; $clubAttempt -lt 30; $clubAttempt++) {
    try { $clubHealth = Invoke-RestMethod "$clubUrl/api/health" -TimeoutSec 1; if ($clubHealth.app -eq 'zazerkalye-ping-pong') { $clubReady = $true; break } } catch {}
    if ($clubProcess.HasExited) { break }
    Start-Sleep -Milliseconds 300
}
if (-not $clubReady) { throw ('Сайт не запустился. Посмотрите журнал: ' + (Join-Path $clubRoot '.runtime\error.log')) }
if (-not $NoBrowser) { Start-Process $clubUrl }
Write-Host 'Зазеркалье запущено. Для остановки используйте stop.cmd.'
