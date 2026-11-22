# Runbook 03: Compromised or Lost Cashier Device

**Severity:** P2 (High)  
**Applies to:** Cashier Android tablet, offline SQLite cache, active session tokens  
**Target Resolution Time:** < 5 minutes

---

## 1. Immediate Owner Action (From Owner Web Dashboard)

1. **Log in to Owner Dashboard**: Navigate to **Branches & Cashiers** tab.
2. **Locate Cashier Account**: Find the cashier assigned to the compromised tablet (e.g. `tigist.h`).
3. **Deactivate Cashier Immediately**:
   - Click "Deactivate".
   - The cashier's refresh token and active sessions are revoked instantly in the database (`active = false`).
   - Any API requests bearing the revoked cashier ID will receive `403 Forbidden` (`INACTIVE_USER`).

---

## 2. Terminal Security Analysis

- **Are credentials stored on the phone?**:
  - The SQLite database on the cashier tablet caches only product catalogs and pending offline sales.
  - **No payment provider secrets, API master keys, or owner PINs are ever stored on the cashier tablet** (`SECURITY.md` Rule S1).
  - Terminal login PINs are hashed with Argon2id on the server.
- **Can the finder fabricate payments?**:
  - No. Mobile-money sales require real-time provider fetch and server-side atomic claiming. A captured device cannot approve sales without backend consensus.

---

## 3. Issuing Replacement Tablet

1. Register replacement cashier credentials in the Owner Dashboard with a new 4-6 digit login PIN.
2. Install PayProof POS APK on replacement tablet.
3. Cashier logs in with new credentials; the catalog syncs automatically within 300ms.
4. Mark the incident resolved in the Owner Dashboard **Alerts** journal with audit notes.
