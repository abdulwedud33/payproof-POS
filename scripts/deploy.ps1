# ==============================================================================
# PayProof POS - Windows PowerShell Production Deployment Script
# Usage: .\scripts\deploy.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    PayProof POS - Production Deployment         " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env.production")) {
    Write-Error ".env.production file not found! Copy .env.production.example to .env.production first."
    exit 1
}

Write-Host "[1/4] Building static owner web dashboard..." -ForegroundColor Yellow
pnpm --filter @payproof/owner-web build

Write-Host "[2/4] Building production containers..." -ForegroundColor Yellow
docker compose --env-file .env.production -f docker-compose.prod.yml build

Write-Host "[3/4] Launching production stack daemon..." -ForegroundColor Yellow
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

Write-Host "[4/4] Verifying health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    $res = Invoke-RestMethod -Uri "http://localhost/health" -TimeoutSec 5
    Write-Host "SUCCESS: PayProof POS is live and healthy! Status: $($res.status)" -ForegroundColor Green
} catch {
    Write-Warning "Healthcheck request failed or container still starting: $_"
}
