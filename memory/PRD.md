# E4N - Exchange for Necessities | Product Requirements

## Problem Statement
Build a deterministic, tokenized, instant-settlement, multi-asset exchange for essential goods and services. Focus on carbon credits, sustainable finance, multi-currency execution, PINNs (Physics-Informed Neural Networks), and sovereign-grade compliance.

## Architecture
- **Frontend**: React 18 + Shadcn/UI + Recharts + Framer Motion + Glassmorphism CSS
- **Backend**: FastAPI (7 modules) + Motor (async MongoDB) + JWT auth
- **Database**: MongoDB (25+ collections)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

## Core Features (All DONE)
1. JWT Auth with Role-based access (Retail, Institutional, Regulator)
2. Asset Trading (RICE, WHEAT, KWH, H2O, CARBON, USD) with order matching
3. Carbon Credits marketplace (issue, verify, retire, exchange)
4. Real-time WebSocket price feeds & Candlestick charts
5. 12-Step Interactive Demo Mode & 3D Glassmorphism Landing Page
6. Institutional Hardening (Sybil-resistant ZK guards, Volatility Breakers, Insurance Treasury)
7. Blockchain Explorer (simulated Layer 2, mempool, gas oracle)
8. Smart Contracts, DAO Governance, IoT Warehouse pages
9. AI Chat panel (GPT-5.2)
10. Region-based Compliance (EU, US, APAC, AFRICA, LATAM)
11. **Kalshi/Polymarket-style Prediction Markets** (13 seeded markets, 5 categories, AMM pricing, position P&L)
12. **PINN Deterministic Models** (Mean-Reversion, Supply-Demand Equilibrium, Vol Surface, Carbon Forecaster)
13. **Multi-language i18n** (EN, ES, FR, ZH, HI, AR — 155 keys x 6 languages, sidebar + settings translated)
14. **Comprehensive README** (1138 lines, Mermaid diagrams, 80+ endpoints, 14 value agents)

## Key Endpoints (80+)
- Auth: POST /api/auth/login, /register, /logout, GET /me
- Assets: GET /api/assets, /assets/{symbol}/price-history
- Orders: POST /api/orders, GET /api/orders
- Predictions: GET /api/markets, /markets/stats, /markets/categories, POST /api/markets/trade
- PINN: GET /api/pinn/models, /pinn/forecast/{asset}, /pinn/equilibrium/{asset}, /pinn/volatility-surface/{asset}, /pinn/carbon-forecast
- Hardening: ZK-identity, volatility breakers, oracle bridge, insurance, SAR
- Blockchain: blocks, transactions, mempool, gas oracle, smart contracts, governance

## Test Credentials
| Email | Password | Role |
|---|---|---|
| retail_user_1@e4n.com | Test@123 | retail |
| inst_buyer_1@e4n.com | Test@123 | institutional |
| farmer_1@e4n.com | Test@123 | retail |
| regulator_1@e4n.com | Admin@123 | regulator |

## Mocked/Simulated
- ZK-Identity verification
- Blockchain execution (Layer 2 simulated)
- Chainlink Oracles
- Email notifications
- PINN models (Ornstein-Uhlenbeck mathematical simulation)

## Backlog
- P2: IoT Warehouse tokenization frontend depth
- P2: Production EVM integration (Arbitrum/Avalanche)
- P3: Mobile app (React Native)
- P3: Real-time WebSocket order book
