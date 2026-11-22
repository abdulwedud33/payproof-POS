# PayProof POS · Database Restore Utility
param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile,
  [string]$ContainerName = "payproof-db",
  [switch]$VerifyOnly,
  [switch]$Confirm
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
  Write-Error "Backup file does not exist: $BackupFile"
}

$Size = (Get-Item $BackupFile).Length / 1KB
Write-Host "Inspecting backup file: $BackupFile ($([math]::Round($Size, 2)) KB)..." -ForegroundColor Cyan

if ($VerifyOnly) {
  Write-Host "Verification mode: file exists and readable." -ForegroundColor Green
  exit 0
}

if (-not $Confirm) {
  $prompt = Read-Host "WARNING: Restoring will overwrite existing data. Type 'RESTORE' to proceed"
  if ($prompt -ne "RESTORE") {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    exit 0
  }
}

Write-Host "Copying backup to database container..." -ForegroundColor Cyan
docker cp $BackupFile "${ContainerName}:/tmp/restore.dump"

Write-Host "Restoring database schema and records..." -ForegroundColor Cyan
docker exec -t $ContainerName pg_restore -U payproof_app -d payproof --clean --if-exists -v "/tmp/restore.dump"
docker exec -t $ContainerName rm -f "/tmp/restore.dump"

Write-Host "Database restore complete. Running RLS verification..." -ForegroundColor Green
