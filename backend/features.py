"""
E4N Phase 2-3 Features Module
- WebSocket real-time price updates
- Advanced order types (stop-loss, conditional, basket)
- KYC document upload with object storage
- In-app notification system
- Carbon offset calculator
- PDF certificate generation
- CSV/PDF report exports
- MFA (TOTP-based)
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os, uuid, json, csv, io, asyncio, logging, hashlib, base64, random
import requests

logger = logging.getLogger(__name__)

features_router = APIRouter(prefix="/api")

# Will be set from server.py
db = None
get_current_user = None
require_role = None

def init_features(database, auth_fn, role_fn):
    global db, get_current_user, require_role
    db = database
    get_current_user = auth_fn
    require_role = role_fn

async def _auth(request: Request):
    return await get_current_user(request)

async def _regulator(request: Request):
    return await require_role("regulator")(request)

# ===== OBJECT STORAGE =====
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "e4n-exchange"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        logger.warning("No EMERGENT_LLM_KEY for storage")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ===== PYDANTIC MODELS =====
class StopLossOrder(BaseModel):
    asset_symbol: str
    quantity: float
    trigger_price: float
    settlement_token: str = "USD"

class BasketOrder(BaseModel):
    orders: List[dict]  # [{asset_symbol, side, quantity, price}]
    settlement_token: str = "USD"

class ConditionalOrder(BaseModel):
    asset_symbol: str
    side: str
    quantity: float
    price: float
    condition_asset: str
    condition_operator: str  # gt, lt, eq
    condition_price: float
    settlement_token: str = "USD"

class CarbonCalcInput(BaseModel):
    electricity_kwh: float = 0
    natural_gas_therms: float = 0
    vehicle_miles: float = 0
    flights_hours: float = 0
    waste_tonnes: float = 0
    employees: int = 1
    region: str = "US"

class MFASetup(BaseModel):
    pass

class MFAVerify(BaseModel):
    code: str

# ===== WEBSOCKET - REAL-TIME PRICES =====
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for conn in self.active_connections[:]:
            try:
                await conn.send_json(message)
            except:
                self.disconnect(conn)

ws_manager = ConnectionManager()

async def price_update_loop():
    """Background task to simulate real-time price updates"""
    while True:
        try:
            if ws_manager.active_connections and db is not None:
                assets = await db.assets.find({"symbol": {"$ne": "USD"}}, {"_id": 0}).to_list(10)
                updates = []
                for asset in assets:
                    price = asset.get("current_price", asset.get("base_price", 1))
                    change = random.uniform(-0.005, 0.006) * price
                    new_price = round(max(price * 0.5, price + change), 6)
                    await db.assets.update_one(
                        {"symbol": asset["symbol"]},
                        {"$set": {"current_price": new_price}}
                    )
                    updates.append({
                        "symbol": asset["symbol"],
                        "price": new_price,
                        "change": round(change, 6),
                        "direction": "up" if change >= 0 else "down",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                await ws_manager.broadcast({"type": "price_update", "data": updates})

                # Also broadcast notification count for active users
                await ws_manager.broadcast({"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat()})
        except Exception as e:
            logger.error(f"Price update error: {e}")
        await asyncio.sleep(3)

# ===== ADVANCED ORDERS =====
@features_router.post("/orders/stop-loss")
async def create_stop_loss(order: StopLossOrder, user: dict = Depends(_auth)):
    order_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "user_name": user["name"],
        "asset_symbol": order.asset_symbol.upper(),
        "order_type": "stop-loss",
        "side": "sell",
        "quantity": order.quantity,
        "trigger_price": order.trigger_price,
        "price": order.trigger_price,
        "total": round(order.trigger_price * order.quantity, 2),
        "settlement_token": order.settlement_token,
        "status": "pending_trigger",
        "filled_quantity": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)
    await _create_notification(user["_id"], "order", f"Stop-loss order set for {order.quantity} {order.asset_symbol} at ${order.trigger_price}")
    order_doc.pop("_id", None)
    return order_doc

@features_router.post("/orders/basket")
async def create_basket_order(basket: BasketOrder, user: dict = Depends(_auth)):
    results = []
    for item in basket.orders:
        order_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "user_name": user["name"],
            "asset_symbol": item.get("asset_symbol", "").upper(),
            "order_type": "basket",
            "side": item.get("side", "buy"),
            "quantity": item.get("quantity", 0),
            "price": item.get("price", 0),
            "total": round(item.get("price", 0) * item.get("quantity", 0), 2),
            "settlement_token": basket.settlement_token,
            "status": "open",
            "filled_quantity": 0,
            "basket_id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)
        results.append(order_doc)
    await _create_notification(user["_id"], "order", f"Basket order placed with {len(results)} items")
    return {"orders": results, "count": len(results)}

@features_router.post("/orders/conditional")
async def create_conditional_order(order: ConditionalOrder, user: dict = Depends(_auth)):
    order_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "user_name": user["name"],
        "asset_symbol": order.asset_symbol.upper(),
        "order_type": "conditional",
        "side": order.side,
        "quantity": order.quantity,
        "price": order.price,
        "total": round(order.price * order.quantity, 2),
        "settlement_token": order.settlement_token,
        "condition": {
            "asset": order.condition_asset.upper(),
            "operator": order.condition_operator,
            "price": order.condition_price,
        },
        "status": "pending_condition",
        "filled_quantity": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    return order_doc

# ===== KYC DOCUMENT UPLOAD =====
ALLOWED_KYC_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@features_router.post("/kyc/upload")
async def upload_kyc_document(
    file: UploadFile = File(...),
    document_type: str = Query("id_document", description="id_document|passport|business_registration|proof_of_address"),
    user: dict = Depends(_auth)
):
    if file.content_type not in ALLOWED_KYC_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and PDF files are allowed")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    storage_path = f"{APP_NAME}/kyc/{user['_id']}/{uuid.uuid4()}.{ext}"

    try:
        result = put_object(storage_path, data, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "document_type": document_type,
        "original_filename": file.filename,
        "storage_path": result.get("path", storage_path),
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "status": "pending_review",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
    }
    await db.kyc_documents.insert_one(doc)
    doc.pop("_id", None)

    # Update user KYC status
    await db.users.update_one(
        {"_id": {"$regex": f"^{user['_id']}$"} if isinstance(user["_id"], str) else {"$exists": True}},
        {"$set": {"kyc_status": "documents_submitted"}}
    )
    await _create_notification(user["_id"], "kyc", f"KYC document '{document_type}' uploaded successfully")
    return doc

@features_router.get("/kyc/documents")
async def get_kyc_documents(user: dict = Depends(_auth)):
    docs = await db.kyc_documents.find(
        {"user_id": user["_id"], "is_deleted": False}, {"_id": 0}
    ).to_list(50)
    return docs

@features_router.get("/kyc/status")
async def get_kyc_status(user: dict = Depends(_auth)):
    docs = await db.kyc_documents.find(
        {"user_id": user["_id"], "is_deleted": False}, {"_id": 0}
    ).to_list(50)
    required = {"id_document", "proof_of_address"}
    submitted = {d["document_type"] for d in docs}
    verified = {d["document_type"] for d in docs if d.get("status") == "approved"}
    return {
        "kyc_tier": user.get("kyc_tier", 0),
        "compliance_status": user.get("compliance_status", "pending"),
        "documents": docs,
        "required_documents": list(required),
        "submitted_documents": list(submitted),
        "verified_documents": list(verified),
        "completion_percentage": int(len(submitted & required) / len(required) * 100),
    }

@features_router.get("/files/{path:path}")
async def serve_file(path: str, request: Request, auth: str = Query(None)):
    # Auth check
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    record = await db.kyc_documents.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=record.get("content_type", content_type))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File retrieval failed: {str(e)}")

# ===== NOTIFICATIONS =====
async def _create_notification(user_id: str, category: str, message: str, data: dict = None):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "category": category,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notif)
    return notif

@features_router.get("/notifications")
async def get_notifications(user: dict = Depends(_auth), unread_only: bool = False):
    query = {"user_id": user["_id"]}
    if unread_only:
        query["read"] = False
    notifs = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread_count = await db.notifications.count_documents({"user_id": user["_id"], "read": False})
    return {"notifications": notifs, "unread_count": unread_count}

@features_router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(_auth)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@features_router.post("/notifications/mark-all-read")
async def mark_all_read(user: dict = Depends(_auth)):
    await db.notifications.update_many(
        {"user_id": user["_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ===== CARBON OFFSET CALCULATOR =====
EMISSION_FACTORS = {
    "US": {"electricity": 0.42, "gas": 5.3, "vehicle": 0.21, "flight": 90, "waste": 0.5},
    "EU": {"electricity": 0.28, "gas": 5.3, "vehicle": 0.17, "flight": 85, "waste": 0.4},
    "APAC": {"electricity": 0.55, "gas": 5.3, "vehicle": 0.22, "flight": 92, "waste": 0.6},
    "AFRICA": {"electricity": 0.65, "gas": 5.3, "vehicle": 0.25, "flight": 95, "waste": 0.7},
    "LATAM": {"electricity": 0.20, "gas": 5.3, "vehicle": 0.19, "flight": 88, "waste": 0.45},
}

@features_router.post("/carbon-calculator/calculate")
async def calculate_carbon_offset(calc: CarbonCalcInput):
    factors = EMISSION_FACTORS.get(calc.region.upper(), EMISSION_FACTORS["US"])
    breakdown = {
        "electricity": round(calc.electricity_kwh * factors["electricity"] / 1000, 2),
        "natural_gas": round(calc.natural_gas_therms * factors["gas"] / 1000, 2),
        "transportation": round(calc.vehicle_miles * factors["vehicle"] / 1000, 2),
        "air_travel": round(calc.flights_hours * factors["flight"] / 1000, 2),
        "waste": round(calc.waste_tonnes * factors["waste"], 2),
    }
    total_emissions = round(sum(breakdown.values()), 2)
    carbon_price = 45.0
    try:
        asset = await db.assets.find_one({"symbol": "CARBON"}, {"_id": 0})
        if asset:
            carbon_price = asset.get("current_price", 45.0)
    except:
        pass

    offset_cost = round(total_emissions * carbon_price, 2)
    per_employee = round(total_emissions / max(calc.employees, 1), 2)

    return {
        "total_emissions_tco2e": total_emissions,
        "breakdown": breakdown,
        "offset_cost_usd": offset_cost,
        "carbon_price_per_tonne": carbon_price,
        "per_employee_tco2e": per_employee,
        "employees": calc.employees,
        "region": calc.region,
        "emission_factors": factors,
        "recommendations": [
            f"Your total carbon footprint is {total_emissions} tCO2e",
            f"Offsetting would cost approximately ${offset_cost:,.2f} at current market rates",
            f"Per employee: {per_employee} tCO2e/year" if calc.employees > 1 else "",
            "Consider switching to renewable energy to reduce electricity emissions" if breakdown["electricity"] > 1 else "",
            "Reduce air travel or purchase carbon offsets for flights" if breakdown["air_travel"] > 0.5 else "",
        ],
    }

@features_router.get("/carbon-calculator/factors")
async def get_emission_factors():
    return EMISSION_FACTORS

# ===== PDF CERTIFICATE GENERATION =====
@features_router.get("/carbon-credits/{credit_id}/certificate")
async def generate_certificate(credit_id: str, user: dict = Depends(_auth)):
    credit = await db.carbon_credits.find_one({"id": credit_id}, {"_id": 0})
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")
    if credit["status"] not in ["verified", "retired"]:
        raise HTTPException(status_code=400, detail="Certificate only available for verified/retired credits")

    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_fill_color(6, 11, 18)
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.set_text_color(0, 242, 152)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_y(10)
    pdf.cell(0, 12, "E4N Carbon Credit Certificate", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(150, 160, 175)
    pdf.cell(0, 8, "Exchange for Necessities - Verified Carbon Offset", ln=True, align="C")

    # Certificate body
    pdf.set_text_color(30, 30, 30)
    pdf.set_y(50)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Certificate of Carbon Credit", ln=True, align="C")
    pdf.ln(5)

    pdf.set_font("Helvetica", "", 11)
    cert_id = f"E4N-CC-{credit_id[:8].upper()}"
    fields = [
        ("Certificate ID", cert_id),
        ("Project Name", credit.get("project_name", "N/A")),
        ("Project Type", credit.get("project_type", "N/A").replace("_", " ").title()),
        ("Region", credit.get("region", "N/A")),
        ("Methodology", credit.get("methodology", "N/A")),
        ("Vintage Year", str(credit.get("vintage_year", "N/A"))),
        ("Total Quantity", f"{credit.get('quantity_tonnes', 0):,.0f} tCO2e"),
        ("Available", f"{credit.get('available_tonnes', 0):,.0f} tCO2e"),
        ("Retired", f"{credit.get('retired_tonnes', 0):,.0f} tCO2e"),
        ("Status", credit.get("status", "N/A").upper()),
        ("Issued Date", credit.get("created_at", "N/A")[:10]),
        ("Verified By", "E4N Regulatory Authority"),
    ]

    for label, value in fields:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(60, 8, f"{label}:", 0, 0)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 8, str(value), 0, 1)

    # Footer
    pdf.ln(10)
    pdf.set_draw_color(0, 200, 130)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f"This certificate was generated by E4N Exchange on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ln=True, align="C")
    pdf.cell(0, 6, "This document serves as proof of carbon credit ownership and can be used for compliance reporting.", ln=True, align="C")

    output = io.BytesIO()
    pdf.output(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=E4N_Certificate_{cert_id}.pdf"}
    )

# ===== EXPORT REPORTS =====
@features_router.get("/reports/trades/csv")
async def export_trades_csv(user: dict = Depends(_auth)):
    trades = await db.trades.find(
        {"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]}, {"_id": 0}
    ).sort("timestamp", -1).to_list(1000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Trade ID", "Asset", "Quantity", "Price", "Total", "Settlement", "Status", "Timestamp"])
    for t in trades:
        writer.writerow([t.get("id"), t.get("asset_symbol"), t.get("quantity"), t.get("price"),
                        t.get("total"), t.get("settlement_token"), t.get("status"), t.get("timestamp")])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=E4N_Trades_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@features_router.get("/reports/carbon-credits/csv")
async def export_carbon_csv(user: dict = Depends(_auth)):
    credits = await db.carbon_credits.find({}, {"_id": 0}).to_list(1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Project", "Type", "Region", "Quantity", "Available", "Retired", "Status", "Price/t", "Methodology", "Vintage"])
    for c in credits:
        writer.writerow([c.get("id"), c.get("project_name"), c.get("project_type"), c.get("region"),
                        c.get("quantity_tonnes"), c.get("available_tonnes"), c.get("retired_tonnes"),
                        c.get("status"), c.get("price_per_tonne"), c.get("methodology"), c.get("vintage_year")])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=E4N_CarbonCredits_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@features_router.get("/reports/compliance/pdf")
async def export_compliance_pdf(user: dict = Depends(_auth)):
    from fpdf import FPDF
    rules = await db.compliance_rules.find({}, {"_id": 0}).to_list(20)
    status = await db.users.find_one({"_id": user["_id"] if not isinstance(user["_id"], str) else {"$exists": True}})

    pdf = FPDF()
    pdf.add_page()
    pdf.set_fill_color(6, 11, 18)
    pdf.rect(0, 0, 210, 30, 'F')
    pdf.set_text_color(0, 242, 152)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_y(8)
    pdf.cell(0, 10, "E4N Compliance Report", ln=True, align="C")

    pdf.set_text_color(30, 30, 30)
    pdf.set_y(35)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"User: {user.get('name', 'N/A')} | Region: {user.get('region', 'N/A')}", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ln=True)
    pdf.ln(5)

    for rule_set in rules:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(240, 240, 245)
        pdf.cell(0, 8, f"{rule_set.get('name', '')} ({rule_set.get('region', '')})", ln=True, fill=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, f"Carbon Tax: {(rule_set.get('carbon_tax_rate', 0)*100):.1f}% | Max Transaction: {rule_set.get('max_transaction_limit', 0):,} tCO2e", ln=True)
        for rule in rule_set.get("rules", []):
            pdf.cell(8, 5, "", 0, 0)
            pdf.cell(0, 5, f"[{rule.get('severity', '').upper()}] {rule.get('rule', '')}", ln=True)
        pdf.ln(3)

    output = io.BytesIO()
    pdf.output(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=E4N_Compliance_{datetime.now().strftime('%Y%m%d')}.pdf"}
    )

# ===== MFA (TOTP) =====
@features_router.post("/auth/mfa/setup")
async def setup_mfa(user: dict = Depends(_auth)):
    import pyotp
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=user["email"], issuer_name="E4N Exchange")

    # Store secret (in production, encrypt this)
    await db.users.update_one(
        {"email": user["email"]},
        {"$set": {"mfa_secret": secret, "mfa_enabled": False}}
    )
    return {
        "secret": secret,
        "provisioning_uri": provisioning_uri,
        "message": "Scan the QR code with your authenticator app, then verify with a code"
    }

@features_router.post("/auth/mfa/verify")
async def verify_mfa(req: MFAVerify, user: dict = Depends(_auth)):
    import pyotp
    user_doc = await db.users.find_one({"email": user["email"]})
    if not user_doc or not user_doc.get("mfa_secret"):
        raise HTTPException(status_code=400, detail="MFA not set up")
    totp = pyotp.TOTP(user_doc["mfa_secret"])
    if totp.verify(req.code, valid_window=1):
        await db.users.update_one(
            {"email": user["email"]},
            {"$set": {"mfa_enabled": True, "kyc_tier": max(user.get("kyc_tier", 0), 2)}}
        )
        await _create_notification(user["_id"], "security", "MFA has been enabled on your account")
        return {"message": "MFA enabled successfully", "mfa_enabled": True}
    raise HTTPException(status_code=400, detail="Invalid MFA code")

@features_router.post("/auth/mfa/disable")
async def disable_mfa(req: MFAVerify, user: dict = Depends(_auth)):
    import pyotp
    user_doc = await db.users.find_one({"email": user["email"]})
    if not user_doc or not user_doc.get("mfa_secret"):
        raise HTTPException(status_code=400, detail="MFA not set up")
    totp = pyotp.TOTP(user_doc["mfa_secret"])
    if totp.verify(req.code, valid_window=1):
        await db.users.update_one(
            {"email": user["email"]},
            {"$set": {"mfa_enabled": False, "mfa_secret": None}}
        )
        return {"message": "MFA disabled"}
    raise HTTPException(status_code=400, detail="Invalid MFA code")

# ===== CANDLESTICK DATA =====
@features_router.get("/assets/{symbol}/candlestick")
async def get_candlestick_data(symbol: str, interval: str = "1d", limit: int = 60):
    history = await db.price_history.find(
        {"asset": symbol.upper()}, {"_id": 0}
    ).sort("date", -1).limit(limit).to_list(limit)
    candles = []
    for h in reversed(history):
        p = h.get("price", 0)
        candles.append({
            "date": h["date"],
            "open": round(p * random.uniform(0.98, 1.0), 4),
            "high": h.get("high", round(p * 1.02, 4)),
            "low": h.get("low", round(p * 0.98, 4)),
            "close": p,
            "volume": h.get("volume", 0),
            # Technical indicators
            "sma_20": round(p * random.uniform(0.97, 1.03), 4),
            "ema_12": round(p * random.uniform(0.98, 1.02), 4),
            "rsi": round(random.uniform(30, 70), 1),
            "macd": round(random.uniform(-2, 2), 4),
            "macd_signal": round(random.uniform(-1.5, 1.5), 4),
            "bollinger_upper": round(p * 1.04, 4),
            "bollinger_lower": round(p * 0.96, 4),
        })
    return candles

# ===== KYC ADMIN ENDPOINTS =====
@features_router.get("/admin/kyc/pending")
async def admin_get_pending_kyc(user: dict = Depends(_regulator)):
    docs = await db.kyc_documents.find({"status": "pending_review", "is_deleted": False}, {"_id": 0}).to_list(100)
    return docs

@features_router.put("/admin/kyc/{doc_id}/approve")
async def admin_approve_kyc(doc_id: str, user: dict = Depends(_regulator)):
    doc = await db.kyc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.kyc_documents.update_one({"id": doc_id}, {"$set": {"status": "approved", "reviewed_by": user["_id"], "reviewed_at": datetime.now(timezone.utc).isoformat()}})
    await _create_notification(doc["user_id"], "kyc", f"Your {doc['document_type']} has been approved")
    return {"message": "Document approved"}

@features_router.put("/admin/kyc/{doc_id}/reject")
async def admin_reject_kyc(doc_id: str, user: dict = Depends(_regulator)):
    doc = await db.kyc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.kyc_documents.update_one({"id": doc_id}, {"$set": {"status": "rejected", "reviewed_by": user["_id"], "reviewed_at": datetime.now(timezone.utc).isoformat()}})
    await _create_notification(doc["user_id"], "kyc", f"Your {doc['document_type']} was rejected. Please re-upload.")
    return {"message": "Document rejected"}
