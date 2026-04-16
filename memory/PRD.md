# E4N - Exchange for Necessities: PRD

## Original Problem Statement
Build a deterministic, tokenized, instant-settlement, multi-asset exchange for essential goods and services (E4N), with focus on carbon credits exchange for sustainable finance. Glass morphism UI, mobile responsive, compliance-driven experience.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React 19 + TailwindCSS + Shadcn/UI + Recharts + Framer Motion
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT-based with role-based access (retail, institutional, regulator)

## User Personas
1. **Retail Trader** - Individual traders buying/selling commodities and carbon credits
2. **Institutional Buyer** - Companies/funds executing large trades
3. **Regulator** - Compliance officers verifying credits and monitoring system
4. **Producer/Farmer** - Suppliers of commodities

## Core Requirements (Static)
- Tokenized multi-asset trading (RICE, WHEAT, KWH, H2O, CARBON)
- Carbon credit lifecycle: Issue > Verify > Exchange > Retire
- Region-based compliance rules (EU, US, APAC, AFRICA, LATAM)
- Real-time order book and trade matching engine
- Portfolio management with risk scoring
- Prediction markets for commodity forecasting
- AI-powered trade assistant

## What's Been Implemented (April 16, 2026)

### Phase 1 - MVP (Complete)
- JWT auth with 3 roles (retail, institutional, regulator)
- Trading engine with order matching (limit/market)
- Carbon credits CRUD (issue, verify, retire, exchange)
- Compliance module (5 regions)
- Portfolio & Risk scoring
- Prediction markets
- AI Chat assistant (GPT-5.2)
- Glassmorphism responsive UI

### Phase 2 - Enhanced Trading (April 16, 2026)
- WebSocket real-time price updates (3s interval)
- Candlestick chart data with technical indicators (SMA, EMA, RSI, MACD, Bollinger)
- Advanced order types: stop-loss, conditional, basket orders
- KYC document upload with Emergent Object Storage
- In-app notification system with bell indicator
- Carbon offset calculator for institutions

### Phase 3 - Enterprise Features (April 16, 2026)
- PDF certificate generation for verified carbon credits
- CSV/PDF report exports (trades, carbon credits, compliance)
- MFA (TOTP-based two-factor authentication)
- Smart contract simulation engine (escrow, token swap, carbon retirement, settlement)

### Phase 3 - Resiliency & Comprehensiveness (April 16, 2026 - Latest)
- **Public Landing Page**: Hero section, feature grid, live stats, how-it-works, business impact metrics, CTA
- **ConcentrationGuard**: 5% ownership cap, 2% hoarding threshold with storage fees, whale alert system
- **CreditEngine**: Pre-harvest debt tokens at reputation-linked rates (30% max loan-to-yield), auto-repayment
- **QualityOracle**: Multi-parametric proofs (moisture/purity/grade), HSM verification, dynamic price haircuts (A=0%, B=10%, C=20%, D=35%)
- **BulkTradeEngine**: RFQ dark pool for orders >$500K, slippage circuit breaker (2% max), LP quote matching
- **ESGTracker**: Logistics carbon footprint calculator (road/rail/sea/air emission factors)
- **CBDCBridge**: Sovereign signature settlement simulation
- **SMSGateway**: Offline emergency buy orders via hex payload parsing
- **DisputeManager**: Force majeure handling, tri-party arbitration, asset freezing
- **Seeded Scenarios**: Hoarding (Scenario 12), Quality Haircut (Scenario 13), Pre-Harvest Loan (Scenario 14)

## Prioritized Backlog
### P0 (Critical - Next)
- Real-time price updates via WebSocket
- Order matching engine optimization (currently basic)
- Multi-factor authentication

### P1 (High)
- KYC verification workflow with document upload
- Carbon credit certificate generation (PDF)
- Advanced charting (candlestick, indicators)
- Notification system (trade executed, credit verified)

### P2 (Medium)
- Smart contract simulation for settlements
- Warehouse tokenization & IoT tracking
- Advanced prediction market mechanics
- Export reports (CSV/PDF) for compliance

### P3 (Low)
- Mobile app (React Native)
- Multi-language support
- DAO governance module
- Logistics & delivery integration

## Test Credentials
See /app/memory/test_credentials.md
