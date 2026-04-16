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
### Backend APIs (29 endpoints)
- Auth: register, login, logout, me, refresh
- Assets: list, detail, price history
- Orders: create, list, cancel, order book
- Trades: user trades, recent trades
- Carbon Credits: CRUD, verify, retire, exchange, stats
- Compliance: regions, rules, user status
- Dashboard: stats, market data
- Risk: user score, market risk
- Predictions: list, place bet
- AI Chat: send message, history
- Admin: users, trades, reports, compliance approval

### Frontend Pages
- Auth page (login/register with demo accounts)
- Dashboard (stats, charts, market overview, recent trades)
- Trading (asset selector, price chart, order book, order form)
- Carbon Credits (stats, region/type charts, CRUD table, exchange)
- Portfolio (total value, allocation, risk score, holdings)
- Compliance (user status, region-based rules with severity)
- Predictions (market cards with probability bars, betting)
- Admin/Regulator Dashboard (system overview, pending verifications)
- AI Chat assistant (slide-out panel)

### Seed Data
- 4 users (retail, institutional, farmer, regulator)
- 6 assets with 90-day price history
- 50 sample trades
- 6 carbon credit projects
- 5 compliance regions
- 4 prediction markets

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
