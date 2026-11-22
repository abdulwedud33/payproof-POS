# PayProof POS · Health Check Script
param(
  [string]$ApiUrl = "http://localhost:3000",
  [string]$VerificationUrl = "http://localhost:8000",
  [string]$MockProviderUrl = "http://localhost:8080"
)

Write-Host "Running PayProof POS Health Checks..." -ForegroundColor Cyan

function Check-Endpoint($name, $url) {
  try {
    $res = Invoke-RestMethod -Uri "$url/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[OK] $name is healthy at $url ($($res.status))" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] $name failed at $url : $_" -ForegroundColor Red
  }
}

Check-Endpoint "Core API" $ApiUrl
Check-Endpoint "Verification Engine" $VerificationUrl
Check-Endpoint "Mock Provider" $MockProviderUrl

Write-Host "Health checks completed." -ForegroundColor Cyan
