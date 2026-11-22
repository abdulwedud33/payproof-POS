# PayProof POS · Live Demonstration Script

**Audience:** ASTU CSE Examination Committee, Faculty Advisors, Trial Store Owners  
**Duration:** ~8 to 10 minutes  
**Goal:** Prove checkout speed, fraud defense, multi-branch management, and offline resilience live.

---

## Preparation (2 minutes before presentation)
1. **Start the Stack**:
   ```powershell
   docker compose up -d
   ```
2. **Launch Services**:
   - Terminal 1 (API): `pnpm --filter @payproof/api dev`
   - Terminal 2 (Owner Web): `pnpm --filter @payproof/owner-web start` (or serve `apps/owner-web/out`)
   - Terminal 3 (Mock Provider): `pnpm --filter @payproof/mock-provider start`
3. **Open Browser**:
   - Owner Web: `http://localhost:3000` (or `http://localhost:3001`)
   - Mock Provider: `http://localhost:8080`

---

## Act 1: Multi-Branch Supermarket Overview (1.5 mins)
1. Open Owner Web Dashboard.
2. Point out the **"Protected this week"** banner (`38,250.00 ETB across 14 suspicious attempts`).
3. Click the **Multi-Branch Selector** in the header:
   - Switch from `All Branches (Consolidated)` to `Bole Branch`, then `Piassa Branch`.
   - Show how summary cards, sales journal, and cashier activity update dynamically.
4. Open the **Reports & Trends** tab:
   - Point out the **Cash vs. Mobile Money ratio bar** (e.g. 52% Cash, 48% Mobile Money).
   - Show breakdown by Branch, Cashier, and Hour.
   - Click **"Export CSV (Sanitized)"** and explain how formula injection (CWE-1236) is prevented.

---

## Act 2: Cash Checkout & Offline Resilience (2 mins)
1. In the Cashier App (or test runner):
   - Add items to cart: *Magna Teff 1kg* (125.00 ETB), *Shiro Powder 500g* (160.00 ETB).
   - Show instant running total: **285.00 ETB** (28,500 Santim).
   - Enter cash received: **300.00 ETB** $\rightarrow$ change calculated instantly: **15.00 ETB**.
   - Complete sale $\rightarrow$ transaction commits in milliseconds.
2. Demonstrate Offline Handling:
   - Disconnect network / toggle Airplane Mode.
   - Complete another cash sale $\rightarrow$ sale stores safely in SQLite offline outbox.
   - Reconnect network $\rightarrow$ outbox syncs automatically with zero duplicate records.

---

## Act 3: Live Mobile-Money Verification (Genuine Payment) (2 mins)
1. Add items totaling **310.00 ETB**.
2. Select **Mobile Money (Telebirr)**:
   - Viewfinder / camera guidance appears with active hints (`HOLD STEADY`, `AVOID GLARE`).
3. Scan genuine mock receipt QR code (`https://mock.provider.local/receipt/telebirr/TXN-TB-982101`):
   - Viewfinder immediately switches to zero-CLS skeleton loader ("Verifying with Telebirr...").
   - Server fetches official provider record, validates receiver against *Bole Branch* account, atomically claims the transaction ID, and marks the sale `paid`.
   - Screen displays accessible **VERIFIED** card with Ledger Green background, Checkmark Icon, and Word.

---

## Act 4: Live Fraud Defense Demonstrations (2.5 mins)

### Scenario A: Duplicate Receipt Presentation (Double-Spending)
1. Start a new checkout for **310.00 ETB**.
2. Present the **same QR code** that was just used in Act 3 (`TXN-TB-982101`).
3. **Result**:
   - The screen immediately shows **REJECTED** in red: *"Payment already used for an earlier sale"*.
   - Switch to Owner Web Dashboard $\rightarrow$ open **Fraud Alerts** tab.
   - Show the newly triggered `DOUBLE_SPEND_ATTEMPT` alert listing branch name, cashier name, and timestamp.

### Scenario B: Mismatched Receiver Payment
1. Scan a QR code where the customer sent money to a wrong account (`TXN-TB-WRONG-RCV`).
2. **Result**:
   - The screen shows **REJECTED**: *"Payment sent to unverified account"*.
   - Show the system refuses to approve the sale because the receiving account does not match the branch's verified merchant registry.

---

## Act 5: Owner Governance & Account Management (1 min)
1. In Owner Dashboard, go to **Saved Accounts** tab.
2. Click **"Register Account"**:
   - Enter a new Telebirr account number and name.
   - Try to submit without PIN $\rightarrow$ rejected.
   - Enter correct Owner PIN (`1234` or `9999`) $\rightarrow$ account is registered with AES-256-GCM encryption at rest.
3. Conclude with summary of university contributions and safety numbers.
