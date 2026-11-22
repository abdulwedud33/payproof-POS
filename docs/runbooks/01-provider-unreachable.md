# Runbook 01: Provider Unreachable or Slow Response

**Severity:** P2 (High)  
**Applies to:** Telebirr, CBE Birr receipt verification endpoints  
**Target Resolution Time:** < 15 minutes  

---

## 1. Symptoms & Alert Triggers
- Cashiers reporting mobile-money verification hanging in `Waiting` state (> 12 seconds).
- System alerts: `PROVIDER_UNREACHABLE`, `SAFE_FETCH_TIMEOUT`, or sudden surge in `VERIFICATION_SLOW`.
- Cashier tablet displays the countdown timer reaching 0 and transitioning to "Waiting for provider confirmation... Re-check / Owner Override".

---

## 2. Immediate Cashier Actions (Counter Operations)
1. **Cash Sales Unaffected**: Instruct cashiers that cash sales operate 100% locally and are completely unaffected by external network or provider status.
2. **Customer Re-Check**:
   - Customer keeps receipt on their phone screen.
   - Cashier clicks **"Re-check (3s)"** up to 2 times to allow provider propagation.
3. **Owner PIN Override** (If queue builds or customer must leave):
   - Branch manager or owner enters their 4-6 digit numeric PIN on the cashier terminal.
   - Select reason: `PROVIDER_DOWN_VERIFIED_ON_PHONE` or `MANAGER_DISCRETION`.
   - Sale completes immediately as `paid` with `manual_override` recorded in the immutable audit log.

---

## 3. Engineering Diagnosis & Resolution Steps
1. **Check Provider Health**:
   - Test outgoing connectivity from the server:
     ```powershell
     # Probe mock or real provider health
     curl -I -m 5 https://mock.provider.local/health
     ```
2. **Inspect Verification Service Logs**:
   ```bash
   docker compose logs --tail=100 -f verification
   ```
   - Look for DNS resolution failures, connection timeouts (`connect_timeout`), or SSL handshake issues.
3. **Determine Scope of Outage**:
   - If Telebirr is down but CBE Birr is responding, notify cashiers to request CBE Birr or cash payments.
   - If internal DNS is failing, restart local Docker DNS:
     ```powershell
     docker compose restart verification
     ```
4. **Post-Incident Review**:
   - Review pending verifications in `apps/owner-web` under "Fraud Alerts & Verifications".
   - Confirm all manual overrides matched customer transaction references once the provider recovered.
