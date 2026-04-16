# E4N — Exchange for Necessities: Product Requirements Document

## Original Problem Statement
Build a sovereign-grade, deterministic, tokenized, instant-settlement, multi-asset exchange for essential goods and services, with focus on carbon credits exchange for sustainable finance. Glass morphism UI, mobile responsive, compliance-driven experience with institutional hardening.

## Architecture
- **Backend**: FastAPI (Python) — 5 modules, 65+ endpoints
- **Frontend**: React 19 — 17 pages, glassmorphism dark theme
- **Database**: MongoDB — 25+ collections
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT + MFA + RBAC (retail, institutional, regulator)
- **Storage**: Emergent Object Storage for KYC documents

## User Personas
1. **Retail Trader** — Individual traders buying/selling commodities and carbon credits
2. **Institutional Buyer** — Companies/funds executing large-scale trades via RFQ dark pool
3. **Regulator** — Compliance officers verifying credits, monitoring SAR reports, approving KYC
4. **Producer/Farmer** — Suppliers of commodities, borrowers of pre-harvest loans

## Core Modules (All Implemented)

### Module 1: Core Trading (server.py) — 29 endpoints
- JWT auth with 3 roles + MFA
- Trading engine: limit, market, stop-loss, conditional, basket orders
- Order matching engine with atomic DvP settlement
- Carbon credits full MRV lifecycle (issue → verify → exchange → retire)
- Region-based compliance (EU, US, APAC, AFRICA, LATAM)
- Portfolio, wallet, risk scoring
- Prediction markets with betting
- AI assistant (GPT-5.2)
- Admin/regulator dashboard

### Module 2: Enhanced Features (features.py) — 18 endpoints
- WebSocket real-time price updates (3s broadcast)
- Candlestick OHLCV with technical indicators (SMA, EMA, RSI, MACD, Bollinger)
- KYC document upload (Emergent Object Storage)
- In-app notification system
- Carbon offset calculator
- PDF certificate generation (fpdf2)
- CSV/PDF report exports
- MFA (TOTP via pyotp)
- Email notification simulation (11 templates)

### Module 3: Blockchain & Governance (blockchain.py) — 14 endpoints
- Blockchain simulation: merkle trees, PoA mining, difficulty scaling
- Gas oracle (slow/standard/fast/instant), mempool, 5 validators
- Smart contracts: escrow, token swap, carbon retirement, DvP settlement
- DAO governance: proposals, voting, quorum
- IoT warehouse tokenization with sensor simulation

### Module 4: Market Guards & Contracts (contracts.py) — 15 endpoints
- ConcentrationGuard: 5% cap, 2% hoarding tax, whale alerts
- CreditEngine: pre-harvest loans, reputation-linked rates, auto-repayment
- QualityOracle: multi-parametric proofs, HSM verification, grade haircuts
- BulkTradeEngine: RFQ dark pool (>$500K), slippage circuit breaker (2%)
- ESGTracker: logistics carbon footprint (road/rail/sea/air)
- CBDCBridge: sovereign signature settlement
- SMSGateway: offline emergency buy orders
- DisputeManager: force majeure, tri-party arbitration
- E2E demo script: 16 scenarios at 100%

### Module 5: Institutional Hardening (hardening.py) — 16 endpoints
- ZK-Identity sybil-resistant concentration guard
- Dynamic volatility breakers (3%/7%/15% asset-class tiered)
- Decentralized oracle bridge (2-of-3 multi-sig, Chainlink simulation)
- Sovereign insurance treasury (0.5% stability fee seigniorage)
- Secondary debt markets (transferable at reputation >= 80)
- SAR auto-generation (wash trading detection)
- Logistics custody handover (HSM transporter signatures)

## Seeded Scenarios (16)
1. Retail Login
2. Institutional Login
3. Market Data (6 assets)
4. Portfolio Check
5. Limit Order
6. Carbon Credit Issuance
7. Compliance Check (5 regions)
8. Prediction Markets
9. Blockchain Mining (merkle root)
10. Carbon Calculator
11. Concentration Guard
12. **Hoarding Blocked** (15% RICE → cap at 5%)
13. **Quality Haircut** (Grade C wheat → 20% reduction)
14. **Pre-Harvest Finance** (reputation-linked loan)
15. **Sybil Attack Blocked** (3 wallets, same ZK-ID → blocked at 6%)
16. **Oracle Conflict** (IoT=A vs Auditor=B → auto-dispute)

## Test Results (6 Iterations)
- Backend: 98.5% (64/65 endpoints passing)
- Frontend: 95% (all pages rendering, all flows functional)
- Overall: 97%

## Test Credentials
See /app/memory/test_credentials.md
