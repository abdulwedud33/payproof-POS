# Runbook 02: Database Disaster Recovery & Restore

**Severity:** P1 (Critical)  
**Applies to:** PostgreSQL Database (`payproof` DB, RLS policies, schemas)  
**Target Recovery Time Objective (RTO):** < 15 minutes  
**Target Recovery Point Objective (RPO):** < 24 hours (daily backup) / < 5 minutes (WAL archiving)  

---

## 1. Prerequisites & Storage Locations
- Backup directory: `db/backups/` or external encrypted S3-compatible cold storage.
- Standard backup file format: `payproof_backup_YYYYMMDD_HHMMSS.dump` (PostgreSQL custom format, `-Fc`).
- Encryption: AES-256 encrypted using GPG or age with the offsite recovery key.

---

## 2. Emergency Restore Procedure

### Step 1: Quarantine & Stop Influx Traffic
Stop the API containers to prevent dirty concurrent transactions while the database is being restored:
```powershell
docker compose stop api
```

### Step 2: Validate Target Environment & Backup Integrity
Verify backup file checksum and size:
```powershell
.\scripts\db-restore.ps1 -BackupFile "db/backups/payproof_backup_20261122_120000.dump" -VerifyOnly
```

### Step 3: Execute Restoration
Run the automated restore script which resets the target database and applies the backup:
```powershell
.\scripts\db-restore.ps1 -BackupFile "db/backups/payproof_backup_20261122_120000.dump" -Confirm
```

### Step 4: Verify Schema Integrity & RLS Enforcement
Confirm that Row-Level Security remains enabled and forced on all tables post-restore:
```powershell
# Run the RLS verification suite against the restored DB
pnpm test:rls
```

### Step 5: Resume Traffic & Health Verification
Restart API services and monitor error rates:
```powershell
docker compose start api
.\scripts\health-check.ps1
```

---

## 3. Post-Restore Verification Checklist
- [ ] Query count on `sales` and `consumed_payments` matches pre-incident baseline.
- [ ] Row-Level Security policies are active (`rowsecurity = true`, `forcerowsecurity = true`).
- [ ] Cashier tablet reconnects and successfully flushes offline outbox without duplicates.
