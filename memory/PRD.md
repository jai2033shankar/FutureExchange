# E4N - Exchange for Necessities | Product Requirements

## Problem Statement
Build a deterministic, tokenized, instant-settlement, multi-asset exchange for essential goods and services. Focus on carbon credits, sustainable finance, multi-currency execution, PINNs, and sovereign-grade compliance.

## Architecture
- **Frontend**: React 18 + Shadcn/UI + Recharts + Framer Motion + Glassmorphism CSS (20 pages)
- **Backend**: FastAPI (9 modules, 95+ endpoints) + Motor (async MongoDB) + JWT auth
- **Database**: MongoDB (30+ collections)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

## All Features (DONE)
1. JWT Auth (Retail/Institutional/Regulator roles)
2. Asset Trading (RICE, WHEAT, KWH, H2O, CARBON, USD) with order matching
3. Carbon Credits MRV lifecycle
4. Real-time WebSocket price feeds & Candlestick charts
5. 12-Step Interactive Demo & 3D Landing Page
6. Institutional Hardening (Sybil, Volatility Breakers, Insurance)
7. Blockchain Explorer (simulated L2)
8. Smart Contracts, DAO Governance
9. AI Chat (GPT-5.2)
10. Region-based Compliance (EU, US, APAC, AFRICA, LATAM)
11. Kalshi/Polymarket Prediction Markets (13 markets, 5 categories, AMM)
12. PINN Deterministic Models (4 models, 5 assets)
13. Multi-language i18n (EN, ES, FR, ZH, HI, AR — 155+ keys)
14. **IoT Warehouse Tokenization Deep** (Token lifecycle, Inventory mgmt, Alerts, Compliance, Analytics)
15. **EVM Bridge & Contracts** (4 chains, Cross-chain transfers, Gas oracle, 5 contract templates, Deployment)

## Test Credentials
| Email | Password | Role |
|---|---|---|
| retail_user_1@e4n.com | Test@123 | retail |
| inst_buyer_1@e4n.com | Test@123 | institutional |
| farmer_1@e4n.com | Test@123 | retail |
| regulator_1@e4n.com | Admin@123 | regulator |

## Mocked/Simulated
- ZK-Identity, Blockchain execution, Chainlink Oracles, Email notifications
- PINN models (Ornstein-Uhlenbeck simulation)
- EVM Bridge (no real L1/L2 connection), Gas oracle, Contract deployment
- Warehouse sensor readings

## Backlog
- P3: Production EVM integration (Arbitrum/Avalanche real connection)
- P3: Mobile app (React Native)
- P3: Real-time WebSocket order book
- P3: Carbon credit NFT certificates
