# 09 · ASTU Senior Project Summary & Thesis Reference

**University:** Adama Science and Technology University (ASTU)  
**School:** School of Electrical Engineering & Computing  
**Department:** Computer Science and Engineering (CSE)  
**Project Title:** PayProof POS: A Multi-Branch Supermarket Point-of-Sale System with Real-Time Mobile-Money Payment Verification and Fraud Defense  
**Academic Year:** 2026 / 2027  
**Degree:** Bachelor of Science (BSc) in Computer Science and Engineering  

---

## 1. Project Background & Problem Statement

In Ethiopia, mobile money adoption—led by **Telebirr** (Ethio Telecom) and **CBE Birr** (Commercial Bank of Ethiopia)—has grown rapidly across retail businesses. In high-volume supermarket environments, cashiers face intense line pressure during checkout. To verify mobile money payments, cashiers currently rely on visually inspecting SMS messages or digital transaction confirmations on customer smartphone screens.

This manual verification model suffers from severe systemic vulnerabilities:
1. **SMS & Screenshot Forgery**: Fraudulent customers present edited screenshots, mock payment apps, or spoofed SMS alerts mimicking official provider receipts.
2. **Duplicate Presentation (Double-Spending)**: A single genuine payment receipt is displayed repeatedly to different cashiers or across multiple checkout lanes.
3. **Mismatched Receivers**: Payments are sent to personal accounts, unauthorized third parties, or incorrect merchant codes rather than the supermarket's verified branch account.
4. **Underpayment शॉर्टफॉल**: Customers transfer less than the total cart balance, exploiting busy cashiers who scan the transaction quickly without verifying the exact Santim amount.

**PayProof POS** solves this problem by enforcing a zero-trust verification principle: **the provider record is the sole source of truth**.

---

## 2. Department Rules Compliance & Prior Work Comparison

ASTU CSE senior project guidelines require:
1. **Software as the Primary Component**: PayProof POS is a full-stack, enterprise-grade distributed system consisting of a TypeScript API, Python verification service, PostgreSQL database with RLS, Next.js static dashboard, and React Native mobile terminal.
2. **Novelty & Comparison with Past Projects**:
   - *Past Project Comparison*: The closest prior ASTU CSE project is the *Real Time Stock Management System*. While that system focused on basic inventory counting and database CRUD, it did not address retail checkout flows, mobile-money verification, multi-branch isolation, network security, or fraud prevention.
   - *PayProof POS Distinction*: PayProof POS introduces cryptographic claim atomicity, safe-fetching network defenses with pre-DNS IP validation, pure decision rules for payment Shortfalls/Overpayments, dual-factor account normalization, and offline-resilient SQLite sales outboxes.
3. **Realistic Scope**: Built milestone-by-milestone with comprehensive unit, integration, and security evaluation suites.

---

## 3. System Architecture & Technology Stack

```
                          ┌───────────────────────────┐
                          │   Cashier Tablet Terminal │
                          │   (React Native + SQLite) │
                          └─────────────┬─────────────┘
                                        │ HTTPS / JWT
                                        ▼
┌─────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│   Owner Web Dashboard   │────▶│    Core Application API   │◀────│    PostgreSQL Database    │
│  (Next.js Static Export)│     │     (Node.js Fastify)     │     │   (RLS Policies Forced)   │
└─────────────────────────┘     └─────────────┬─────────────┘     └───────────────────────────┘
                                              │ HTTP / JSON
                                              ▼
                                ┌───────────────────────────┐
                                │   Verification Engine     │
                                │   (Python FastAPI)        │
                                └─────────────┬─────────────┘
                                              │ Egress (Allowlist Only)
                                              ▼
                                ┌───────────────────────────┐
                                │ Official Provider Receipts│
                                │    (Telebirr, CBE Birr)   │
                                └───────────────────────────┘
```

| Component | Technology | Architectural Responsibility |
|---|---|---|
| **Cashier Terminal** | React Native, TypeScript, SQLite | Barcode scanning, offline cart, guidance engine (distance/glare), tri-factor verdict presentation. |
| **Owner Dashboard** | Next.js (Static Export), Tailwind CSS | Multi-branch consolidated reports, fraud prevention journal, and Owner PIN account management. |
| **Core API** | Node.js, Fastify, TypeScript | Idempotent sales creation, atomic payment claims, JWT auth, and rate-limiting. |
| **Verification Service**| Python, FastAPI, httpx | Anti-SSRF safe-fetching, DNS pre-resolution, and evidence extraction from allowlisted provider hosts. |
| **Database** | PostgreSQL 16 | Integer money math in Santim, append-only immutability triggers, and enforced Row-Level Security. |

---

## 4. Key Novel Contributions

1. **Atomic Concurrency Defense**: Under 100 simultaneous concurrent claims of the same payment ID across multiple registers, PostgreSQL primary key constraints guarantee that exactly **1 claim succeeds** and **99 are rejected as already-used** with automatic fraud alerts.
2. **Pre-Connection Anti-SSRF & DNS Filtering**: Before connecting to any receipt URL, the safe-fetcher resolves DNS and filters out loopback (`127.0.0.1`), private RFC 1918 networks, Carrier-Grade NAT (`100.64.0.0/10`), and Cloud Metadata (`169.254.169.254`), preventing server-side request forgery.
3. **Dual-Factor Receiver Matcher**: Normalizes Ethiopian account holder names (stripping PLC, SC, Ato, honorifics, and Unicode accents) combined with masked account number validation. Rejects look-alike accounts with near-match warnings (Levenshtein distance $\le 2$).
4. **Accessible Zero-CLS Verdict UX**: Instant skeleton loading matching final card geometry eliminates layout shift (`CLS = 0`). Verdicts communicate state via Color + Icon + Word simultaneously to ensure WCAG 2.2 accessibility.
5. **Formula Injection Sanitization (CWE-1236)**: Prevents spreadsheet formula execution by automatically neutralizing cells starting with `=, +, -, @, \t, \r` during CSV exports.

---

## 5. Summary of Empirical Evaluation Results

Empirical results from automated evaluation suites:
- **Hostile Link & Anti-SSRF Defense**: 18/18 hostile links blocked (100% rejection of unauthorized hosts, loopbacks, internal IPs, and size bombs).
- **Concurrency & Double-Spend Defense**: 100 simultaneous verification attempts $\rightarrow$ exactly 1 claim granted, 99 rejected with security alerts.
- **Decision Engine Correctness**: 10/10 standard decision scenarios passed (exact match, shortfall rejection, overpayment recording, duplicate rejection, wrong receiver).
- **Security Matrix**: 0 secret leaks detected across repositories and bundles; 100% pass on cross-branch and cross-tenant RLS isolation tests.
- **Performance Budget**: Cashier cart operation response time < 75 ms (well below 300 ms budget); static dashboard initial export bundle < 105 KB.
