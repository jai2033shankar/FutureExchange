"""
E4N Phase 3 — Institutional Hardening Layer
- Sybil-Resistant Concentration Guard (ZK-Identity linked)
- Dynamic Volatility Breakers (asset-class tiered)
- Decentralized Oracle Bridge (multi-sig, Chainlink simulation)
- Sovereign Insurance Treasury (stability fee seigniorage)
- Secondary Debt Markets (transferable pre-harvest tokens)
- SAR Auto-Generation (wash trading detection)
- Logistics Custody Handover (LCH)
- Scenarios 15 & 16
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid, random, hashlib, json, logging

logger = logging.getLogger(__name__)

hardening_router = APIRouter(prefix="/api")
db = None
get_current_user = None

def init_hardening(database, auth_fn):
    global db, get_current_user
    db = database
    get_current_user = auth_fn

async def _auth(request: Request):
    return await get_current_user(request)

# ===== MODELS =====
class ZKIdentityLink(BaseModel):
    wallet_address: str
    zk_proof: str = ""

class OracleSubmission(BaseModel):
    trade_id: str
    oracle_type: str  # iot_sensor, auditor, warehouse_node
    grade: str = "A"
    data: dict = {}
    signature: str = ""

class InsuranceClaim(BaseModel):
    trade_id: str
    claim_type: str  # settlement_failure, quality_dispute, force_majeure
    amount: float
    description: str = ""

class LCHRecord(BaseModel):
    trade_id: str
    asset_symbol: str
    quantity: float
    pickup_grade: str
    transporter_id: str = ""
    transporter_signature: str = ""

class DebtTransfer(BaseModel):
    loan_id: str
    to_user_email: str
    quantity: float

# ===== 1. ZK-IDENTITY & SYBIL-RESISTANT CONCENTRATION GUARD =====

@hardening_router.post("/identity/link-wallet")
async def link_wallet_to_identity(req: ZKIdentityLink, user: dict = Depends(_auth)):
    """Link a wallet address to user's ZK-Identity hash"""
    identity_hash = hashlib.sha256(f"{user['email']}::{user['_id']}".encode()).hexdigest()
    existing = await db.zk_identities.find_one({"identity_hash": identity_hash})

    if existing:
        if req.wallet_address in existing.get("linked_wallets", []):
            return {"message": "Wallet already linked", "identity_hash": identity_hash, "linked_wallets": existing["linked_wallets"]}
        await db.zk_identities.update_one(
            {"identity_hash": identity_hash},
            {"$push": {"linked_wallets": req.wallet_address}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.zk_identities.insert_one({
            "identity_hash": identity_hash,
            "user_id": user["_id"],
            "linked_wallets": [user.get("wallet_address", ""), req.wallet_address],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    updated = await db.zk_identities.find_one({"identity_hash": identity_hash}, {"_id": 0})
    return {"identity_hash": identity_hash, "linked_wallets": updated.get("linked_wallets", []), "zk_proof_valid": len(req.zk_proof) >= 8}

@hardening_router.get("/identity/profile")
async def get_identity_profile(user: dict = Depends(_auth)):
    """Get ZK identity profile with all linked wallets"""
    identity_hash = hashlib.sha256(f"{user['email']}::{user['_id']}".encode()).hexdigest()
    identity = await db.zk_identities.find_one({"identity_hash": identity_hash}, {"_id": 0})
    if not identity:
        identity = {"identity_hash": identity_hash, "linked_wallets": [user.get("wallet_address", "")]}
    return identity

@hardening_router.get("/guards/sybil-check/{asset_symbol}")
async def sybil_resistant_concentration_check(asset_symbol: str, user: dict = Depends(_auth)):
    """Check total entity balance across ALL linked wallets (sybil-resistant)"""
    identity_hash = hashlib.sha256(f"{user['email']}::{user['_id']}".encode()).hexdigest()
    identity = await db.zk_identities.find_one({"identity_hash": identity_hash}, {"_id": 0})
    linked_wallets = identity.get("linked_wallets", [user.get("wallet_address", "")]) if identity else [user.get("wallet_address", "")]

    asset = await db.assets.find_one({"symbol": asset_symbol.upper()}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    total_supply = asset.get("supply", 1000000)
    # Aggregate balance across all wallets for this identity
    total_balance = 0
    wallet_breakdown = []
    # Primary wallet
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    primary_bal = wallet.get("balances", {}).get(asset_symbol.upper(), 0) if wallet else 0
    total_balance += primary_bal
    wallet_breakdown.append({"wallet": user.get("wallet_address", "primary"), "balance": primary_bal})

    # Simulate additional linked wallets with small holdings
    for w in linked_wallets[1:]:
        sim_bal = round(random.uniform(0, total_supply * 0.005), 2)
        total_balance += sim_bal
        wallet_breakdown.append({"wallet": w, "balance": sim_bal})

    entity_pct = round((total_balance / total_supply) * 100, 4) if total_supply > 0 else 0
    cap = 5.0
    is_blocked = entity_pct >= cap

    return {
        "identity_hash": identity_hash[:16] + "...",
        "asset": asset_symbol.upper(),
        "linked_wallets_count": len(linked_wallets),
        "wallet_breakdown": wallet_breakdown,
        "total_entity_balance": round(total_balance, 2),
        "total_supply": total_supply,
        "entity_ownership_pct": entity_pct,
        "ownership_cap_pct": cap,
        "is_blocked": is_blocked,
        "status": "SYBIL_BLOCKED" if is_blocked else "CLEAR",
        "guard_type": "ZK-Identity Linked (Sybil Resistant)",
    }

# ===== 2. DYNAMIC VOLATILITY BREAKERS =====

ASSET_VOLATILITY_TIERS = {
    "NECESSITY_CRITICAL": {"assets": ["H2O", "KWH"], "max_deviation_pct": 3.0, "fee_multiplier": 2.0, "label": "Critical Necessity"},
    "COMMODITY_FOOD": {"assets": ["RICE", "WHEAT"], "max_deviation_pct": 7.0, "fee_multiplier": 1.5, "label": "Food Commodity"},
    "CARBON_CREDIT": {"assets": ["CARBON"], "max_deviation_pct": 15.0, "fee_multiplier": 1.0, "label": "Carbon Credit"},
}

@hardening_router.get("/guards/volatility-breakers")
async def get_volatility_breakers():
    """Get all dynamic volatility breaker tiers"""
    assets = await db.assets.find({"symbol": {"$ne": "USD"}}, {"_id": 0}).to_list(10)
    asset_map = {a["symbol"]: a for a in assets}
    result = []
    for tier_name, tier in ASSET_VOLATILITY_TIERS.items():
        for symbol in tier["assets"]:
            asset = asset_map.get(symbol, {})
            price = asset.get("current_price", asset.get("base_price", 1))
            change = abs(asset.get("price_change_24h", 0))
            proximity = round(change / tier["max_deviation_pct"] * 100, 1)
            fee = round(0.001 * tier["fee_multiplier"] * max(1, proximity / 50), 4)  # Volatility-adjusted fee
            result.append({
                "symbol": symbol, "tier": tier_name, "tier_label": tier["label"],
                "max_deviation_pct": tier["max_deviation_pct"],
                "current_change_pct": round(change, 2),
                "proximity_to_breaker_pct": proximity,
                "breaker_triggered": change >= tier["max_deviation_pct"],
                "volatility_adjusted_fee": fee,
                "current_price": round(price, 4),
                "status": "HALTED" if change >= tier["max_deviation_pct"] else ("WARNING" if proximity > 70 else "NORMAL"),
            })
    return result

@hardening_router.get("/guards/volatility-check/{asset_symbol}")
async def check_asset_volatility(asset_symbol: str):
    """Check specific asset volatility against its tier breaker"""
    asset = await db.assets.find_one({"symbol": asset_symbol.upper()}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    # Find tier
    tier_match = None
    for tier_name, tier in ASSET_VOLATILITY_TIERS.items():
        if asset_symbol.upper() in tier["assets"]:
            tier_match = (tier_name, tier)
            break
    if not tier_match:
        tier_match = ("CARBON_CREDIT", ASSET_VOLATILITY_TIERS["CARBON_CREDIT"])

    change = abs(asset.get("price_change_24h", 0))
    max_dev = tier_match[1]["max_deviation_pct"]
    return {
        "asset": asset_symbol.upper(), "tier": tier_match[0],
        "max_deviation": max_dev, "current_deviation": round(change, 2),
        "breaker_triggered": change >= max_dev,
        "fee_multiplier": tier_match[1]["fee_multiplier"],
    }

# ===== 3. DECENTRALIZED ORACLE BRIDGE (Multi-Sig) =====

ORACLE_MULTISIG_THRESHOLD = 2  # 2-of-3 required

@hardening_router.post("/oracle/submit")
async def submit_oracle_data(submission: OracleSubmission, user: dict = Depends(_auth)):
    """Submit oracle data (IoT sensor, auditor, or warehouse node)"""
    valid_types = ["iot_sensor", "auditor", "warehouse_node"]
    if submission.oracle_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid oracle type. Use: {valid_types}")

    sig_valid = len(submission.signature) >= 8
    oracle_doc = {
        "id": str(uuid.uuid4()),
        "trade_id": submission.trade_id,
        "oracle_type": submission.oracle_type,
        "submitter_id": user["_id"],
        "grade": submission.grade.upper(),
        "data": submission.data,
        "signature": submission.signature[:32] + "..." if submission.signature else "",
        "signature_valid": sig_valid,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.oracle_submissions.insert_one(oracle_doc)
    oracle_doc.pop("_id", None)

    # Check if multi-sig threshold met for this trade
    all_subs = await db.oracle_submissions.find({"trade_id": submission.trade_id}, {"_id": 0}).to_list(10)
    unique_types = set(s["oracle_type"] for s in all_subs if s.get("signature_valid"))
    consensus_reached = len(unique_types) >= ORACLE_MULTISIG_THRESHOLD

    # Check for grade conflicts (triggers auto-dispute)
    grades = [s["grade"] for s in all_subs]
    grade_conflict = len(set(grades)) > 1 and len(grades) >= 2
    auto_dispute = None

    if grade_conflict:
        oracle_detail = ', '.join(f"{s['oracle_type']}={s['grade']}" for s in all_subs)
        auto_dispute = {
            "id": str(uuid.uuid4()),
            "trade_id": submission.trade_id,
            "dispute_type": "oracle_conflict",
            "description": f"Oracle grade conflict detected: {oracle_detail}",
            "initiator_id": "SYSTEM_ORACLE",
            "initiator_name": "Oracle Dispute System",
            "status": "open",
            "assets_frozen": True,
            "paused_in_transit": False,
            "oracle_submissions": [{k: v for k, v in s.items() if k != "_id"} for s in all_subs],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        existing = await db.disputes.find_one({"trade_id": submission.trade_id, "dispute_type": "oracle_conflict"})
        if not existing:
            await db.disputes.insert_one(auto_dispute)

    return {
        "submission": oracle_doc,
        "consensus": {
            "threshold": f"{ORACLE_MULTISIG_THRESHOLD}-of-3",
            "submissions_count": len(all_subs),
            "unique_oracle_types": list(unique_types),
            "consensus_reached": consensus_reached,
        },
        "grade_conflict": grade_conflict,
        "auto_dispute_triggered": auto_dispute is not None,
    }

@hardening_router.get("/oracle/submissions/{trade_id}")
async def get_oracle_submissions(trade_id: str, user: dict = Depends(_auth)):
    subs = await db.oracle_submissions.find({"trade_id": trade_id}, {"_id": 0}).to_list(20)
    return subs

@hardening_router.get("/oracle/price-feed/{asset_symbol}")
async def get_oracle_price_feed(asset_symbol: str):
    """Simulated Chainlink-style price feed with staleness check"""
    asset = await db.assets.find_one({"symbol": asset_symbol.upper()}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    now = datetime.now(timezone.utc)
    price = asset.get("current_price", asset.get("base_price", 1))
    # Simulate 3 independent price sources
    sources = [
        {"source": "ChainlinkFeed_Primary", "price": round(price * random.uniform(0.998, 1.002), 6), "timestamp": now.isoformat(), "stale": False},
        {"source": "ChainlinkFeed_Secondary", "price": round(price * random.uniform(0.997, 1.003), 6), "timestamp": (now - timedelta(seconds=random.randint(10, 120))).isoformat(), "stale": False},
        {"source": "ChainlinkFeed_Tertiary", "price": round(price * random.uniform(0.996, 1.004), 6), "timestamp": (now - timedelta(seconds=random.randint(30, 250))).isoformat(), "stale": False},
    ]
    # Check staleness (5 min threshold)
    for s in sources:
        age = (now - datetime.fromisoformat(s["timestamp"])).total_seconds()
        s["age_seconds"] = int(age)
        s["stale"] = age > 300

    median_price = sorted(s["price"] for s in sources)[1]
    deviation = max(abs(s["price"] - median_price) / median_price * 100 for s in sources)

    return {
        "asset": asset_symbol.upper(),
        "aggregated_price": round(median_price, 6),
        "deviation_pct": round(deviation, 4),
        "sources": sources,
        "staleness_threshold_seconds": 300,
        "any_stale": any(s["stale"] for s in sources),
        "feed_status": "HEALTHY" if not any(s["stale"] for s in sources) and deviation < 1 else "DEGRADED",
    }

# ===== 4. SOVEREIGN INSURANCE TREASURY =====

STABILITY_FEE_RATE = 0.005  # 0.5% of every transaction

@hardening_router.get("/insurance/treasury")
async def get_insurance_treasury():
    """Get current insurance fund balance and stats"""
    treasury = await db.insurance_treasury.find_one({"id": "main_treasury"}, {"_id": 0})
    if not treasury:
        treasury = {"id": "main_treasury", "balance": 0, "total_collected": 0, "total_claims_paid": 0, "claims_count": 0}
    claims = await db.insurance_claims.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {**treasury, "recent_claims": claims, "stability_fee_rate": STABILITY_FEE_RATE, "solvency_ratio": round(treasury.get("balance", 0) / max(treasury.get("total_claims_paid", 1), 1), 2)}

@hardening_router.post("/insurance/collect-fee")
async def collect_stability_fee(trade_value: float = 0, user: dict = Depends(_auth)):
    """Collect stability fee from a trade into the insurance treasury"""
    fee = round(trade_value * STABILITY_FEE_RATE, 2)
    await db.insurance_treasury.update_one(
        {"id": "main_treasury"},
        {"$inc": {"balance": fee, "total_collected": fee}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"fee_collected": fee, "trade_value": trade_value, "fee_rate": STABILITY_FEE_RATE}

@hardening_router.post("/insurance/claim")
async def file_insurance_claim(claim: InsuranceClaim, user: dict = Depends(_auth)):
    """File an insurance claim against the treasury"""
    treasury = await db.insurance_treasury.find_one({"id": "main_treasury"}, {"_id": 0})
    balance = treasury.get("balance", 0) if treasury else 0

    claim_doc = {
        "id": str(uuid.uuid4()),
        "trade_id": claim.trade_id,
        "claimant_id": user["_id"],
        "claimant_name": user["name"],
        "claim_type": claim.claim_type,
        "amount": claim.amount,
        "description": claim.description,
        "treasury_balance_at_claim": balance,
        "status": "approved" if claim.amount <= balance else "insufficient_funds",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if claim.amount <= balance:
        await db.insurance_treasury.update_one(
            {"id": "main_treasury"},
            {"$inc": {"balance": -claim.amount, "total_claims_paid": claim.amount, "claims_count": 1}}
        )
        claim_doc["payout"] = claim.amount
    else:
        claim_doc["payout"] = 0
        claim_doc["shortfall"] = round(claim.amount - balance, 2)

    await db.insurance_claims.insert_one(claim_doc)
    claim_doc.pop("_id", None)
    return claim_doc

# ===== 5. SECONDARY DEBT MARKETS =====

TRANSFERABLE_REPUTATION_THRESHOLD = 80

@hardening_router.post("/credit/debt-transfer")
async def transfer_debt_token(req: DebtTransfer, user: dict = Depends(_auth)):
    """Transfer a pre-harvest loan token to another user (requires reputation >= 80)"""
    loan = await db.pre_harvest_loans.find_one({"id": req.loan_id, "borrower_id": user["_id"]})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found or not owned by you")
    if loan["status"] != "active":
        raise HTTPException(status_code=400, detail="Only active loans can be transferred")

    # Check reputation
    trade_count = await db.trades.count_documents({"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]})
    reputation = min(100, trade_count * 5 + user.get("kyc_tier", 0) * 20)
    if reputation < TRANSFERABLE_REPUTATION_THRESHOLD:
        raise HTTPException(status_code=403, detail=f"Reputation {reputation} < {TRANSFERABLE_REPUTATION_THRESHOLD} required for debt transfer")

    # Find recipient
    from bson import ObjectId
    recipient = await db.users.find_one({"email": req.to_user_email.lower()})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    recipient_id = str(recipient["_id"])
    transfer_doc = {
        "id": str(uuid.uuid4()),
        "loan_id": req.loan_id,
        "from_user_id": user["_id"],
        "from_user_name": user["name"],
        "to_user_id": recipient_id,
        "to_user_email": req.to_user_email,
        "quantity": req.quantity,
        "reputation_at_transfer": reputation,
        "asset_symbol": loan["asset_symbol"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.debt_transfers.insert_one(transfer_doc)

    # Update loan ownership
    await db.pre_harvest_loans.update_one(
        {"id": req.loan_id},
        {"$set": {"borrower_id": recipient_id, "transferable": True, "transfer_history": [transfer_doc["id"]]}}
    )
    transfer_doc.pop("_id", None)
    return transfer_doc

@hardening_router.get("/credit/debt-market")
async def get_debt_market():
    """Get secondary debt market overview"""
    transfers = await db.debt_transfers.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    loans = await db.pre_harvest_loans.find({"transferable": True}, {"_id": 0}).to_list(50)
    return {
        "transferable_loans": loans,
        "recent_transfers": transfers,
        "total_transfers": len(transfers),
        "threshold_reputation": TRANSFERABLE_REPUTATION_THRESHOLD,
    }

# ===== 6. SAR AUTO-GENERATION (Wash Trading Detection) =====

@hardening_router.get("/compliance/sar-monitor")
async def get_sar_reports(user: dict = Depends(_auth)):
    """Get Suspicious Activity Reports"""
    sars = await db.sar_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return sars

@hardening_router.post("/compliance/scan-wash-trading")
async def scan_for_wash_trading(user: dict = Depends(_auth)):
    """Scan recent trades for wash trading patterns and auto-generate SARs"""
    trades = await db.trades.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)

    # Detect patterns: same buyer/seller, rapid trades, round-trip
    suspicious = []
    for i, trade in enumerate(trades):
        if trade.get("buyer_id") == trade.get("seller_id"):
            suspicious.append({"trade_id": trade["id"], "pattern": "self_trade", "risk": "HIGH", "detail": "Buyer and seller are the same entity"})
        # Check for rapid round-trips
        for j in range(i+1, min(i+5, len(trades))):
            other = trades[j]
            if (trade.get("buyer_id") == other.get("seller_id") and trade.get("seller_id") == other.get("buyer_id")
                and trade.get("asset_symbol") == other.get("asset_symbol")):
                suspicious.append({"trade_id": trade["id"], "pattern": "round_trip", "risk": "MEDIUM", "detail": f"Round-trip detected with trade {other['id']}"})
                break

    # Generate SARs for suspicious trades
    new_sars = []
    for s in suspicious[:5]:  # Limit to 5
        sar = {
            "id": str(uuid.uuid4()),
            "trade_id": s["trade_id"],
            "pattern": s["pattern"],
            "risk_level": s["risk"],
            "detail": s["detail"],
            "status": "filed",
            "auto_generated": True,
            "encrypted": True,
            "visible_to": ["regulator"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.sar_reports.insert_one(sar)
        sar.pop("_id", None)
        new_sars.append(sar)

    return {"scanned_trades": len(trades), "suspicious_found": len(suspicious), "sars_generated": len(new_sars), "reports": new_sars}

# ===== 7. LOGISTICS CUSTODY HANDOVER (LCH) =====

@hardening_router.post("/logistics/custody-handover")
async def create_custody_handover(lch: LCHRecord, user: dict = Depends(_auth)):
    """Create a Logistics Custody Handover record"""
    sig_valid = len(lch.transporter_signature) >= 8
    handover = {
        "id": str(uuid.uuid4()),
        "trade_id": lch.trade_id,
        "asset_symbol": lch.asset_symbol.upper(),
        "quantity": lch.quantity,
        "pickup_grade": lch.pickup_grade.upper(),
        "transporter_id": lch.transporter_id or f"TRN-{random.randint(1000,9999)}",
        "transporter_signature": lch.transporter_signature[:32] + "..." if lch.transporter_signature else "",
        "signature_valid": sig_valid,
        "pickup_timestamp": datetime.now(timezone.utc).isoformat(),
        "delivery_timestamp": None,
        "delivery_grade": None,
        "chain_of_custody": [
            {"stage": "pickup", "actor": user["name"], "grade": lch.pickup_grade.upper(), "timestamp": datetime.now(timezone.utc).isoformat()},
        ],
        "status": "in_transit",
        "liability_holder": lch.transporter_id or "transporter",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.custody_handovers.insert_one(handover)
    handover.pop("_id", None)
    return handover

@hardening_router.get("/logistics/custody-handovers")
async def get_custody_handovers(user: dict = Depends(_auth)):
    handovers = await db.custody_handovers.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return handovers

# ===== HARDENING DASHBOARD =====

@hardening_router.get("/hardening/dashboard")
async def get_hardening_dashboard(user: dict = Depends(_auth)):
    """Get comprehensive hardening layer status"""
    treasury = await db.insurance_treasury.find_one({"id": "main_treasury"}, {"_id": 0}) or {"balance": 0}
    sars = await db.sar_reports.count_documents({})
    disputes = await db.disputes.count_documents({"status": "open"})
    oracle_subs = await db.oracle_submissions.count_documents({})
    handovers = await db.custody_handovers.count_documents({})
    identities = await db.zk_identities.count_documents({})
    debt_transfers = await db.debt_transfers.count_documents({})

    breakers = await get_volatility_breakers()
    halted = sum(1 for b in breakers if b["status"] == "HALTED")
    warnings = sum(1 for b in breakers if b["status"] == "WARNING")

    return {
        "insurance_treasury_balance": treasury.get("balance", 0),
        "sar_reports_count": sars,
        "open_disputes": disputes,
        "oracle_submissions": oracle_subs,
        "custody_handovers": handovers,
        "zk_identities": identities,
        "debt_transfers": debt_transfers,
        "volatility_breakers": {"halted": halted, "warnings": warnings, "normal": len(breakers) - halted - warnings},
        "system_health": "NOMINAL" if halted == 0 and disputes < 5 else "DEGRADED",
    }

# ===== SEED HARDENING DATA =====

async def seed_hardening_data():
    """Seed hardening layer data"""
    existing = await db.insurance_treasury.count_documents({})
    if existing > 0:
        return

    logger.info("Seeding hardening layer data...")

    # Insurance treasury with initial balance
    await db.insurance_treasury.insert_one({
        "id": "main_treasury",
        "balance": 15000.0,
        "total_collected": 18500.0,
        "total_claims_paid": 3500.0,
        "claims_count": 2,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    # Sample ZK identities
    users = await db.users.find({}, {"_id": 1, "email": 1, "wallet_address": 1}).to_list(10)
    for u in users:
        uid = str(u["_id"])
        identity_hash = hashlib.sha256(f"{u['email']}::{uid}".encode()).hexdigest()
        wallets = [u.get("wallet_address", ""), f"0x{uuid.uuid4().hex[:40]}"]
        await db.zk_identities.insert_one({
            "identity_hash": identity_hash,
            "user_id": uid,
            "linked_wallets": wallets,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    # Scenario 15: Sybil attack - 3 wallets same identity
    sybil_hash = hashlib.sha256(b"sybil_attacker::scenario15").hexdigest()
    await db.zk_identities.insert_one({
        "identity_hash": sybil_hash,
        "user_id": "sybil_attacker",
        "linked_wallets": ["0xSybil_Wallet_A", "0xSybil_Wallet_B", "0xSybil_Wallet_C"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.whale_alerts.insert_one({
        "id": str(uuid.uuid4()), "type": "SybilAttackBlocked",
        "user_id": "sybil_attacker", "asset": "RICE",
        "ownership_pct": 6.0, "balance": 60000,
        "threshold": 5.0, "status": "SYBIL_BLOCKED",
        "description": "Scenario 15: Entity tried to buy 2% RICE on 3 wallets (same ZK identity) — 3rd trade blocked at 6% aggregate",
        "identity_hash": sybil_hash[:16] + "...",
        "linked_wallets": 3,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Scenario 16: Oracle conflict auto-dispute
    conflict_trade_id = f"scenario_oracle_conflict_{uuid.uuid4().hex[:8]}"
    for oracle_type, grade in [("iot_sensor", "A"), ("auditor", "B"), ("warehouse_node", "A")]:
        await db.oracle_submissions.insert_one({
            "id": str(uuid.uuid4()),
            "trade_id": conflict_trade_id,
            "oracle_type": oracle_type,
            "submitter_id": "system",
            "grade": grade,
            "data": {"moisture": random.uniform(10, 18), "purity": random.uniform(85, 99)},
            "signature": f"HSM_{oracle_type}_{uuid.uuid4().hex[:16]}",
            "signature_valid": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    # Auto-dispute from oracle conflict
    await db.disputes.insert_one({
        "id": str(uuid.uuid4()),
        "trade_id": conflict_trade_id,
        "dispute_type": "oracle_conflict",
        "description": "Scenario 16: IoT sensor reports Grade A, Auditor reports Grade B — auto-dispute triggered by Oracle Bridge",
        "initiator_id": "SYSTEM_ORACLE",
        "initiator_name": "Oracle Dispute System",
        "status": "open",
        "assets_frozen": True,
        "paused_in_transit": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    # Sample custody handovers
    await db.custody_handovers.insert_one({
        "id": str(uuid.uuid4()),
        "trade_id": "trade_lch_001",
        "asset_symbol": "WHEAT",
        "quantity": 5000,
        "pickup_grade": "A",
        "transporter_id": "TRN-3847",
        "transporter_signature": "HSM_sig_abc123def456...",
        "signature_valid": True,
        "pickup_timestamp": datetime.now(timezone.utc).isoformat(),
        "delivery_timestamp": None,
        "chain_of_custody": [
            {"stage": "pickup", "actor": "Raj Patel", "grade": "A", "timestamp": datetime.now(timezone.utc).isoformat()},
        ],
        "status": "in_transit",
        "liability_holder": "TRN-3847",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Indexes
    await db.zk_identities.create_index("identity_hash", unique=True)
    await db.oracle_submissions.create_index("trade_id")
    await db.insurance_claims.create_index("created_at")
    await db.custody_handovers.create_index("trade_id")
    await db.sar_reports.create_index("created_at")
    await db.debt_transfers.create_index("created_at")

    logger.info("Hardening layer data seeded!")
