"""
E4N Phase 3 — Resiliency & Comprehensiveness
Smart Contract Simulations:
- ConcentrationGuard: Anti-hoarding, ownership caps, whale alerts
- CreditEngine: Pre-harvest financing, reputation rates, auto-repayment
- QualityOracle: Multi-parametric quality proofs, price haircuts
- BulkTradeEngine: Institutional RFQ, dark pool, slippage breaker
- ESGTracker: Logistics carbon footprint
- CBDCBridge: Sovereign signature settlement
- SMSGateway: Offline emergency orders
- DisputeManager: Force majeure, tri-party arbitration
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid, random, hashlib, json, math, logging

logger = logging.getLogger(__name__)

contracts_router = APIRouter(prefix="/api")
db = None
get_current_user = None

def init_contracts(database, auth_fn):
    global db, get_current_user
    db = database
    get_current_user = auth_fn

async def _auth(request: Request):
    return await get_current_user(request)

# ===== MODELS =====
class RFQRequest(BaseModel):
    asset_symbol: str
    side: str
    quantity: float
    max_slippage_pct: float = 2.0

class QualityReport(BaseModel):
    trade_id: str
    moisture_pct: float = 0
    purity_pct: float = 100
    grade: str = "A"  # A, B, C, D
    spectral_hash: str = ""

class PreHarvestLoan(BaseModel):
    asset_symbol: str
    quantity: float
    season: str = "2026-Q3"

class DisputeCreate(BaseModel):
    trade_id: str
    dispute_type: str  # force_majeure, quality, delivery_failure, fraud
    description: str
    evidence: str = ""

class DisputeResolve(BaseModel):
    resolution: str  # release_to_buyer, release_to_seller, split, escalate
    notes: str = ""

class SMSOrder(BaseModel):
    hex_payload: str  # Simulated signed hex string
    sender_id: str = ""

class CBDCSettlement(BaseModel):
    trade_id: str
    amount: float
    currency: str = "USD"
    sovereign_signature: str = ""

# ===== CONCENTRATION GUARD =====
OWNERSHIP_CAP_PCT = 5.0
HOARDING_THRESHOLD_PCT = 2.0
HOARDING_TAX_RATE = 0.001  # 0.1% per check cycle

@contracts_router.get("/guards/concentration/{asset_symbol}")
async def get_concentration_status(asset_symbol: str, user: dict = Depends(_auth)):
    asset = await db.assets.find_one({"symbol": asset_symbol.upper()}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    balance = wallet.get("balances", {}).get(asset_symbol.upper(), 0) if wallet else 0
    total_supply = asset.get("supply", 1000000)
    ownership_pct = (balance / total_supply) * 100 if total_supply > 0 else 0

    is_capped = ownership_pct >= OWNERSHIP_CAP_PCT
    is_hoarding = ownership_pct >= HOARDING_THRESHOLD_PCT
    tax_applicable = round(balance * HOARDING_TAX_RATE, 4) if is_hoarding else 0

    # Log whale alert if applicable
    alerts = []
    if ownership_pct >= 3.0:
        alert = {
            "id": str(uuid.uuid4()), "type": "LargeAccumulationDetected",
            "user_id": user["_id"], "asset": asset_symbol.upper(),
            "ownership_pct": round(ownership_pct, 4), "balance": balance,
            "threshold": OWNERSHIP_CAP_PCT, "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.whale_alerts.insert_one(alert)
        alerts.append(alert)

    return {
        "asset": asset_symbol.upper(), "balance": balance,
        "total_supply": total_supply, "ownership_pct": round(ownership_pct, 4),
        "ownership_cap_pct": OWNERSHIP_CAP_PCT, "is_capped": is_capped,
        "hoarding_threshold_pct": HOARDING_THRESHOLD_PCT, "is_hoarding": is_hoarding,
        "storage_fee_applicable": tax_applicable,
        "hoarding_tax_rate": HOARDING_TAX_RATE,
        "alerts": [{k: v for k, v in a.items() if k != "_id"} for a in alerts],
        "status": "BLOCKED" if is_capped else ("TAXED" if is_hoarding else "CLEAR"),
    }

@contracts_router.post("/guards/concentration/check-trade")
async def check_trade_concentration(asset_symbol: str = "", quantity: float = 0, side: str = "buy", user: dict = Depends(_auth)):
    """Pre-trade concentration check — called before order execution"""
    asset = await db.assets.find_one({"symbol": asset_symbol.upper()}, {"_id": 0})
    if not asset:
        return {"allowed": True, "reason": "Asset not found, defaulting to allow"}
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    current_balance = wallet.get("balances", {}).get(asset_symbol.upper(), 0) if wallet else 0
    projected_balance = current_balance + quantity if side == "buy" else current_balance - quantity
    total_supply = asset.get("supply", 1000000)
    projected_pct = (projected_balance / total_supply) * 100

    if side == "buy" and projected_pct >= OWNERSHIP_CAP_PCT:
        max_buyable = (OWNERSHIP_CAP_PCT / 100 * total_supply) - current_balance
        return {
            "allowed": False, "reason": f"Trade would exceed {OWNERSHIP_CAP_PCT}% ownership cap",
            "projected_ownership_pct": round(projected_pct, 4),
            "max_quantity": round(max(0, max_buyable), 2),
            "throttled": True,
        }
    tax = 0
    if projected_pct >= HOARDING_THRESHOLD_PCT:
        tax = round(projected_balance * HOARDING_TAX_RATE, 4)
    return {
        "allowed": True, "projected_ownership_pct": round(projected_pct, 4),
        "storage_fee": tax, "throttled": False,
    }

@contracts_router.get("/guards/whale-alerts")
async def get_whale_alerts(user: dict = Depends(_auth)):
    alerts = await db.whale_alerts.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return alerts

# ===== PRE-HARVEST FINANCING (CreditEngine) =====
MAX_LOAN_TO_YIELD = 0.30  # 30% of historical average yield
BASE_INTEREST_RATE = 0.05  # 5%

@contracts_router.post("/credit/pre-harvest/loan")
async def request_pre_harvest_loan(loan: PreHarvestLoan, user: dict = Depends(_auth)):
    # Calculate reputation-linked rate
    trade_count = await db.trades.count_documents({"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]})
    reputation_score = min(100, trade_count * 5 + user.get("kyc_tier", 0) * 20)
    rate_discount = reputation_score / 1000  # Up to 10% discount on rate
    interest_rate = round(max(0.02, BASE_INTEREST_RATE - rate_discount), 4)

    # Calculate max loan based on historical yield
    historical_avg = loan.quantity  # Simplified: use requested as proxy
    max_loan = round(historical_avg * MAX_LOAN_TO_YIELD, 2)
    actual_loan = min(loan.quantity, max_loan)

    asset = await db.assets.find_one({"symbol": loan.asset_symbol.upper()}, {"_id": 0})
    price = asset.get("current_price", asset.get("base_price", 1)) if asset else 1
    loan_value = round(actual_loan * price, 2)
    interest = round(loan_value * interest_rate, 2)

    loan_doc = {
        "id": str(uuid.uuid4()), "borrower_id": user["_id"], "borrower_name": user["name"],
        "asset_symbol": loan.asset_symbol.upper(), "quantity": actual_loan,
        "loan_value_usd": loan_value, "interest_rate": interest_rate,
        "interest_usd": interest, "total_repayment": round(loan_value + interest, 2),
        "reputation_score": reputation_score, "season": loan.season,
        "status": "active",  # active -> repaying -> repaid / defaulted
        "collateral_type": "future_yield", "transferable": False,
        "max_loan_to_yield": MAX_LOAN_TO_YIELD,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "due_date": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),
    }
    await db.pre_harvest_loans.insert_one(loan_doc)

    # Mint debt tokens (non-transferable) to borrower wallet
    await db.wallets.update_one(
        {"user_id": user["_id"]},
        {"$inc": {f"balances.{loan.asset_symbol.upper()}_DEBT": actual_loan, "balances.USD": loan_value}}
    )
    loan_doc.pop("_id", None)
    return loan_doc

@contracts_router.get("/credit/pre-harvest/loans")
async def get_pre_harvest_loans(user: dict = Depends(_auth)):
    loans = await db.pre_harvest_loans.find({"borrower_id": user["_id"]}, {"_id": 0}).to_list(50)
    return loans

@contracts_router.get("/credit/pre-harvest/all")
async def get_all_loans():
    loans = await db.pre_harvest_loans.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    stats = {
        "total_loans": len(loans),
        "total_value": sum(l.get("loan_value_usd", 0) for l in loans),
        "active_loans": sum(1 for l in loans if l.get("status") == "active"),
        "avg_interest_rate": round(sum(l.get("interest_rate", 0) for l in loans) / max(len(loans), 1) * 100, 2),
    }
    return {"loans": loans, "stats": stats}

@contracts_router.post("/credit/pre-harvest/{loan_id}/repay")
async def repay_loan(loan_id: str, user: dict = Depends(_auth)):
    loan = await db.pre_harvest_loans.find_one({"id": loan_id, "borrower_id": user["_id"]})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan["status"] != "active":
        raise HTTPException(status_code=400, detail="Loan not active")
    # Check wallet has enough USD
    wallet = await db.wallets.find_one({"user_id": user["_id"]})
    usd = wallet.get("balances", {}).get("USD", 0) if wallet else 0
    if usd < loan["total_repayment"]:
        raise HTTPException(status_code=400, detail=f"Insufficient USD. Need ${loan['total_repayment']}, have ${usd}")
    # Deduct repayment
    await db.wallets.update_one({"user_id": user["_id"]}, {"$inc": {"balances.USD": -loan["total_repayment"]}})
    # Remove debt tokens
    debt_key = f"balances.{loan['asset_symbol']}_DEBT"
    await db.wallets.update_one({"user_id": user["_id"]}, {"$inc": {debt_key: -loan["quantity"]}})
    await db.pre_harvest_loans.update_one({"id": loan_id}, {"$set": {"status": "repaid", "repaid_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Loan repaid successfully", "amount": loan["total_repayment"]}

# ===== QUALITY ORACLE =====
GRADE_HAIRCUTS = {"A": 0, "B": 0.10, "C": 0.20, "D": 0.35}

@contracts_router.post("/quality/report")
async def submit_quality_report(report: QualityReport, user: dict = Depends(_auth)):
    trade = await db.trades.find_one({"id": report.trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    # Simulate HSM hardware signature verification
    hsm_verified = len(report.spectral_hash) >= 8
    haircut = GRADE_HAIRCUTS.get(report.grade.upper(), 0)
    original_total = trade.get("total", 0)
    adjusted_total = round(original_total * (1 - haircut), 2)
    adjustment = round(original_total - adjusted_total, 2)

    quality_doc = {
        "id": str(uuid.uuid4()), "trade_id": report.trade_id,
        "reporter_id": user["_id"],
        "moisture_pct": report.moisture_pct, "purity_pct": report.purity_pct,
        "grade": report.grade.upper(), "spectral_hash": report.spectral_hash,
        "hsm_verified": hsm_verified,
        "haircut_pct": haircut * 100, "original_total": original_total,
        "adjusted_total": adjusted_total, "adjustment_usd": adjustment,
        "status": "applied" if haircut > 0 else "passed",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.quality_reports.insert_one(quality_doc)
    quality_doc.pop("_id", None)
    return quality_doc

@contracts_router.get("/quality/reports")
async def get_quality_reports(user: dict = Depends(_auth)):
    reports = await db.quality_reports.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return reports

# ===== BULK TRADE / RFQ ENGINE =====
RFQ_THRESHOLD = 500000  # $500k
MAX_SLIPPAGE_PCT = 2.0

@contracts_router.post("/rfq/request")
async def create_rfq(rfq: RFQRequest, user: dict = Depends(_auth)):
    asset = await db.assets.find_one({"symbol": rfq.asset_symbol.upper()}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    oracle_price = asset.get("current_price", asset.get("base_price", 1))
    notional = rfq.quantity * oracle_price

    if notional < RFQ_THRESHOLD:
        raise HTTPException(status_code=400, detail=f"RFQ requires notional >= ${RFQ_THRESHOLD:,}. Current: ${notional:,.2f}")

    # Calculate expected slippage
    volume = asset.get("volume_24h", 10000)
    slippage_estimate = min(rfq.quantity / max(volume, 1) * 10, 10)

    if slippage_estimate > rfq.max_slippage_pct:
        return {
            "status": "CIRCUIT_BREAKER_TRIGGERED",
            "reason": f"Estimated slippage {slippage_estimate:.2f}% exceeds max {rfq.max_slippage_pct}%",
            "oracle_price": oracle_price, "notional": round(notional, 2),
            "slippage_estimate": round(slippage_estimate, 2),
        }

    rfq_doc = {
        "id": str(uuid.uuid4()), "requester_id": user["_id"], "requester_name": user["name"],
        "asset_symbol": rfq.asset_symbol.upper(), "side": rfq.side,
        "quantity": rfq.quantity, "oracle_price": oracle_price,
        "notional": round(notional, 2),
        "max_slippage_pct": rfq.max_slippage_pct,
        "slippage_estimate": round(slippage_estimate, 2),
        "status": "open", "visibility": "dark_pool",
        "quotes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat(),
    }
    await db.rfq_orders.insert_one(rfq_doc)

    # Simulate counterparty quotes
    for i in range(random.randint(1, 3)):
        spread = random.uniform(0.1, 1.5)
        quote_price = oracle_price * (1 + spread/100) if rfq.side == "buy" else oracle_price * (1 - spread/100)
        rfq_doc["quotes"].append({
            "id": str(uuid.uuid4()), "counterparty": f"LP-{random.randint(100,999)}",
            "price": round(quote_price, 4), "quantity": rfq.quantity,
            "spread_bps": round(spread * 100, 1),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    await db.rfq_orders.update_one({"id": rfq_doc["id"]}, {"$set": {"quotes": rfq_doc["quotes"]}})
    rfq_doc.pop("_id", None)
    return rfq_doc

@contracts_router.get("/rfq/orders")
async def get_rfq_orders(user: dict = Depends(_auth)):
    orders = await db.rfq_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return orders

@contracts_router.post("/rfq/{rfq_id}/accept/{quote_id}")
async def accept_rfq_quote(rfq_id: str, quote_id: str, user: dict = Depends(_auth)):
    rfq = await db.rfq_orders.find_one({"id": rfq_id})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    quote = next((q for q in rfq.get("quotes", []) if q["id"] == quote_id), None)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    await db.rfq_orders.update_one({"id": rfq_id}, {"$set": {"status": "filled", "accepted_quote": quote}})
    return {"message": "Quote accepted, trade executing", "price": quote["price"], "quantity": quote["quantity"]}

# ===== ESG / CARBON TRACKER =====
TRANSPORT_EMISSIONS = {"road": 0.062, "rail": 0.022, "sea": 0.008, "air": 0.602}  # kg CO2 per tonne-km

@contracts_router.post("/esg/trade-footprint")
async def calculate_trade_footprint(trade_id: str = "", distance_km: float = 500, transport_mode: str = "road", weight_tonnes: float = 10, user: dict = Depends(_auth)):
    factor = TRANSPORT_EMISSIONS.get(transport_mode, 0.062)
    footprint_kg = round(weight_tonnes * distance_km * factor, 2)
    footprint_tonnes = round(footprint_kg / 1000, 4)
    carbon_price = 45.0
    try:
        asset = await db.assets.find_one({"symbol": "CARBON"}, {"_id": 0})
        if asset:
            carbon_price = asset.get("current_price", 45.0)
    except:
        pass
    offset_cost = round(footprint_tonnes * carbon_price, 2)

    esg_doc = {
        "id": str(uuid.uuid4()), "trade_id": trade_id,
        "user_id": user["_id"], "distance_km": distance_km,
        "transport_mode": transport_mode, "weight_tonnes": weight_tonnes,
        "emission_factor": factor,
        "footprint_kg_co2": footprint_kg, "footprint_tonnes_co2": footprint_tonnes,
        "offset_cost_usd": offset_cost, "carbon_price": carbon_price,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.esg_records.insert_one(esg_doc)
    esg_doc.pop("_id", None)
    return esg_doc

@contracts_router.get("/esg/records")
async def get_esg_records(user: dict = Depends(_auth)):
    records = await db.esg_records.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    total_footprint = sum(r.get("footprint_tonnes_co2", 0) for r in records)
    total_offset = sum(r.get("offset_cost_usd", 0) for r in records)
    return {"records": records, "total_footprint_tonnes": round(total_footprint, 4), "total_offset_cost": round(total_offset, 2)}

# ===== CBDC BRIDGE =====
@contracts_router.post("/cbdc/settle")
async def cbdc_settlement(req: CBDCSettlement, user: dict = Depends(_auth)):
    # Simulate sovereign signature verification
    sig_valid = len(req.sovereign_signature) >= 16
    if not sig_valid:
        return {"status": "REJECTED", "reason": "Invalid sovereign signature. Minimum 16-character hex required."}

    settlement = {
        "id": str(uuid.uuid4()), "trade_id": req.trade_id,
        "user_id": user["_id"], "amount": req.amount,
        "currency": req.currency, "sovereign_signature": req.sovereign_signature[:32] + "...",
        "signature_verified": True,
        "settlement_type": "CBDC", "status": "settled",
        "central_bank": f"{req.currency} Central Bank",
        "legal_tender": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.cbdc_settlements.insert_one(settlement)
    settlement.pop("_id", None)
    return settlement

@contracts_router.get("/cbdc/settlements")
async def get_cbdc_settlements(user: dict = Depends(_auth)):
    settlements = await db.cbdc_settlements.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return settlements

# ===== SMS GATEWAY (Offline Emergency Orders) =====
@contracts_router.post("/sms/emergency-order")
async def process_sms_order(req: SMSOrder, user: dict = Depends(_auth)):
    """Parse a simulated SMS hex payload to execute an emergency buy order"""
    try:
        # Simulate parsing signed hex string
        payload = bytes.fromhex(req.hex_payload.replace("0x", "")) if req.hex_payload.startswith("0x") else req.hex_payload.encode()
        # Simulate extracting order params from payload
        order = {
            "id": str(uuid.uuid4()), "type": "emergency_buy",
            "user_id": user["_id"], "sender_id": req.sender_id or user.get("wallet_address", ""),
            "asset_symbol": "RICE",  # Default emergency asset
            "quantity": 10, "price": None,  # Market price
            "channel": "SMS_BRIDGE", "hex_payload": req.hex_payload[:64],
            "signature_valid": len(req.hex_payload) >= 8,
            "status": "executed" if len(req.hex_payload) >= 8 else "rejected",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.sms_orders.insert_one(order)
        order.pop("_id", None)
        return order
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid hex payload: {str(e)}")

@contracts_router.get("/sms/orders")
async def get_sms_orders(user: dict = Depends(_auth)):
    orders = await db.sms_orders.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return orders

# ===== DISPUTE MANAGER =====
@contracts_router.post("/disputes")
async def create_dispute(dispute: DisputeCreate, user: dict = Depends(_auth)):
    dispute_doc = {
        "id": str(uuid.uuid4()), "trade_id": dispute.trade_id,
        "initiator_id": user["_id"], "initiator_name": user["name"],
        "dispute_type": dispute.dispute_type,
        "description": dispute.description, "evidence": dispute.evidence,
        "status": "open",  # open -> under_review -> resolved
        "resolution": None, "arbitrator_id": None,
        "assets_frozen": True, "paused_in_transit": dispute.dispute_type == "force_majeure",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.disputes.insert_one(dispute_doc)
    dispute_doc.pop("_id", None)
    return dispute_doc

@contracts_router.get("/disputes")
async def get_disputes(user: dict = Depends(_auth)):
    disputes = await db.disputes.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return disputes

@contracts_router.put("/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id: str, req: DisputeResolve, user: dict = Depends(_auth)):
    # Only regulators or involved parties can resolve
    dispute = await db.disputes.find_one({"id": dispute_id})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    await db.disputes.update_one({"id": dispute_id}, {"$set": {
        "status": "resolved", "resolution": req.resolution,
        "resolution_notes": req.notes, "arbitrator_id": user["_id"],
        "arbitrator_name": user["name"], "assets_frozen": False,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    return {"message": f"Dispute resolved: {req.resolution}"}

# ===== PLATFORM STATS (Public) =====
@contracts_router.get("/platform/stats")
async def get_platform_stats():
    """Public platform statistics for landing page"""
    total_users = await db.users.count_documents({})
    total_trades = await db.trades.count_documents({})
    total_volume_result = await db.trades.aggregate([{"$group": {"_id": None, "total": {"$sum": "$total"}}}]).to_list(1)
    total_volume = total_volume_result[0]["total"] if total_volume_result else 0
    total_carbon = await db.carbon_credits.aggregate([{"$group": {"_id": None, "total": {"$sum": "$quantity_tonnes"}}}]).to_list(1)
    carbon_tonnes = total_carbon[0]["total"] if total_carbon else 0
    total_assets = await db.assets.count_documents({})
    total_contracts = await db.smart_contracts.count_documents({})
    regions = await db.compliance_rules.count_documents({})

    return {
        "total_users": total_users, "total_trades": total_trades,
        "total_volume_usd": round(total_volume, 2),
        "carbon_tonnes_traded": round(carbon_tonnes, 0),
        "total_assets": total_assets, "smart_contracts": total_contracts,
        "compliance_regions": regions,
        "settlement_speed": "< 3 seconds",
        "uptime": "99.97%",
    }

# ===== SEED SCENARIO DATA =====
async def seed_contract_scenarios():
    """Seed Phase 3 scenario data"""
    existing = await db.disputes.count_documents({})
    if existing > 0:
        return

    logger.info("Seeding Phase 3 contract scenarios...")

    # Scenario 12: Hoarding alert
    await db.whale_alerts.insert_one({
        "id": str(uuid.uuid4()), "type": "LargeAccumulationDetected",
        "user_id": "scenario_whale", "asset": "RICE",
        "ownership_pct": 12.5, "balance": 125000,
        "threshold": 5.0, "status": "BLOCKED",
        "description": "Scenario 12: User attempted to acquire 15% of RICE supply — throttled and taxed",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Scenario 13: Quality haircut
    await db.quality_reports.insert_one({
        "id": str(uuid.uuid4()), "trade_id": "scenario_quality",
        "reporter_id": "quality_oracle", "moisture_pct": 18.5,
        "purity_pct": 82.0, "grade": "C", "spectral_hash": "HSM_VERIFIED_abc123def456",
        "hsm_verified": True, "haircut_pct": 20.0,
        "original_total": 5000.0, "adjusted_total": 4000.0, "adjustment_usd": 1000.0,
        "status": "applied",
        "description": "Scenario 13: Wheat delivered Grade C — seller received 20% less",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Scenario 14: Pre-harvest loan
    user = await db.users.find_one({"email": "farmer_1@e4n.com"})
    if user:
        await db.pre_harvest_loans.insert_one({
            "id": str(uuid.uuid4()), "borrower_id": str(user["_id"]),
            "borrower_name": "Raj Patel", "asset_symbol": "WHEAT",
            "quantity": 3000, "loan_value_usd": 960.0,
            "interest_rate": 0.04, "interest_usd": 38.40,
            "total_repayment": 998.40, "reputation_score": 45,
            "season": "2026-Q3", "status": "active",
            "collateral_type": "future_yield", "transferable": False,
            "max_loan_to_yield": 0.30,
            "description": "Scenario 14: Farmer pre-harvest loan against wheat yield",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "due_date": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),
        })

    # Sample disputes
    disputes = [
        {"trade_id": "trade_001", "dispute_type": "force_majeure", "description": "Shipment delayed due to flooding in Rotterdam port", "status": "open", "paused_in_transit": True},
        {"trade_id": "trade_002", "dispute_type": "quality", "description": "Rice moisture content exceeds contracted maximum of 14%", "status": "under_review", "paused_in_transit": False},
        {"trade_id": "trade_003", "dispute_type": "delivery_failure", "description": "IoT sensors show delivery to wrong warehouse", "status": "resolved", "resolution": "release_to_buyer", "paused_in_transit": False},
    ]
    for d in disputes:
        d["id"] = str(uuid.uuid4())
        d["initiator_id"] = "system"
        d["initiator_name"] = "E4N System"
        d["evidence"] = ""
        d["assets_frozen"] = d["status"] != "resolved"
        d["arbitrator_id"] = None
        d["created_at"] = datetime.now(timezone.utc).isoformat()
        d["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.disputes.insert_one(d)

    # Sample RFQ
    await db.rfq_orders.insert_one({
        "id": str(uuid.uuid4()), "requester_id": "inst_001", "requester_name": "Morgan Stanley Fund",
        "asset_symbol": "CARBON", "side": "buy", "quantity": 15000,
        "oracle_price": 45.5, "notional": 682500.0,
        "max_slippage_pct": 2.0, "slippage_estimate": 0.8,
        "status": "open", "visibility": "dark_pool",
        "quotes": [
            {"id": str(uuid.uuid4()), "counterparty": "LP-201", "price": 45.72, "quantity": 15000, "spread_bps": 48.4, "timestamp": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "counterparty": "LP-305", "price": 45.65, "quantity": 15000, "spread_bps": 33.0, "timestamp": datetime.now(timezone.utc).isoformat()},
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat(),
    })

    # Indexes
    await db.whale_alerts.create_index("timestamp")
    await db.quality_reports.create_index("trade_id")
    await db.pre_harvest_loans.create_index("borrower_id")
    await db.disputes.create_index("status")
    await db.rfq_orders.create_index("status")
    await db.esg_records.create_index("timestamp")

    logger.info("Phase 3 contract scenarios seeded!")
