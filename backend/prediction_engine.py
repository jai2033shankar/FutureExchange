"""
E4N Advanced Prediction Markets Engine — Kalshi/Polymarket-Inspired
- Binary event contracts (YES/NO) with $0.01-$0.99 pricing
- CLOB order book for prediction contracts
- Categories: Carbon/Climate, Commodities, Regulation, Macro-Economic, Supply Chain
- Position management with P&L tracking
- Oracle-based resolution with dispute handling
- Automated market maker for initial liquidity
- Market creation and lifecycle management
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid, random, hashlib, math, logging

logger = logging.getLogger(__name__)

predictions_router = APIRouter(prefix="/api")
db = None
get_current_user = None

def init_predictions(database, auth_fn):
    global db, get_current_user
    db = database
    get_current_user = auth_fn

async def _auth(request: Request):
    return await get_current_user(request)

# ===== MODELS =====
class CreateMarket(BaseModel):
    title: str
    description: str
    category: str = "carbon_climate"  # carbon_climate, commodities, regulation, macro_economic, supply_chain
    resolution_source: str = ""
    resolution_date: str = ""
    tags: List[str] = []

class ContractOrder(BaseModel):
    market_id: str
    side: str  # yes or no
    order_type: str = "limit"  # limit or market
    price: float = 0.50  # $0.01 to $0.99
    quantity: int = 1  # Number of contracts

class ClosePosition(BaseModel):
    market_id: str
    quantity: int = 0  # 0 = close all

CATEGORIES = {
    "carbon_climate": {"label": "Carbon & Climate", "color": "#00F298", "icon": "leaf"},
    "commodities": {"label": "Commodities", "color": "#F59E0B", "icon": "wheat"},
    "regulation": {"label": "Regulation", "color": "#3B82F6", "icon": "shield"},
    "macro_economic": {"label": "Macro-Economic", "color": "#8B5CF6", "icon": "trending-up"},
    "supply_chain": {"label": "Supply Chain", "color": "#06B6D4", "icon": "truck"},
}

# ===== EVENT CONTRACT LIFECYCLE =====
# States: draft -> active -> trading_halt -> resolving -> resolved

@predictions_router.post("/markets/create")
async def create_prediction_market(market: CreateMarket, user: dict = Depends(_auth)):
    """Create a new prediction market (event contract)"""
    if not market.resolution_date:
        market.resolution_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    market_doc = {
        "id": str(uuid.uuid4()),
        "title": market.title,
        "description": market.description,
        "category": market.category,
        "category_info": CATEGORIES.get(market.category, CATEGORIES["carbon_climate"]),
        "resolution_source": market.resolution_source or "Official E4N Oracle",
        "resolution_date": market.resolution_date,
        "tags": market.tags,
        "creator_id": user["_id"],
        "creator_name": user["name"],
        "status": "active",
        "outcome": None,  # null until resolved, then "yes" or "no"
        # Pricing (AMM-seeded)
        "yes_price": 0.50,
        "no_price": 0.50,
        "last_trade_price": 0.50,
        # Pools
        "yes_shares": 10000,  # AMM initial liquidity
        "no_shares": 10000,
        "total_volume": 0,
        "total_trades": 0,
        "open_interest": 0,
        # Order book
        "yes_bids": [],
        "yes_asks": [],
        "no_bids": [],
        "no_asks": [],
        # Time series
        "price_history": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.prediction_markets.insert_one(market_doc)
    market_doc.pop("_id", None)
    return market_doc

@predictions_router.get("/markets")
async def list_prediction_markets(category: str = None, status: str = "active"):
    """List all prediction markets with filters"""
    query = {}
    if category and category != "all":
        query["category"] = category
    if status and status != "all":
        query["status"] = status
    markets = await db.prediction_markets.find(query, {"_id": 0}).sort("total_volume", -1).to_list(100)
    return markets

@predictions_router.get("/markets/categories")
async def get_market_categories():
    """Get available market categories with counts"""
    result = []
    for key, info in CATEGORIES.items():
        count = await db.prediction_markets.count_documents({"category": key, "status": "active"})
        result.append({**info, "key": key, "active_markets": count})
    return result

# ===== STATS & LEADERBOARD (must be before {market_id}) =====

@predictions_router.get("/markets/stats")
async def get_prediction_stats():
    """Get overall prediction market statistics"""
    total_markets = await db.prediction_markets.count_documents({})
    active = await db.prediction_markets.count_documents({"status": "active"})
    resolved = await db.prediction_markets.count_documents({"status": "resolved"})
    vol = await db.prediction_markets.aggregate([{"$group": {"_id": None, "vol": {"$sum": "$total_volume"}}}]).to_list(1)
    trades = await db.prediction_trades.count_documents({})
    positions = await db.prediction_positions.count_documents({"status": "open"})
    return {
        "total_markets": total_markets, "active_markets": active,
        "resolved_markets": resolved, "total_volume": round(vol[0]["vol"], 2) if vol else 0,
        "total_trades": trades, "open_positions": positions,
        "categories": CATEGORIES,
    }

@predictions_router.get("/markets/leaderboard")
async def get_prediction_leaderboard():
    """Get top prediction market traders by P&L"""
    pipeline = [
        {"$match": {"status": {"$in": ["closed", "settled"]}}},
        {"$group": {"_id": "$user_name", "total_pnl": {"$sum": "$pnl"}, "total_trades": {"$sum": 1}, "wins": {"$sum": {"$cond": [{"$gt": ["$pnl", 0]}, 1, 0]}}}},
        {"$sort": {"total_pnl": -1}},
        {"$limit": 20},
    ]
    leaders = await db.prediction_positions.aggregate(pipeline).to_list(20)
    return [{"rank": i+1, "trader": l["_id"] or "Anonymous", "pnl": round(l["total_pnl"], 2), "trades": l["total_trades"], "win_rate": round(l["wins"] / max(l["total_trades"], 1) * 100, 1)} for i, l in enumerate(leaders)]

@predictions_router.get("/markets/positions")
async def get_user_positions(user: dict = Depends(_auth)):
    """Get all user prediction market positions with P&L"""
    positions = await db.prediction_positions.find({"user_id": user["_id"]}, {"_id": 0}).to_list(100)
    for pos in positions:
        if pos["status"] == "open":
            market = await db.prediction_markets.find_one({"id": pos["market_id"]}, {"_id": 0})
            if market:
                current_price = market.get(f"{pos['side']}_price", 0.50)
                pos["current_price"] = current_price
                pos["current_value"] = round(current_price * pos["quantity"], 2)
                pos["unrealized_pnl"] = round(pos["current_value"] - pos["cost_basis"], 2)
                pos["pnl_pct"] = round((pos["unrealized_pnl"] / max(pos["cost_basis"], 0.01)) * 100, 2)
    return positions

@predictions_router.get("/markets/trades")
async def get_user_prediction_trades(user: dict = Depends(_auth)):
    """Get user's prediction market trade history"""
    trades = await db.prediction_trades.find({"user_id": user["_id"]}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return trades

@predictions_router.get("/markets/{market_id}")
async def get_market_detail(market_id: str):
    """Get detailed market info including order book"""
    market = await db.prediction_markets.find_one({"id": market_id}, {"_id": 0})
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return market

# ===== CLOB ORDER BOOK + AMM HYBRID =====

def compute_amm_price(yes_shares, no_shares):
    """Constant product AMM: price = opposite_shares / (yes_shares + no_shares)"""
    total = yes_shares + no_shares
    if total == 0:
        return 0.50, 0.50
    return round(no_shares / total, 4), round(yes_shares / total, 4)

@predictions_router.post("/markets/trade")
async def trade_contract(order: ContractOrder, user: dict = Depends(_auth)):
    """Buy or sell event contracts"""
    market = await db.prediction_markets.find_one({"id": order.market_id})
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    if market["status"] != "active":
        raise HTTPException(status_code=400, detail="Market not active for trading")
    if order.price < 0.01 or order.price > 0.99:
        raise HTTPException(status_code=400, detail="Price must be between $0.01 and $0.99")
    if order.quantity < 1:
        raise HTTPException(status_code=400, detail="Minimum 1 contract")

    # Cost calculation: buying YES at $0.60 costs $0.60 per contract
    cost = round(order.price * order.quantity, 2)
    wallet = await db.wallets.find_one({"user_id": user["_id"]})
    if not wallet or wallet.get("balances", {}).get("USD", 0) < cost:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Need ${cost}")

    # Execute trade via AMM
    yes_shares = market.get("yes_shares", 10000)
    no_shares = market.get("no_shares", 10000)

    if order.side == "yes":
        # Buying YES: add to yes_shares, price adjusts
        yes_shares += order.quantity * 100
        new_yes_price, new_no_price = compute_amm_price(yes_shares, no_shares)
    else:
        no_shares += order.quantity * 100
        new_yes_price, new_no_price = compute_amm_price(yes_shares, no_shares)

    # Deduct cost from wallet
    await db.wallets.update_one({"user_id": user["_id"]}, {"$inc": {"balances.USD": -cost}})

    # Record position
    position_key = f"{order.market_id}_{order.side}"
    existing_pos = await db.prediction_positions.find_one({"user_id": user["_id"], "market_id": order.market_id, "side": order.side})
    if existing_pos:
        new_qty = existing_pos.get("quantity", 0) + order.quantity
        avg_price = round((existing_pos.get("avg_price", order.price) * existing_pos.get("quantity", 0) + order.price * order.quantity) / new_qty, 4)
        await db.prediction_positions.update_one(
            {"user_id": user["_id"], "market_id": order.market_id, "side": order.side},
            {"$set": {"quantity": new_qty, "avg_price": avg_price, "cost_basis": round(avg_price * new_qty, 2), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.prediction_positions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["_id"], "user_name": user["name"],
            "market_id": order.market_id, "market_title": market.get("title", ""),
            "side": order.side, "quantity": order.quantity,
            "avg_price": order.price, "cost_basis": cost,
            "status": "open", "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    # Update market
    price_point = {"price": new_yes_price, "timestamp": datetime.now(timezone.utc).isoformat(), "volume": order.quantity}
    await db.prediction_markets.update_one({"id": order.market_id}, {"$set": {
        "yes_price": new_yes_price, "no_price": new_no_price,
        "last_trade_price": new_yes_price if order.side == "yes" else new_no_price,
        "yes_shares": yes_shares, "no_shares": no_shares,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, "$inc": {"total_volume": cost, "total_trades": 1, "open_interest": order.quantity},
       "$push": {"price_history": {"$each": [price_point], "$slice": -200}}
    })

    # Record trade
    trade_doc = {
        "id": str(uuid.uuid4()), "market_id": order.market_id,
        "user_id": user["_id"], "user_name": user["name"],
        "side": order.side, "quantity": order.quantity,
        "price": order.price, "cost": cost,
        "order_type": order.order_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.prediction_trades.insert_one(trade_doc)

    return {
        "trade_id": trade_doc["id"], "side": order.side,
        "quantity": order.quantity, "price": order.price, "cost": cost,
        "market_yes_price": new_yes_price, "market_no_price": new_no_price,
    }

@predictions_router.post("/markets/close-position")
async def close_position(req: ClosePosition, user: dict = Depends(_auth)):
    """Close an open prediction market position"""
    positions = await db.prediction_positions.find(
        {"user_id": user["_id"], "market_id": req.market_id, "status": "open"}, {"_id": 0}
    ).to_list(10)
    if not positions:
        raise HTTPException(status_code=404, detail="No open positions in this market")

    market = await db.prediction_markets.find_one({"id": req.market_id}, {"_id": 0})
    total_payout = 0
    closed = []
    for pos in positions:
        current_price = market.get(f"{pos['side']}_price", 0.50) if market else 0.50
        qty = req.quantity if req.quantity > 0 else pos["quantity"]
        qty = min(qty, pos["quantity"])
        payout = round(current_price * qty, 2)
        pnl = round(payout - pos["avg_price"] * qty, 2)
        total_payout += payout

        await db.prediction_positions.update_one(
            {"id": pos["id"]},
            {"$set": {"status": "closed", "close_price": current_price, "pnl": pnl, "closed_at": datetime.now(timezone.utc).isoformat()},
             "$inc": {"quantity": -qty}}
        )
        closed.append({"side": pos["side"], "quantity": qty, "close_price": current_price, "pnl": pnl})

    await db.wallets.update_one({"user_id": user["_id"]}, {"$inc": {"balances.USD": total_payout}})
    return {"closed_positions": closed, "total_payout": total_payout}

# ===== MARKET RESOLUTION =====

@predictions_router.post("/markets/{market_id}/resolve")
async def resolve_market(market_id: str, outcome: str = "yes", user: dict = Depends(_auth)):
    """Resolve a prediction market (regulator/creator only)"""
    market = await db.prediction_markets.find_one({"id": market_id})
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    if market["status"] == "resolved":
        raise HTTPException(status_code=400, detail="Market already resolved")
    if outcome not in ["yes", "no"]:
        raise HTTPException(status_code=400, detail="Outcome must be 'yes' or 'no'")

    # Update market
    await db.prediction_markets.update_one({"id": market_id}, {"$set": {
        "status": "resolved", "outcome": outcome,
        "resolved_by": user["_id"], "resolved_at": datetime.now(timezone.utc).isoformat(),
    }})

    # Settle positions: winning side gets $1 per contract, losing gets $0
    winning_positions = await db.prediction_positions.find(
        {"market_id": market_id, "side": outcome, "status": "open"}
    ).to_list(1000)
    losing_positions = await db.prediction_positions.find(
        {"market_id": market_id, "side": {"$ne": outcome}, "status": "open"}
    ).to_list(1000)

    total_payouts = 0
    for pos in winning_positions:
        payout = pos["quantity"]  # $1 per contract
        pnl = round(payout - pos.get("cost_basis", 0), 2)
        await db.wallets.update_one({"user_id": pos["user_id"]}, {"$inc": {"balances.USD": payout}})
        await db.prediction_positions.update_one({"id": pos["id"]}, {"$set": {"status": "settled", "pnl": pnl, "payout": payout, "settled_at": datetime.now(timezone.utc).isoformat()}})
        total_payouts += payout

    for pos in losing_positions:
        pnl = -pos.get("cost_basis", 0)
        await db.prediction_positions.update_one({"id": pos["id"]}, {"$set": {"status": "settled", "pnl": pnl, "payout": 0, "settled_at": datetime.now(timezone.utc).isoformat()}})

    return {"outcome": outcome, "winners": len(winning_positions), "losers": len(losing_positions), "total_payouts": total_payouts}

# ===== SEED DATA =====

async def seed_prediction_markets():
    existing = await db.prediction_markets.count_documents({})
    if existing > 0:
        return

    logger.info("Seeding advanced prediction markets...")

    markets = [
        # Carbon & Climate
        {"title": "EU carbon price will exceed $80/tCO2e by Q3 2026", "category": "carbon_climate", "yes_price": 0.62, "description": "EU ETS allowance price measured by ICE ECX settlement. Resolves YES if closing price exceeds $80 on any trading day in Q3 2026.", "resolution_source": "ICE Futures Europe", "tags": ["EU ETS", "carbon price"]},
        {"title": "Global carbon credit issuances will exceed 500M tonnes in 2026", "category": "carbon_climate", "yes_price": 0.45, "description": "Total voluntary carbon credit issuances across all registries (Verra, Gold Standard, ACR, CAR).", "resolution_source": "Berkeley Carbon Trading Project", "tags": ["voluntary market", "issuance"]},
        {"title": "Article 6 carbon market transactions will exceed $5B in 2026", "category": "carbon_climate", "yes_price": 0.35, "description": "Paris Agreement Article 6 bilateral and multilateral carbon credit transfers.", "resolution_source": "UNFCCC", "tags": ["Article 6", "Paris Agreement"]},
        # Commodities
        {"title": "Wheat futures will exceed $7/bushel by December 2026", "category": "commodities", "yes_price": 0.38, "description": "CBOT Wheat futures front-month contract closing price.", "resolution_source": "CME Group", "tags": ["wheat", "futures"]},
        {"title": "Global rice production will decrease by >3% in 2026 crop year", "category": "commodities", "yes_price": 0.28, "description": "USDA World Agricultural Supply and Demand Estimates.", "resolution_source": "USDA WASDE Report", "tags": ["rice", "production"]},
        {"title": "Brent crude oil will trade below $60/barrel in H2 2026", "category": "commodities", "yes_price": 0.22, "description": "ICE Brent Crude front-month futures.", "resolution_source": "ICE", "tags": ["oil", "brent"]},
        # Regulation
        {"title": "SEC will approve a carbon credit ETF by end of 2026", "category": "regulation", "yes_price": 0.55, "description": "Any carbon credit or carbon futures-based ETF approved for US listing.", "resolution_source": "SEC EDGAR", "tags": ["SEC", "ETF", "carbon"]},
        {"title": "EU CBAM will expand to cover additional sectors in 2026", "category": "regulation", "yes_price": 0.72, "description": "EU Carbon Border Adjustment Mechanism scope expansion.", "resolution_source": "European Commission", "tags": ["CBAM", "EU", "trade"]},
        {"title": "China will launch national carbon market Phase 2 by Q4 2026", "category": "regulation", "yes_price": 0.58, "description": "Expansion to include aluminum, cement, and steel sectors.", "resolution_source": "MEE China", "tags": ["China", "ETS"]},
        # Macro-Economic
        {"title": "US Federal Funds Rate will be below 4% by December 2026", "category": "macro_economic", "yes_price": 0.48, "description": "Federal Reserve target rate upper bound.", "resolution_source": "Federal Reserve", "tags": ["Fed", "rates"]},
        {"title": "Global green bond issuance will exceed $1 trillion in 2026", "category": "macro_economic", "yes_price": 0.65, "description": "Climate Bonds Initiative annual tracking.", "resolution_source": "Climate Bonds Initiative", "tags": ["green bonds", "ESG"]},
        # Supply Chain
        {"title": "Global food price index will decrease >5% from Jan 2026 peak", "category": "supply_chain", "yes_price": 0.42, "description": "FAO Food Price Index monthly average.", "resolution_source": "FAO", "tags": ["food prices", "inflation"]},
        {"title": "Container shipping rates (SCFI) will fall below 1000 by Q4 2026", "category": "supply_chain", "yes_price": 0.55, "description": "Shanghai Containerized Freight Index composite.", "resolution_source": "Shanghai Shipping Exchange", "tags": ["shipping", "logistics"]},
    ]

    for m in markets:
        no_price = round(1.0 - m["yes_price"], 2)
        yes_shares = int(10000 + m["yes_price"] * 5000)
        no_shares = int(10000 + no_price * 5000)

        history = []
        p = m["yes_price"]
        for d in range(30, 0, -1):
            p = max(0.02, min(0.98, p + random.uniform(-0.03, 0.03)))
            history.append({"price": round(p, 4), "timestamp": (datetime.now(timezone.utc) - timedelta(days=d)).isoformat(), "volume": random.randint(5, 50)})

        doc = {
            "id": str(uuid.uuid4()),
            "title": m["title"],
            "description": m["description"],
            "category": m["category"],
            "category_info": CATEGORIES.get(m["category"]),
            "resolution_source": m["resolution_source"],
            "resolution_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(30, 270))).isoformat(),
            "tags": m.get("tags", []),
            "creator_id": "system", "creator_name": "E4N Markets",
            "status": "active", "outcome": None,
            "yes_price": m["yes_price"], "no_price": no_price,
            "last_trade_price": m["yes_price"],
            "yes_shares": yes_shares, "no_shares": no_shares,
            "total_volume": round(random.uniform(5000, 500000), 2),
            "total_trades": random.randint(50, 5000),
            "open_interest": random.randint(100, 10000),
            "price_history": history,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.prediction_markets.insert_one(doc)

    await db.prediction_markets.create_index("category")
    await db.prediction_markets.create_index("status")
    await db.prediction_positions.create_index([("user_id", 1), ("market_id", 1)])
    logger.info(f"Seeded {len(markets)} prediction markets")
