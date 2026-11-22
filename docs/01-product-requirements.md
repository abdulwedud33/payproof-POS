# 01 · Product Requirements Document

|             |                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Product** | PayProof POS (working name)                                                                                                   |
| **Version** | 0.1 draft, 24 Oct 2026                                                                                                        |
| **Status**  | Awaiting review                                                                                                               |
| **Related** | [Technical requirements](02-technical-requirements.md) · [App flow](03-app-flow.md) · [Design brief](04-uiux-design-brief.md) |

---

## 1. Summary

PayProof POS is a point-of-sale system for supermarkets with one or many branches. Cashiers scan products to build a cart. For mobile-money payments (Telebirr, CBE, and similar), the cashier scans the payment QR on the customer's receipt. The system fetches the transaction record from the provider's official receipt page, checks that the receiver is one of the branch's saved accounts, that the amount covers the total, and that the payment was never used before, and only then completes the sale. Owners manage branches and cashiers and get dashboards for sales, income, and fraud.

## 2. Problem

**What goes wrong today**

- A customer shows a payment screenshot. The cashier decides by eye whether it is real.
- Screenshots can be edited (amount, name, date), reused for a second purchase, or shown for a payment that never arrived.
- Small shops cannot get official bank or Telebirr API access, so there is no automatic check. (The receipt's QR code may still lead to a public receipt page, which is what this project relies on. See Assumption A1.)
- Owners with several branches cannot see what each branch and each cashier is doing, or where money is leaking.

**Who is affected**

| Who             | Pain                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| Owner           | Lost revenue, no visibility across branches, trust issues with staff       |
| Cashier         | Pressure to judge receipts under a queue, blamed when a fake slips through |
| Honest customer | Slow checkout, suspicion when the receipt is real                          |

## 3. Goals and non-goals

### Goals

1. Let a cashier complete a mobile-money sale only after the payment is verified.
2. Catch edited, reused, wrong-receiver, and never-arrived payments without needing bank API access, by reading the provider's own receipt page.
3. Give the owner one place to manage branches, cashiers, products, and see every sale.
4. Keep checkout fast. Verification must feel like part of the sale, not an extra chore.
5. Keep working when the internet is slow or drops.

### Non-goals (v1)

- Direct integration with banks or Telebirr APIs.
- Full inventory, supplier, and purchasing management.
- Receipt printers, cash drawers, and barcode scanner hardware (the phone camera is the scanner).
- Customer accounts, loyalty points, or online ordering.
- Tax and accounting submissions.
- Refunds of mobile-money payments back to the customer (we record a void; the money movement happens outside the app).

### Stretch (only if time allows)

- Per-branch stock levels and low-stock alerts
- iOS cashier app
- Amharic and Afaan Oromo interface
- Ethiopian calendar option in reports
- Branch manager role

## 4. Users

### Owner: "Meseret", runs three supermarkets

- Works from a laptop and a phone, mostly away from the shop.
- Wants a daily answer to: how much did we sell, where, and did anything look wrong?
- Adds and removes cashiers as staff change.

### Cashier: "Dawit", works the counter at one branch

- Uses a mid-range Android phone, often with one hand, in a noisy, bright shop.
- Serves a queue. Every extra tap costs time.
- Needs a clear answer: take the money or don't.

### Customer (indirect)

- Pays by Telebirr or CBE and shows a receipt.
- Never uses the app, but feels its speed.

## 5. Success metrics

Targets are starting points. They will be measured in the evaluation plan ([EVALS.md](agent/EVALS.md)) and revised with real data.

| Metric                                                                | Target                                 |
| --------------------------------------------------------------------- | -------------------------------------- |
| Fake, edited, wrong-receiver, or never-paid receipts wrongly accepted | 0 in our test set                      |
| Genuine receipts wrongly rejected                                     | ≤ 3%                                   |
| Reused transaction IDs accepted                                       | 0, including under concurrent attempts |
| Cashier completes a 3-item mobile-money sale                          | ≤ 60 seconds, median                   |
| Verification time after QR scan                                       | ≤ 5 seconds, 95th percentile (online)  |
| Offline sales lost after reconnecting                                 | 0                                      |
| Cashier tasks completed by new users without help                     | ≥ 8 of 10 in a usability test          |

## 6. Functional requirements

Priority: **M** = must, **S** = should, **C** = could.

### 6.1 Accounts and access

| ID   | Requirement                                                                                                                                 | Pri |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-1 | An owner can register a business account.                                                                                                   | M   |
| FR-2 | An owner can create, edit, suspend, and delete cashier accounts. Deleting a cashier who has sales deactivates them and keeps their history. | M   |
| FR-3 | An owner can create, edit, and close branches.                                                                                              | M   |
| FR-4 | An owner can assign a cashier to a branch. A cashier can only sell at their assigned branch.                                                | M   |
| FR-5 | Cashiers sign in with phone number and password, then use a short PIN to unlock the app during the day.                                     | M   |
| FR-6 | Owners can reset a cashier's password or PIN.                                                                                               | M   |
| FR-7 | A branch manager role with branch-limited permissions.                                                                                      | C   |

### 6.2 Products

| ID    | Requirement                                                                                                                             | Pri |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-8  | An owner can add, edit, and deactivate products with name, price, unit, and one or more barcodes.                                       | M   |
| FR-9  | An owner can import products from a CSV file.                                                                                           | S   |
| FR-10 | Products can be sold by piece or by weight or volume (for example watermelon by kg). The cashier enters the quantity for weighed items. | M   |
| FR-11 | Prices can be overridden per branch.                                                                                                    | C   |
| FR-12 | A cashier can search products by name when a barcode will not scan.                                                                     | M   |
| FR-13 | Scanning an unknown barcode lets the owner (not the cashier) add it.                                                                    | S   |

### 6.3 Sales

| ID    | Requirement                                                                                    | Pri |
| ----- | ---------------------------------------------------------------------------------------------- | --- |
| FR-14 | A cashier scans an item and it is added to the cart. Scanning it again increases the quantity. | M   |
| FR-15 | The cashier can change quantity, remove a line, or clear the cart.                             | M   |
| FR-16 | The app shows the running total in Birr at all times.                                          | M   |
| FR-17 | The cashier chooses a payment method: cash or mobile money.                                    | M   |
| FR-18 | A completed sale is immutable. Corrections happen through a logged void.                       | M   |
| FR-19 | Voids require a reason, and above a limit set by the owner, an owner PIN.                      | S   |

### 6.4 Payment verification (core)

| ID    | Requirement                                                                                                                                                                                                                                                  | Pri |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-20 | An owner saves each branch's receiving payment account or accounts: provider, account holder name, and account or phone number.                                                                                                                              | M   |
| FR-21 | For a mobile-money sale, the cashier scans the payment QR code on the customer's receipt or payment screen.                                                                                                                                                  | M   |
| FR-22 | The system accepts a QR link only if it uses HTTPS and points to a provider's official receipt address on an allowlist. The system fetches the record itself and never trusts what the customer's phone displays.                                            | M   |
| FR-23 | The system reads the transaction ID, amount, time, status, and receiver from the provider record, and stores these fields as evidence.                                                                                                                       | M   |
| FR-24 | The receiver on the provider record must match one of the branch's saved accounts. Otherwise the payment is rejected as "wrong receiver".                                                                                                                    | M   |
| FR-25 | The payment status must be successful, the amount must cover the cart total, and the payment time must fall inside an allowed window before the sale. A shortfall is rejected with the amount shown. An overpayment is accepted and the difference recorded. | M   |
| FR-26 | A transaction ID can be used once across the whole business. Reuse is rejected, even from another branch.                                                                                                                                                    | M   |
| FR-27 | If the provider record cannot be reached yet, or is still pending, the sale shows Waiting, retries automatically, and lets the cashier re-scan or ask for an owner override.                                                                                 | M   |
| FR-28 | If the QR is missing or unreadable, the cashier can re-scan, or enter the payment ID by hand where the provider supports lookup by ID (confirmed in Milestone 0).                                                                                            | S   |
| FR-29 | When verification cannot finish, an owner can approve a manual override with a PIN and a reason. Every override raises an alert.                                                                                                                             | S   |

### 6.5 Backup evidence (optional)

| ID    | Requirement                                                                                                                                                                               | Pri |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-30 | A companion app on the branch phone reads incoming payment SMS from known providers and sends the parsed details to the server securely.                                                  | C   |
| FR-31 | Each branch phone is registered to its branch by the owner and can be revoked.                                                                                                            | C   |
| FR-32 | SMS cross-checks and receipt-image analysis (OCR and edit detection) may add warnings or alerts, and may help when a provider page is unreachable. They never verify a sale on their own. | C   |

### 6.6 Owner dashboard

| ID    | Requirement                                                                             | Pri |
| ----- | --------------------------------------------------------------------------------------- | --- |
| FR-33 | Totals for sales count, items sold, and income, for today, this week, and this month.   | M   |
| FR-34 | Filter and compare by branch, cashier, product, and payment method.                     | M   |
| FR-35 | List of products sold with quantities and revenue.                                      | M   |
| FR-36 | Fraud alerts: rejected receipts, reused IDs, overrides, unusual void rates per cashier. | M   |
| FR-37 | Export a report to CSV.                                                                 | S   |
| FR-38 | Daily summary of each branch's takings, split by cash and mobile money.                 | S   |
| FR-39 | Stock levels per branch.                                                                | C   |

### 6.7 Offline and sync

| ID    | Requirement                                                                                                | Pri |
| ----- | ---------------------------------------------------------------------------------------------------------- | --- |
| FR-40 | The cashier app keeps the product catalog on the device and can build carts and record cash sales offline. | M   |
| FR-41 | Mobile-money sales made offline are saved as Waiting and verified automatically when connection returns.   | M   |
| FR-42 | Syncing the same sale twice never creates a duplicate.                                                     | M   |

### 6.8 Audit

| ID    | Requirement                                                                                                          | Pri |
| ----- | -------------------------------------------------------------------------------------------------------------------- | --- |
| FR-43 | Logins, sales, voids, overrides, and account changes are written to an audit log that cannot be edited from the app. | M   |

### 6.9 Experience, speed, and safety behaviors

| ID    | Requirement                                                                                                                                           | Pri |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-44 | Every screen that loads data shows a skeleton that matches its final layout. No spinners where the layout is known.                                   | M   |
| FR-45 | Every tap gives instant visible feedback (pressed state, label change, or screen change), even when the real work takes longer.                       | M   |
| FR-46 | The cashier app updates the cart and local state optimistically. A money verdict is never shown as Verified before the server decides.                | M   |
| FR-47 | During onboarding, buttons and fields never move or resize as content loads or messages appear.                                                       | M   |
| FR-48 | Users never see backend errors. They see a plain message and, when useful, a short reference ID.                                                      | M   |
| FR-49 | Smart defaults pre-fill fields wherever a sensible value exists (for example the cashier's branch, the last payment account, a standard time window). | S   |
| FR-50 | Owner setup shows visible progress (for example "3 of 6 steps done") and what comes next.                                                             | S   |
| FR-51 | Every API is rate-limited, every table has row-level security, and all input is validated on the server.                                              | M   |
| FR-52 | The owner web app is a static site. Responses are compressed.                                                                                         | M   |

## 7. Non-functional requirements

| Area              | Requirement                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Speed**         | Scan to cart under 300 ms on the device. Every tap gives visible feedback in under 100 ms, even when the real work takes longer. Compressed responses, static web hosting, and skeleton loaders instead of spinners. See [TRD speed rules](02-technical-requirements.md).                                                     |
| **Reliability**   | No lost sales. A sale made offline survives app restarts and phone reboots.                                                                                                                                                                                                                                                   |
| **Security**      | No secrets in the apps or web bundle. Users reach only authorized data. Rules enforced on the server and in the database, with row-level security on every table. All input validated. Rate limiting on every API. Users never see backend errors. Encrypted in transit, passwords hashed. See [SECURITY.md](../SECURITY.md). |
| **Privacy**       | Collect only what verification needs. Mask the payer's name and phone number. Store the provider record's key fields, not the whole page. Any stored images or page copies are deleted after the retention period set in [GUARDRAILS.md](agent/GUARDRAILS.md).                                                                |
| **Usability**     | A new cashier can complete a sale after a 5-minute walkthrough. Large touch targets, readable in bright light. Simple, consistent, with a clear visual hierarchy, and applying the UX laws in [DESIGN.md](../DESIGN.md). Nothing moves around on screen during onboarding.                                                    |
| **Accessibility** | Text contrast meets WCAG 2.2 AA. Meaning is never carried by color alone.                                                                                                                                                                                                                                                     |
| **Compatibility** | Android 8 and above, mid-range phones with 3 GB RAM. Web dashboard on current Chrome, Edge, and Firefox.                                                                                                                                                                                                                      |
| **Localization**  | English first. All text lives in translation files so Amharic and Afaan Oromo can be added. Currency is ETB; time zone is Africa/Addis_Ababa.                                                                                                                                                                                 |

## 8. Assumptions

| ID     | Assumption                                                                                                                                                                                            | If it is false                                                                                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** | The payment QR on a Telebirr or CBE receipt links to an official provider receipt page that our server can fetch and read, and the page shows the transaction ID, amount, time, status, and receiver. | The design falls back to the layered version: receiver and amount from the receipt image, plus the SMS companion as proof the money arrived. The SMS companion and image analysis move from optional to required. |
| A2     | Each branch has one or more receiving accounts the owner can enter.                                                                                                                                   | Branches share one account and matching is by branch rules instead.                                                                                                                                               |
| A3     | We can collect real sample receipts.                                                                                                                                                                  | Use synthetic receipts and a mock provider server for development.                                                                                                                                                |
| A4     | Fetching a provider's public receipt page for verification is acceptable under the provider's terms.                                                                                                  | Ask the provider or advisor, and narrow what is fetched.                                                                                                                                                          |
| A5     | Provider page layouts can change. Parsers are configuration, not hard-coded logic.                                                                                                                    |                                                                                                                                                                                                                   |

**A1 is the single biggest assumption.** Milestone 0 tests it first, with real receipts, before verification code is written.

## 9. Risks

| Risk                                                                | Impact | Mitigation                                                                                                            |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| **A1 is false** (no readable provider page)                         | High   | Check in Milestone 0. A documented fallback design exists (see A1)                                                    |
| Provider page changes layout or blocks automated access             | High   | Table-driven parsers, caching of key fields, clear Waiting state, owner override                                      |
| Provider page needs a login, captcha, or rate limits requests       | Medium | Respect limits, queue lookups, retry with backoff. Confirm in M0                                                      |
| Fake QR pointing to a lookalike page                                | High   | Strict host allowlist, HTTPS only, no redirects off the allowlist, the server fetches the page                        |
| Server-side fetching of customer-supplied links (SSRF)              | High   | Allowlist, block private addresses, timeouts, size limits, isolated service. See [GUARDRAILS.md](agent/GUARDRAILS.md) |
| Legitimate customer shows a real receipt for someone else's payment | Medium | Receiver match, one-time claim, time window                                                                           |
| Provider page is slow or down                                       | Medium | Waiting state, retries, offline queue, owner override                                                                 |
| Too much scope for the time                                         | High   | Build the QR lookup and decision engine first. SMS, image analysis, stock, and iOS come last                          |
| No access to a real shop for testing                                | Medium | Mock provider server, role-play with classmates, one trial shop                                                       |

## 10. Release plan

| Release                    | Contents                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Prototype (semester 1)** | Proposal, requirements, design, data model, verification feasibility spike, first cashier flow on a single branch |
| **v1 (semester 2)**        | Everything marked Must, plus as many Should items as time allows                                                  |
| **v1.1**                   | Stretch items                                                                                                     |

## 11. Open questions

1. **A1:** does the payment QR really link to a readable official page for Telebirr and for CBE? What does that page show? _(Milestone 0, first task)_
2. Which provider hostnames are official and belong on the allowlist?
3. Can a payment be looked up by transaction ID alone, for when the QR is missing?
4. Does each branch use its own receiving account, or does one account serve all branches?
5. What payment time window should be allowed before the sale? _(Proposed: 60 minutes, configurable.)_
6. What void limit requires an owner PIN?
7. Should cash sales be included in v1? _(Proposed: yes, since owners need complete takings.)_
