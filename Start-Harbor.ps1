$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot 'harbor-game')
$env:NODE_OPTIONS = '--use-system-ca'
$env:npm_config_cache = Join-Path $PSScriptRoot '.npm-cache'
if (-not (Test-Path -LiteralPath 'node_modules')) { npm ci }
npm run dev -- --host 127.0.0.1 --port 3000
