# PayProof POS · Database Backup Utility
param(
  [string]$OutputDir = "db/backups",
  [string]$ContainerName = "payproof-db"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$OutputDir/payproof_backup_$Timestamp.dump"

Write-Host "Creating PayProof database backup: $BackupFile..." -ForegroundColor Cyan

docker exec -t $ContainerName pg_dump -U payproof_app -d payproof -F c -b -v -f "/tmp/backup.dump"
docker cp "${ContainerName}:/tmp/backup.dump" $BackupFile
docker exec -t $ContainerName rm -f "/tmp/backup.dump"

if (Test-Path $BackupFile) {
  $Size = (Get-Item $BackupFile).Length / 1KB
  Write-Host "Backup completed successfully ($([math]::Round($Size, 2)) KB): $BackupFile" -ForegroundColor Green
} else {
  Write-Error "Backup creation failed!"
}
