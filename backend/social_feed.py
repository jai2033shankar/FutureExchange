"""
E4N Social Trading Feed
- Live anonymized activity feed (trades, predictions, carbon retirements)
- Top trader leaderboard with PnL, win rate, streak tracking
- Trending assets with momentum signals and volume spikes
- Copy-trade: replicate top trader positions
- Market sentiment aggregated from prediction markets + order flow
- Seeded with realistic end-to-end scenario data
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import uuid, random, hashlib, logging

logger = logging.getLogger(__name__)

social_router = APIRouter(prefix="/api/social")
db = None
get_current_user = None

def init_social_feed(database, auth_fn):
    global db, get_current_user
    db = database
    get_current_user = auth_fn

async def _auth(request: Request):
    return await get_current_user(request)


class CopyTradeRequest(BaseModel):
    trader_id: str
    allocation_pct: float = 10.0  # % of portfolio to allocate


# ===== ACTIVITY FEED =====

@social_router.get("/feed")
async def get_activity_feed(limit: int = 30, category: str = "all"):
    """Live anonymized activity feed across all E4N products"""
    feed = await db.social_feed.find(
        {"category": category} if category != "all" else {},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return feed


@social_router.get("/feed/stats")
async def get_feed_stats():
    """Feed-wide statistics"""
    total = await db.social_feed.count_documents({})
    now = datetime.now(timezone.utc)
    last_hour = await db.social_feed.count_documents({"timestamp": {"$gte": (now - timedelta(hours=1)).isoformat()}})
    last_24h = await db.social_feed.count_documents({"timestamp": {"$gte": (now - timedelta(hours=24)).isoformat()}})

    by_cat = {}
    for cat in ["trade", "prediction", "carbon", "bridge", "governance"]:
        by_cat[cat] = await db.social_feed.count_documents({"category": cat})

    # Sentiment from prediction markets
    markets = await db.prediction_markets.find({"status": "active"}, {"_id": 0, "yes_price": 1}).to_list(50)
    avg_yes = sum(m.get("yes_price", 0.5) for m in markets) / max(len(markets), 1)
    sentiment = "bullish" if avg_yes > 0.55 else ("bearish" if avg_yes < 0.45 else "neutral")

    return {
        "total_events": total,
        "last_hour": last_hour,
        "last_24h": last_24h,
        "by_category": by_cat,
        "market_sentiment": sentiment,
        "sentiment_score": round(avg_yes * 100, 1),
        "active_traders_24h": random.randint(45, 120),
        "total_volume_24h": round(random.uniform(50000, 250000), 2),
    }


# ===== LEADERBOARD =====

@social_router.get("/leaderboard")
async def get_leaderboard(period: str = "30d", sort_by: str = "pnl"):
    """Top traders ranked by PnL, win rate, or volume"""
    leaders = await db.social_leaderboard.find({}, {"_id": 0}).sort(f"stats.{sort_by}", -1).to_list(20)
    return leaders


@social_router.get("/leaderboard/{trader_id}")
async def get_trader_profile(trader_id: str):
    """Detailed trader profile with strategy breakdown"""
    trader = await db.social_leaderboard.find_one({"id": trader_id}, {"_id": 0})
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    # Recent activity
    activity = await db.social_feed.find(
        {"trader_id": trader_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(10)
    trader["recent_activity"] = activity
    return trader


# ===== TRENDING =====

@social_router.get("/trending")
async def get_trending_assets():
    """Trending assets with momentum signals and volume spikes"""
    trending = await db.social_trending.find({}, {"_id": 0}).sort("momentum_score", -1).to_list(10)
    return trending


# ===== COPY TRADE =====

@social_router.post("/copy-trade")
async def copy_trade(req: CopyTradeRequest, user: dict = Depends(_auth)):
    """Copy a top trader's recent positions"""
    trader = await db.social_leaderboard.find_one({"id": req.trader_id}, {"_id": 0})
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    usd_balance = wallet.get("balances", {}).get("USD", 0) if wallet else 0
    allocation = round(usd_balance * (req.allocation_pct / 100), 2)

    if allocation < 1:
        raise HTTPException(status_code=400, detail="Insufficient balance for copy trade")

    # Simulate copy
    copy_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "user_name": user["name"],
        "trader_id": req.trader_id,
        "trader_name": trader.get("display_name", ""),
        "allocation_usd": allocation,
        "allocation_pct": req.allocation_pct,
        "positions_copied": len(trader.get("top_positions", [])[:3]),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.social_copy_trades.insert_one(copy_doc)

    # Add to feed
    await db.social_feed.insert_one({
        "id": str(uuid.uuid4()),
        "category": "copy_trade",
        "action": f"started copying {trader.get('display_name', 'trader')}",
        "trader_id": user["_id"],
        "display_name": _anonymize(user["name"]),
        "detail": f"${allocation} allocated ({req.allocation_pct}%)",
        "icon": "copy",
        "color": "#8B5CF6",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    copy_doc.pop("_id", None)
    return copy_doc


@social_router.get("/copy-trades")
async def get_my_copy_trades(user: dict = Depends(_auth)):
    """Get user's active copy trade subscriptions"""
    copies = await db.social_copy_trades.find(
        {"user_id": user["_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return copies


# ===== SENTIMENT =====

@social_router.get("/sentiment")
async def get_market_sentiment():
    """Aggregated market sentiment from prediction markets + order flow"""
    assets = await db.assets.find({"symbol": {"$ne": "USD"}}, {"_id": 0}).to_list(10)
    sentiments = []
    for a in assets:
        change = a.get("price_change_24h", 0)
        vol = a.get("volume_24h", 0)
        buy_pressure = random.uniform(0.3, 0.7)
        sentiments.append({
            "symbol": a["symbol"],
            "name": a["name"],
            "price_change_24h": change,
            "volume_24h": vol,
            "buy_pressure": round(buy_pressure, 2),
            "sell_pressure": round(1 - buy_pressure, 2),
            "signal": "bullish" if buy_pressure > 0.55 else ("bearish" if buy_pressure < 0.45 else "neutral"),
            "social_mentions": random.randint(5, 80),
        })

    # Prediction market aggregate
    markets = await db.prediction_markets.find({"status": "active"}, {"_id": 0, "yes_price": 1, "category": 1, "title": 1}).to_list(20)
    cat_sentiment = {}
    for m in markets:
        cat = m.get("category", "other")
        if cat not in cat_sentiment:
            cat_sentiment[cat] = {"prices": [], "count": 0}
        cat_sentiment[cat]["prices"].append(m.get("yes_price", 0.5))
        cat_sentiment[cat]["count"] += 1

    pred_sentiment = []
    for cat, data in cat_sentiment.items():
        avg = sum(data["prices"]) / len(data["prices"])
        pred_sentiment.append({
            "category": cat,
            "avg_yes_price": round(avg, 3),
            "markets": data["count"],
            "signal": "bullish" if avg > 0.55 else ("bearish" if avg < 0.45 else "neutral"),
        })

    return {"assets": sentiments, "predictions": pred_sentiment}


# ===== HELPERS =====

def _anonymize(name):
    """Partially anonymize trader name"""
    if not name:
        return "Trader"
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0][0]}. {parts[-1]}"
    return f"{name[0]}***"


# ===== SEED DATA =====

async def seed_social_feed():
    existing = await db.social_feed.count_documents({})
    if existing > 0:
        return

    logger.info("Seeding social trading feed...")
    now = datetime.now(timezone.utc)

    # --- Leaderboard ---
    traders = [
        {"name": "Sophia Nakamoto", "role": "institutional", "style": "Macro Quant", "bio": "Systematic carbon-macro strategy. 5yr track record in emissions trading.", "badges": ["Top 1%", "Carbon Expert", "Streak: 12"]},
        {"name": "Marcus Chen", "role": "retail", "style": "Momentum Trader", "bio": "Short-term momentum plays on commodity tokens. High frequency, high conviction.", "badges": ["Rising Star", "Volume King"]},
        {"name": "Amara Okafor", "role": "institutional", "style": "ESG Specialist", "bio": "Long-only carbon credits with fundamental research. Focuses on REDD+ projects.", "badges": ["ESG Pioneer", "Verified"]},
        {"name": "Viktor Petrov", "role": "institutional", "style": "Spread Trader", "bio": "Relative value between energy and carbon tokens. Market-neutral approach.", "badges": ["Risk Adjusted", "Consistent"]},
        {"name": "Priya Sharma", "role": "retail", "style": "Prediction Ace", "bio": "Event-driven prediction market specialist. 72% hit rate on regulation outcomes.", "badges": ["Prediction Master", "Top 5%"]},
        {"name": "James Worthington", "role": "institutional", "style": "Dark Pool Specialist", "bio": "Institutional block order execution. Minimizes market impact on large trades.", "badges": ["Whale", "Institutional"]},
        {"name": "Yuki Tanaka", "role": "retail", "style": "Water Rights Trader", "bio": "Specializes in H2O token arbitrage across regional pricing disparities.", "badges": ["H2O Expert", "Arbitrageur"]},
        {"name": "Elena Rodriguez", "role": "retail", "style": "Carbon Retiree", "bio": "Buys and retires carbon credits for corporate clients. Net-zero facilitator.", "badges": ["Climate Champion", "Verified"]},
    ]

    for i, t in enumerate(traders):
        pnl = round(random.uniform(-500, 15000), 2)
        trades_count = random.randint(20, 500)
        wins = int(trades_count * random.uniform(0.4, 0.75))
        streak = random.randint(0, 15)
        volume = round(random.uniform(10000, 2000000), 2)

        # Generate equity curve (30 days)
        eq = 10000
        equity_curve = []
        for d in range(30, 0, -1):
            eq = max(5000, eq + random.uniform(-200, 300))
            equity_curve.append({"date": (now - timedelta(days=d)).strftime("%Y-%m-%d"), "value": round(eq, 2)})

        positions = []
        for asset in random.sample(["CARBON", "RICE", "WHEAT", "KWH", "H2O"], min(3, 5)):
            positions.append({"asset": asset, "side": random.choice(["long", "short"]), "size": round(random.uniform(100, 5000), 2), "entry_price": round(random.uniform(0.1, 60), 4), "pnl": round(random.uniform(-200, 800), 2)})

        doc = {
            "id": str(uuid.uuid4()),
            "display_name": _anonymize(t["name"]),
            "avatar_initials": t["name"][0] + t["name"].split()[-1][0],
            "role": t["role"],
            "style": t["style"],
            "bio": t["bio"],
            "badges": t["badges"],
            "rank": i + 1,
            "stats": {
                "pnl": pnl,
                "pnl_pct": round(pnl / 10000 * 100, 2),
                "trades": trades_count,
                "wins": wins,
                "losses": trades_count - wins,
                "win_rate": round(wins / trades_count * 100, 1),
                "streak": streak,
                "volume": volume,
                "sharpe": round(random.uniform(-0.5, 3.0), 2),
                "max_drawdown": round(random.uniform(2, 25), 1),
            },
            "top_positions": positions,
            "equity_curve": equity_curve,
            "copiers": random.randint(0, 45),
            "followers": random.randint(10, 500),
            "joined": (now - timedelta(days=random.randint(30, 365))).isoformat(),
        }
        await db.social_leaderboard.insert_one(doc)

    # --- Activity Feed ---
    actions = [
        {"cat": "trade", "tpl": "bought {qty} {asset} @ ${price}", "icon": "arrow-up-right", "color": "#00F298"},
        {"cat": "trade", "tpl": "sold {qty} {asset} @ ${price}", "icon": "arrow-down-right", "color": "#EF4444"},
        {"cat": "prediction", "tpl": "bought YES on \"{market}\"", "icon": "trending-up", "color": "#3B82F6"},
        {"cat": "prediction", "tpl": "bought NO on \"{market}\"", "icon": "trending-down", "color": "#F59E0B"},
        {"cat": "carbon", "tpl": "retired {qty} tCO2e from {project}", "icon": "leaf", "color": "#00F298"},
        {"cat": "carbon", "tpl": "purchased {qty} carbon credits", "icon": "leaf", "color": "#059669"},
        {"cat": "bridge", "tpl": "bridged {qty} {asset} to {chain}", "icon": "globe", "color": "#8B5CF6"},
        {"cat": "governance", "tpl": "voted FOR on \"{proposal}\"", "icon": "vote", "color": "#06B6D4"},
    ]

    assets_list = ["CARBON", "RICE", "WHEAT", "KWH", "H2O"]
    markets_list = ["EU carbon > $80", "Wheat > $7/bu", "SEC carbon ETF", "Global rice decline >3%", "Fed rate < 4%"]
    projects_list = ["Amazon Rainforest", "Gujarat Solar", "Kenya Cookstove", "Nordic Wind"]
    chains_list = ["Ethereum", "Arbitrum", "Avalanche"]
    proposals_list = ["Increase CARBON cap to 20%", "Add SOL token", "Reduce settlement fee to 0.3%"]

    feed_events = []
    for j in range(80):
        action = random.choice(actions)
        trader = random.choice(traders)
        hours_ago = random.uniform(0.1, 72)

        detail = action["tpl"].format(
            qty=round(random.uniform(10, 5000), 1),
            asset=random.choice(assets_list),
            price=round(random.uniform(0.01, 60), 4),
            market=random.choice(markets_list),
            project=random.choice(projects_list),
            chain=random.choice(chains_list),
            proposal=random.choice(proposals_list),
        )

        # Compute impact
        pnl_impact = round(random.uniform(-500, 2000), 2) if action["cat"] == "trade" else None

        feed_events.append({
            "id": str(uuid.uuid4()),
            "category": action["cat"],
            "action": detail,
            "trader_id": str(uuid.uuid4()),
            "display_name": _anonymize(trader["name"]),
            "avatar_initials": trader["name"][0] + trader["name"].split()[-1][0],
            "role": trader["role"],
            "style": trader["style"],
            "detail": f"P&L: ${pnl_impact}" if pnl_impact else "",
            "pnl_impact": pnl_impact,
            "icon": action["icon"],
            "color": action["color"],
            "reactions": {"fire": random.randint(0, 15), "rocket": random.randint(0, 8), "eyes": random.randint(0, 12)},
            "timestamp": (now - timedelta(hours=hours_ago)).isoformat(),
        })

    if feed_events:
        await db.social_feed.insert_many(feed_events)

    # --- Trending ---
    trending_data = []
    for asset in assets_list:
        asset_doc = await db.assets.find_one({"symbol": asset}, {"_id": 0})
        price = asset_doc.get("current_price", 1) if asset_doc else 1
        change = asset_doc.get("price_change_24h", 0) if asset_doc else 0
        vol = asset_doc.get("volume_24h", 0) if asset_doc else 0

        momentum = round(random.uniform(20, 95), 1)
        social_score = random.randint(10, 100)
        whale_activity = random.randint(0, 5)

        # Sparkline (7d)
        sparkline = []
        p = price * random.uniform(0.9, 1.0)
        for d in range(7, 0, -1):
            p = max(p * 0.8, p + random.uniform(-price * 0.03, price * 0.04))
            sparkline.append({"day": 8 - d, "price": round(p, 4)})

        trending_data.append({
            "symbol": asset,
            "name": asset_doc.get("name", asset) if asset_doc else asset,
            "price": price,
            "change_24h": change,
            "volume_24h": vol,
            "momentum_score": momentum,
            "social_score": social_score,
            "whale_trades": whale_activity,
            "signal": "hot" if momentum > 70 else ("warm" if momentum > 40 else "cold"),
            "buy_pressure": round(random.uniform(0.35, 0.75), 2),
            "sparkline": sparkline,
            "top_traders_holding": random.randint(2, 7),
        })

    if trending_data:
        await db.social_trending.insert_many(trending_data)

    await db.social_feed.create_index([("timestamp", -1)])
    await db.social_feed.create_index("category")
    await db.social_leaderboard.create_index([("stats.pnl", -1)])
    await db.social_trending.create_index([("momentum_score", -1)])

    logger.info("Social trading feed seeded!")
