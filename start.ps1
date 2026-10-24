# HexaCyberLab — one-command launcher (Windows)
# Starts the Gateway dashboard at http://localhost:4000
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is not installed. Install Node.js 20+ from https://nodejs.org and run this again.' -ForegroundColor Red
  exit 1
}
Write-Host '⬢ Starting the HexaCyberLab Gateway — your dashboard opens at http://localhost:4000' -ForegroundColor Cyan
Write-Host '  Keep this window open: it is your live server console for every lab you start.' -ForegroundColor DarkCyan
node gateway/build-index.js | Out-Null
Start-Job -ScriptBlock { Start-Sleep 2; Start-Process 'http://localhost:4000' } | Out-Null
node gateway/server.js
