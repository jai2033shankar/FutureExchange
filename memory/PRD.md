# E4N - Exchange for Necessities | Product Requirements

## Problem Statement
Build a deterministic, tokenized, instant-settlement, multi-asset exchange for essential goods and services.

## Architecture
- **Frontend**: React 18 + Shadcn/UI + Recharts + Framer Motion (21 pages)
- **Backend**: FastAPI (11 modules, 110+ endpoints) + Motor (async MongoDB) + JWT auth
- **Database**: MongoDB (35+ collections)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

## All Features (16 major, ALL DONE)
1. JWT Auth (Retail/Institutional/Regulator)
2. Asset Trading (6 assets) with order matching
3. Carbon Credits MRV lifecycle
4. WebSocket price feeds & Candlestick charts
5. 12-Step Demo & Landing Page
6. Institutional Hardening
7. Blockchain Explorer, Smart Contracts, DAO
8. AI Chat (GPT-5.2)
9. Region-based Compliance (5 regions)
10. Prediction Markets (13 markets, AMM)
11. PINN Models (4 models, 5 assets)
12. i18n (6 languages, 155+ keys)
13. IoT Warehouse Tokenization (6 tabs)
14. EVM Bridge (4 chains, 5 contracts)
15. Portfolio Performance Dashboard (4 tabs)
16. Social Trading Feed (4 tabs, copy-trade)

## Test Credentials
| Email | Password | Role |
|---|---|---|
| retail_user_1@e4n.com | Test@123 | retail |
| inst_buyer_1@e4n.com | Test@123 | institutional |
| farmer_1@e4n.com | Test@123 | retail |
| regulator_1@e4n.com | Admin@123 | regulator |

## Backlog
- P3: Production EVM integration
- P3: Mobile app (React Native)
- P3: Carbon credit NFT certificates
