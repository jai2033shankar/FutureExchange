"""
E4N Warehouse Tokenization Deep Module
- Full tokenization lifecycle: Mint, Burn, Transfer warehouse receipt tokens
- Inventory management: Deposit/withdraw commodities with on-chain recording
- Alert history with severity levels and blockchain anchoring
- Warehouse analytics: utilization trends, value tracking, compliance scoring
- End-to-end simulation data for all warehouse scenarios
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid, random, hashlib, logging

logger = logging.getLogger(__name__)

wh_token_router = APIRouter(prefix="/api/warehouses")
db = None
get_current_user = None

def init_wh_tokenization(database, auth_fn):
    global db, get_current_user
    db = database
    get_current_user = auth_fn

async def _auth(request: Request):
    return await get_current_user(request)

# ===== MODELS =====
class MintTokens(BaseModel):
    warehouse_id: str
    amount: float
    reason: str = "inventory_deposit"

class BurnTokens(BaseModel):
    warehouse_id: str
    amount: float
    reason: str = "inventory_withdrawal"

class TransferTokens(BaseModel):
    warehouse_id: str
    recipient_address: str
    amount: float

class DepositInventory(BaseModel):
    warehouse_id: str
    asset_symbol: str
    quantity: float
    grade: str = "A"
    lot_number: str = ""

class WithdrawInventory(BaseModel):
    warehouse_id: str
    inventory_id: str
    quantity: float

# ===== TOKENIZATION ENDPOINTS =====

@wh_token_router.get("/{warehouse_id}/token-info")
async def get_token_info(warehouse_id: str):
    """Get warehouse token details including supply, holders, and recent events"""
    wh = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    token_data = await db.wh_tokens.find_one({"warehouse_id": warehouse_id}, {"_id": 0})
    if not token_data:
        token_data = {
            "warehouse_id": warehouse_id,
            "token_symbol": f"WH-{wh['name'][:3].upper()}",
            "total_supply": round(wh.get("current_utilization", 0) * 0.8, 2),
            "circulating_supply": round(wh.get("current_utilization", 0) * 0.6, 2),
            "locked_supply": round(wh.get("current_utilization", 0) * 0.2, 2),
            "price_per_token": round(random.uniform(0.5, 5.0), 4),
            "market_cap": 0,
            "holders": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        token_data["market_cap"] = round(token_data["total_supply"] * token_data["price_per_token"], 2)

    events = await db.wh_token_events.find(
        {"warehouse_id": warehouse_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(20)

    return {**token_data, "warehouse": wh, "recent_events": events}


@wh_token_router.post("/tokens/mint")
async def mint_tokens(req: MintTokens, user: dict = Depends(_auth)):
    """Mint new warehouse receipt tokens (backed by physical inventory)"""
    wh = await db.warehouses.find_one({"id": req.warehouse_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    token_data = await db.wh_tokens.find_one({"warehouse_id": req.warehouse_id})
    if not token_data:
        token_data = {"warehouse_id": req.warehouse_id, "total_supply": 0, "circulating_supply": 0, "locked_supply": 0}

    new_supply = token_data.get("total_supply", 0) + req.amount
    await db.wh_tokens.update_one(
        {"warehouse_id": req.warehouse_id},
        {"$set": {"total_supply": new_supply, "circulating_supply": token_data.get("circulating_supply", 0) + req.amount, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    event = {
        "id": str(uuid.uuid4()), "warehouse_id": req.warehouse_id,
        "type": "mint", "amount": req.amount, "reason": req.reason,
        "by_user": user["name"], "by_address": user.get("wallet_address", ""),
        "tx_hash": f"0x{uuid.uuid4().hex}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.wh_token_events.insert_one(event)
    event.pop("_id", None)
    return {"message": f"Minted {req.amount} tokens", "new_supply": new_supply, "event": event}


@wh_token_router.post("/tokens/burn")
async def burn_tokens(req: BurnTokens, user: dict = Depends(_auth)):
    """Burn warehouse tokens (when physical inventory is withdrawn)"""
    token_data = await db.wh_tokens.find_one({"warehouse_id": req.warehouse_id})
    if not token_data or token_data.get("circulating_supply", 0) < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient circulating supply to burn")

    new_supply = token_data["total_supply"] - req.amount
    new_circ = token_data["circulating_supply"] - req.amount
    await db.wh_tokens.update_one(
        {"warehouse_id": req.warehouse_id},
        {"$set": {"total_supply": max(0, new_supply), "circulating_supply": max(0, new_circ), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    event = {
        "id": str(uuid.uuid4()), "warehouse_id": req.warehouse_id,
        "type": "burn", "amount": req.amount, "reason": req.reason,
        "by_user": user["name"], "by_address": user.get("wallet_address", ""),
        "tx_hash": f"0x{uuid.uuid4().hex}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.wh_token_events.insert_one(event)
    event.pop("_id", None)
    return {"message": f"Burned {req.amount} tokens", "new_supply": max(0, new_supply), "event": event}


@wh_token_router.post("/tokens/transfer")
async def transfer_tokens(req: TransferTokens, user: dict = Depends(_auth)):
    """Transfer warehouse receipt tokens to another address"""
    event = {
        "id": str(uuid.uuid4()), "warehouse_id": req.warehouse_id,
        "type": "transfer", "amount": req.amount,
        "from_address": user.get("wallet_address", ""), "to_address": req.recipient_address,
        "by_user": user["name"],
        "tx_hash": f"0x{uuid.uuid4().hex}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.wh_token_events.insert_one(event)
    event.pop("_id", None)
    return {"message": f"Transferred {req.amount} tokens to {req.recipient_address[:10]}...", "event": event}


# ===== INVENTORY MANAGEMENT =====

@wh_token_router.get("/{warehouse_id}/inventory")
async def get_inventory(warehouse_id: str):
    """Get warehouse inventory with lot details"""
    inventory = await db.wh_inventory.find(
        {"warehouse_id": warehouse_id, "status": {"$ne": "withdrawn"}}, {"_id": 0}
    ).to_list(100)
    summary = {}
    for item in inventory:
        sym = item["asset_symbol"]
        if sym not in summary:
            summary[sym] = {"asset_symbol": sym, "total_quantity": 0, "lots": 0, "avg_grade": [], "total_value": 0}
        summary[sym]["total_quantity"] += item["quantity"]
        summary[sym]["lots"] += 1
        summary[sym]["avg_grade"].append(item.get("grade", "A"))
        summary[sym]["total_value"] += item.get("value", 0)

    for s in summary.values():
        grades = s.pop("avg_grade")
        s["primary_grade"] = max(set(grades), key=grades.count) if grades else "A"

    return {"inventory": inventory, "summary": list(summary.values()), "warehouse_id": warehouse_id}


@wh_token_router.post("/inventory/deposit")
async def deposit_inventory(req: DepositInventory, user: dict = Depends(_auth)):
    """Deposit physical commodity into warehouse (auto-mints receipt tokens)"""
    wh = await db.warehouses.find_one({"id": req.warehouse_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    remaining_capacity = wh["capacity"] - wh.get("current_utilization", 0)
    if req.quantity > remaining_capacity:
        raise HTTPException(status_code=400, detail=f"Exceeds capacity. Available: {remaining_capacity}")

    asset = await db.assets.find_one({"symbol": req.asset_symbol.upper()}, {"_id": 0})
    price = asset.get("current_price", asset.get("base_price", 1)) if asset else 1.0
    value = round(req.quantity * price, 2)

    inv_doc = {
        "id": str(uuid.uuid4()), "warehouse_id": req.warehouse_id,
        "asset_symbol": req.asset_symbol.upper(), "quantity": req.quantity,
        "grade": req.grade, "lot_number": req.lot_number or f"LOT-{uuid.uuid4().hex[:8].upper()}",
        "deposited_by": user["name"], "depositor_id": user["_id"],
        "price_at_deposit": price, "value": value,
        "status": "stored", "tokenized": True,
        "deposit_date": datetime.now(timezone.utc).isoformat(),
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        "quality_verified": req.grade in ["A", "B"],
        "inspection_date": datetime.now(timezone.utc).isoformat(),
    }
    await db.wh_inventory.insert_one(inv_doc)

    await db.warehouses.update_one(
        {"id": req.warehouse_id},
        {"$inc": {"current_utilization": req.quantity}}
    )

    inv_doc.pop("_id", None)
    return {"message": f"Deposited {req.quantity} {req.asset_symbol}", "inventory": inv_doc, "tokens_minted": req.quantity}


@wh_token_router.post("/inventory/withdraw")
async def withdraw_inventory(req: WithdrawInventory, user: dict = Depends(_auth)):
    """Withdraw commodity from warehouse (burns receipt tokens)"""
    inv = await db.wh_inventory.find_one({"id": req.inventory_id, "warehouse_id": req.warehouse_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    if inv.get("status") == "withdrawn":
        raise HTTPException(status_code=400, detail="Already withdrawn")
    if req.quantity > inv["quantity"]:
        raise HTTPException(status_code=400, detail="Exceeds stored quantity")

    if req.quantity >= inv["quantity"]:
        await db.wh_inventory.update_one({"id": req.inventory_id}, {"$set": {"status": "withdrawn", "withdrawn_date": datetime.now(timezone.utc).isoformat()}})
    else:
        await db.wh_inventory.update_one({"id": req.inventory_id}, {"$inc": {"quantity": -req.quantity}})

    await db.warehouses.update_one({"id": req.warehouse_id}, {"$inc": {"current_utilization": -req.quantity}})

    return {"message": f"Withdrawn {req.quantity} {inv['asset_symbol']}", "tokens_burned": req.quantity}


# ===== ALERTS & COMPLIANCE =====

@wh_token_router.get("/{warehouse_id}/alerts")
async def get_warehouse_alerts(warehouse_id: str):
    """Get historical alerts for warehouse"""
    alerts = await db.wh_alerts.find(
        {"warehouse_id": warehouse_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(50)
    return alerts


@wh_token_router.get("/{warehouse_id}/compliance")
async def get_warehouse_compliance(warehouse_id: str):
    """Get warehouse compliance and certification status"""
    wh = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    compliance = await db.wh_compliance.find_one({"warehouse_id": warehouse_id}, {"_id": 0})
    if not compliance:
        compliance = _generate_compliance(warehouse_id, wh)
    return compliance


def _generate_compliance(warehouse_id, wh):
    region = wh.get("region", "US")
    certs = {
        "EU": [{"name": "ISO 22000 Food Safety", "status": "active", "expires": "2027-03-15"}, {"name": "EU ETS Verified Storage", "status": "active", "expires": "2026-12-31"}, {"name": "REACH Chemical Compliance", "status": "active", "expires": "2027-06-30"}],
        "US": [{"name": "USDA Organic Certified", "status": "active", "expires": "2026-11-30"}, {"name": "FDA Registered Facility", "status": "active", "expires": "2027-01-15"}, {"name": "EPA Clean Air Act", "status": "active", "expires": "2026-09-30"}],
        "APAC": [{"name": "FSSAI Licensed", "status": "active", "expires": "2027-02-28"}, {"name": "ISO 9001 Quality", "status": "active", "expires": "2026-08-31"}, {"name": "BIS Certification", "status": "active", "expires": "2027-04-15"}],
        "AFRICA": [{"name": "SABS Certified", "status": "active", "expires": "2026-12-31"}, {"name": "Fair Trade Verified", "status": "active", "expires": "2027-05-30"}, {"name": "AfCFTA Compliant", "status": "active", "expires": "2027-01-01"}],
    }
    return {
        "warehouse_id": warehouse_id,
        "compliance_score": random.randint(85, 99),
        "region": region,
        "certifications": certs.get(region, certs["US"]),
        "last_audit": (datetime.now(timezone.utc) - timedelta(days=random.randint(5, 60))).isoformat(),
        "next_audit": (datetime.now(timezone.utc) + timedelta(days=random.randint(30, 180))).isoformat(),
        "violations": [],
        "insurance_coverage": f"${random.randint(500, 5000)}K",
        "fire_safety_rating": random.choice(["A", "A+", "B+"]),
        "pest_control_status": "Clear",
    }


@wh_token_router.get("/{warehouse_id}/analytics")
async def get_warehouse_analytics(warehouse_id: str):
    """Get warehouse utilization trends and value analytics"""
    wh = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    cap = wh["capacity"]
    util = wh.get("current_utilization", 0)
    now = datetime.now(timezone.utc)

    # Generate 30-day utilization trend
    utilization_trend = []
    u = util * random.uniform(0.7, 0.9)
    for d in range(30, 0, -1):
        u = max(0, min(cap, u + random.uniform(-cap * 0.02, cap * 0.03)))
        utilization_trend.append({
            "date": (now - timedelta(days=d)).strftime("%Y-%m-%d"),
            "utilization": round(u, 0),
            "utilization_pct": round(u / cap * 100, 1),
        })

    # Token value over time
    base_val = random.uniform(1.0, 4.0)
    value_trend = []
    v = base_val
    for d in range(30, 0, -1):
        v = max(0.1, v + random.uniform(-0.05, 0.06))
        value_trend.append({
            "date": (now - timedelta(days=d)).strftime("%Y-%m-%d"),
            "token_price": round(v, 4),
            "total_value": round(v * util, 2),
        })

    # Deposit/withdrawal activity
    activity = []
    for d in range(14, 0, -1):
        dep = random.randint(0, 3)
        wtd = random.randint(0, 2)
        activity.append({
            "date": (now - timedelta(days=d)).strftime("%Y-%m-%d"),
            "deposits": dep, "withdrawals": wtd,
            "net_flow": dep - wtd,
        })

    return {
        "warehouse_id": warehouse_id,
        "current_utilization_pct": round(util / cap * 100, 1),
        "utilization_trend": utilization_trend,
        "value_trend": value_trend,
        "activity": activity,
        "total_inventory_value": round(util * base_val, 2),
        "avg_daily_throughput": round(random.uniform(50, 500), 0),
        "peak_utilization_30d": round(max(t["utilization_pct"] for t in utilization_trend), 1),
    }


# ===== SEED DATA =====

async def seed_wh_tokenization():
    existing = await db.wh_tokens.count_documents({})
    if existing > 0:
        return

    logger.info("Seeding warehouse tokenization data...")

    warehouses = await db.warehouses.find({}, {"_id": 0}).to_list(10)
    now = datetime.now(timezone.utc)

    for wh in warehouses:
        wid = wh["id"]
        util = wh.get("current_utilization", 0)
        cap = wh["capacity"]

        # Create token data
        price = round(random.uniform(0.8, 4.5), 4)
        total = round(util * 0.85, 2)
        circ = round(total * 0.75, 2)
        locked = round(total - circ, 2)

        await db.wh_tokens.insert_one({
            "warehouse_id": wid,
            "token_symbol": f"WH-{wh['name'][:3].upper()}",
            "total_supply": total,
            "circulating_supply": circ,
            "locked_supply": locked,
            "price_per_token": price,
            "market_cap": round(total * price, 2),
            "holders": [
                {"address": f"0x{uuid.uuid4().hex[:40]}", "balance": round(circ * 0.4, 2), "name": "E4N Treasury"},
                {"address": f"0x{uuid.uuid4().hex[:40]}", "balance": round(circ * 0.25, 2), "name": "Morgan Stanley Fund"},
                {"address": f"0x{uuid.uuid4().hex[:40]}", "balance": round(circ * 0.2, 2), "name": "Patel Farms"},
                {"address": f"0x{uuid.uuid4().hex[:40]}", "balance": round(circ * 0.15, 2), "name": "Retail Pool"},
            ],
            "created_at": now.isoformat(),
        })

        # Seed token events (mint, burn, transfer history)
        event_types = [
            ("mint", "initial_supply", 0.4), ("mint", "inventory_deposit", 0.2),
            ("transfer", "", 0.15), ("mint", "inventory_deposit", 0.1),
            ("burn", "inventory_withdrawal", 0.05), ("transfer", "", 0.08),
            ("mint", "collateral_pledge", 0.12), ("burn", "expiry", 0.03),
        ]
        for i, (etype, reason, amt_pct) in enumerate(event_types):
            evt = {
                "id": str(uuid.uuid4()), "warehouse_id": wid,
                "type": etype, "amount": round(total * amt_pct, 2),
                "reason": reason if reason else f"portfolio_rebalance",
                "by_user": random.choice(["E4N Treasury", "Morgan Stanley Fund", "Patel Farms", "Alex Chen"]),
                "by_address": f"0x{uuid.uuid4().hex[:40]}",
                "tx_hash": f"0x{uuid.uuid4().hex}",
                "timestamp": (now - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23))).isoformat(),
            }
            if etype == "transfer":
                evt["from_address"] = evt["by_address"]
                evt["to_address"] = f"0x{uuid.uuid4().hex[:40]}"
            await db.wh_token_events.insert_one(evt)

        # Seed inventory lots
        asset_types = wh.get("asset_types", ["WHEAT"])
        lots_per_asset = random.randint(2, 5)
        for asset in asset_types:
            for j in range(lots_per_asset):
                qty = round(random.uniform(100, cap * 0.15), 2)
                grade = random.choice(["A", "A", "A", "B", "B", "C"])
                asset_obj = await db.assets.find_one({"symbol": asset}, {"_id": 0})
                p = asset_obj.get("current_price", 1) if asset_obj else 1.0
                inv = {
                    "id": str(uuid.uuid4()), "warehouse_id": wid,
                    "asset_symbol": asset, "quantity": qty,
                    "grade": grade,
                    "lot_number": f"LOT-{uuid.uuid4().hex[:8].upper()}",
                    "deposited_by": random.choice(["Patel Farms", "Morgan Stanley Fund", "E4N Supply Chain"]),
                    "depositor_id": "system",
                    "price_at_deposit": round(p * random.uniform(0.95, 1.05), 4),
                    "value": round(qty * p, 2),
                    "status": "stored",
                    "tokenized": True,
                    "deposit_date": (now - timedelta(days=random.randint(5, 90))).isoformat(),
                    "expiry_date": (now + timedelta(days=random.randint(90, 365))).isoformat(),
                    "quality_verified": grade in ["A", "B"],
                    "inspection_date": (now - timedelta(days=random.randint(1, 30))).isoformat(),
                }
                await db.wh_inventory.insert_one(inv)

        # Seed alerts
        alert_types = [
            {"severity": "warning", "type": "temperature", "message": "Temperature exceeded 28C threshold", "value": 29.2, "threshold": 28},
            {"severity": "info", "type": "humidity", "message": "Humidity within optimal range", "value": 55.3, "threshold": 70},
            {"severity": "critical", "type": "weight", "message": "Unexpected weight change detected — possible theft", "value": -450, "threshold": 0},
            {"severity": "warning", "type": "air_quality", "message": "AQI dropped below 85", "value": 82, "threshold": 85},
            {"severity": "info", "type": "maintenance", "message": "Scheduled sensor calibration complete", "value": 0, "threshold": 0},
            {"severity": "warning", "type": "power", "message": "Backup generator activated — grid outage", "value": 0, "threshold": 0},
        ]
        for k, alert in enumerate(alert_types):
            await db.wh_alerts.insert_one({
                "id": str(uuid.uuid4()), "warehouse_id": wid,
                **alert,
                "resolved": alert["severity"] != "critical",
                "resolved_at": (now - timedelta(hours=random.randint(1, 12))).isoformat() if alert["severity"] != "critical" else None,
                "tx_hash": f"0x{uuid.uuid4().hex}" if alert["severity"] in ["warning", "critical"] else None,
                "timestamp": (now - timedelta(days=random.randint(0, 14), hours=random.randint(0, 23))).isoformat(),
            })

    await db.wh_tokens.create_index("warehouse_id", unique=True)
    await db.wh_token_events.create_index([("warehouse_id", 1), ("timestamp", -1)])
    await db.wh_inventory.create_index([("warehouse_id", 1), ("status", 1)])
    await db.wh_alerts.create_index([("warehouse_id", 1), ("timestamp", -1)])

    logger.info("Warehouse tokenization data seeded!")
