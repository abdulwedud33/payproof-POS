# Runbook 04: Secret & Encryption Key Rotation

**Severity:** P2 (High)  
**Applies to:** JWT signing keys, AES-256 account reference encryption keys, Database credentials  
**Schedule:** Every 90 days, or immediately upon suspected compromise

---

## 1. Secrets Inventory & Encryption Context

| Secret                 | Variable                 | Purpose                                           | Location                   |
| ---------------------- | ------------------------ | ------------------------------------------------- | -------------------------- |
| JWT Access Secret      | `JWT_ACCESS_SECRET`      | Signs 15-minute bearer tokens                     | API Environment            |
| JWT Refresh Secret     | `JWT_REFRESH_SECRET`     | Signs 7-day refresh cookies                       | API Environment            |
| Account Encryption Key | `ACCOUNT_ENCRYPTION_KEY` | AES-256-GCM encryption of payment account numbers | API Environment            |
| Database Password      | `DATABASE_URL`           | PostgreSQL authentication                         | API / Migrator Environment |

---

## 2. Rotation Procedures

### 2.1 Rotating JWT Signing Keys (Zero-Downtime)

1. Generate new 32-byte cryptographically secure random secret:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env`.
3. Restart API instances (`docker compose restart api`).
4. Users with active sessions will seamlessly re-authenticate on next login or token refresh.

### 2.2 Rotating Account Encryption Key (AES-256-GCM)

When rotating `ACCOUNT_ENCRYPTION_KEY`, existing encrypted records in `payment_accounts.account_ref_enc` must be re-encrypted:

1. Generate new 32-byte hex key: `NEW_ACCOUNT_ENCRYPTION_KEY`.
2. Run database re-encryption utility script (decrypts with old key, re-encrypts with new key within an atomic transaction).
3. Update `ACCOUNT_ENCRYPTION_KEY` in environment.
4. Restart API containers.

### 2.3 Rotating PostgreSQL Master Password

1. Update password in PostgreSQL:
   ```sql
   ALTER USER payproof_app WITH PASSWORD 'new_secure_password';
   ```
2. Update `DATABASE_URL` in `.env`.
3. Restart API containers and verify connection pool via `.\scripts\health-check.ps1`.
