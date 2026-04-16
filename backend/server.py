from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import uuid
import secrets
import asyncio
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from contextlib import asynccontextmanager
from features import features_router, init_features, ws_manager, price_update_loop, init_storage
from blockchain import blockchain_router, init_blockchain, seed_blockchain_data
from contracts import contracts_router, init_contracts, seed_contract_scenarios

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===== Password Helpers =====
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ===== JWT Helpers =====
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# ===== Auth Dependency =====
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    async def role_checker(request: Request):
        user = await get_current_user(request)
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ===== Pydantic Models =====
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "retail"
    organization: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class OrderCreate(BaseModel):
    asset_symbol: str
    order_type: str = "limit"
    side: str  # buy or sell
    quantity: float
    price: Optional[float] = None
    settlement_token: str = "USD"

class CarbonCreditCreate(BaseModel):
    project_name: str
    project_type: str  # renewable_energy, forestry, methane_capture, etc
    quantity_tonnes: float
    vintage_year: int
    region: str
    methodology: str = ""
    description: str = ""

class CarbonCreditExchange(BaseModel):
    credit_id: str
    quantity_tonnes: float
    price_per_tonne: float
    settlement_token: str = "USD"

class PredictionBet(BaseModel):
    position: str  # yes or no
    amount: float

class ChatMessage(BaseModel):
    message: str

# ===== App Setup =====
app = FastAPI(title="E4N - Exchange for Necessities")
api_router = APIRouter(prefix="/api")

# ===== Seed Data =====
SEED_ASSETS = [
    {"symbol": "RICE", "name": "Rice Token", "category": "food", "unit": "kg", "base_price": 0.85, "supply": 1000000, "description": "Tokenized rice commodity for global food trading"},
    {"symbol": "WHEAT", "name": "Wheat Token", "category": "food", "unit": "kg", "base_price": 0.32, "supply": 2000000, "description": "Tokenized wheat commodity"},
    {"symbol": "KWH", "name": "Energy Token", "category": "energy", "unit": "kWh", "base_price": 0.12, "supply": 5000000, "description": "Tokenized energy credits"},
    {"symbol": "H2O", "name": "Water Token", "category": "water", "unit": "liters", "base_price": 0.005, "supply": 10000000, "description": "Tokenized clean water credits"},
    {"symbol": "CARBON", "name": "Carbon Credit", "category": "carbon", "unit": "tCO2e", "base_price": 45.00, "supply": 500000, "description": "Verified carbon emission credits"},
    {"symbol": "USD", "name": "USD Stablecoin", "category": "settlement", "unit": "USD", "base_price": 1.00, "supply": 100000000, "description": "Fiat-backed stablecoin for settlement"},
]

SEED_USERS = [
    {"email": "retail_user_1@e4n.com", "password": "Test@123", "name": "Alex Chen", "role": "retail", "wallet_address": "0xRetail001", "kyc_tier": 1, "organization": ""},
    {"email": "inst_buyer_1@e4n.com", "password": "Test@123", "name": "Morgan Stanley Fund", "role": "institutional", "wallet_address": "0xInst001", "kyc_tier": 3, "organization": "Morgan Stanley"},
    {"email": "farmer_1@e4n.com", "password": "Test@123", "name": "Raj Patel", "role": "retail", "wallet_address": "0xFarm001", "kyc_tier": 2, "organization": "Patel Farms"},
    {"email": "regulator_1@e4n.com", "password": "Admin@123", "name": "Global Regulator", "role": "regulator", "wallet_address": "0xReg001", "kyc_tier": 3, "organization": "E4N Regulatory Authority"},
]

SEED_WALLETS = {
    "retail_user_1@e4n.com": {"RICE": 100, "H2O": 500, "USD": 10000, "CARBON": 5},
    "inst_buyer_1@e4n.com": {"USD": 1000000, "CARBON": 1000, "WHEAT": 50000},
    "farmer_1@e4n.com": {"WHEAT": 10000, "RICE": 5000, "USD": 25000, "CARBON": 50},
    "regulator_1@e4n.com": {"USD": 100000},
}

COMPLIANCE_RULES = [
    {"region": "EU", "name": "EU ETS Compliance", "rules": [
        {"id": "eu_1", "rule": "All carbon credits must be verified by EU-approved methodology", "severity": "critical"},
        {"id": "eu_2", "rule": "Maximum single transaction: 100,000 tCO2e", "severity": "high"},
        {"id": "eu_3", "rule": "Quarterly reporting mandatory for all participants", "severity": "medium"},
        {"id": "eu_4", "rule": "Cross-border transfers require additional documentation", "severity": "high"},
    ], "carbon_tax_rate": 0.05, "max_transaction_limit": 100000},
    {"region": "US", "name": "US Carbon Market Rules", "rules": [
        {"id": "us_1", "rule": "SEC registration required for institutional traders", "severity": "critical"},
        {"id": "us_2", "rule": "KYC/AML verification mandatory", "severity": "critical"},
        {"id": "us_3", "rule": "California cap-and-trade compliance required for CA operations", "severity": "high"},
    ], "carbon_tax_rate": 0.03, "max_transaction_limit": 250000},
    {"region": "APAC", "name": "Asia-Pacific Carbon Standards", "rules": [
        {"id": "ap_1", "rule": "Alignment with Paris Agreement NDCs required", "severity": "critical"},
        {"id": "ap_2", "rule": "China CCER methodology accepted", "severity": "medium"},
        {"id": "ap_3", "rule": "Japan J-Credit scheme integration", "severity": "medium"},
    ], "carbon_tax_rate": 0.02, "max_transaction_limit": 500000},
    {"region": "AFRICA", "name": "African Carbon Markets Initiative", "rules": [
        {"id": "af_1", "rule": "Community benefit sharing mandatory (min 30%)", "severity": "critical"},
        {"id": "af_2", "rule": "Biodiversity impact assessment required", "severity": "high"},
    ], "carbon_tax_rate": 0.01, "max_transaction_limit": 200000},
    {"region": "LATAM", "name": "Latin America Carbon Standards", "rules": [
        {"id": "la_1", "rule": "REDD+ methodology compliance for forestry projects", "severity": "critical"},
        {"id": "la_2", "rule": "Indigenous community consent required", "severity": "critical"},
    ], "carbon_tax_rate": 0.015, "max_transaction_limit": 150000},
]

PREDICTION_MARKETS = [
    {"title": "Wheat price will exceed $0.40/kg by Q2 2026", "asset": "WHEAT", "end_date": "2026-06-30", "category": "price", "yes_pool": 15000, "no_pool": 12000, "status": "active"},
    {"title": "Carbon credit price will reach $60/tCO2e by end of 2026", "asset": "CARBON", "end_date": "2026-12-31", "category": "price", "yes_pool": 45000, "no_pool": 30000, "status": "active"},
    {"title": "EU will increase carbon tax rate by 2% in 2026", "asset": "CARBON", "end_date": "2026-12-31", "category": "regulation", "yes_pool": 8000, "no_pool": 22000, "status": "active"},
    {"title": "Global rice supply will decrease by 5% due to El Nino", "asset": "RICE", "end_date": "2026-09-30", "category": "supply", "yes_pool": 20000, "no_pool": 18000, "status": "active"},
]

import random

async def generate_price_history(asset_symbol, base_price, days=90):
    """Generate synthetic price history for charts"""
    history = []
    price = base_price
    now = datetime.now(timezone.utc)
    for i in range(days, 0, -1):
        change = random.uniform(-0.03, 0.035) * price
        price = max(price * 0.5, price + change)
        volume = random.randint(1000, 50000)
        history.append({
            "asset": asset_symbol,
            "date": (now - timedelta(days=i)).isoformat(),
            "price": round(price, 4),
            "volume": volume,
            "high": round(price * random.uniform(1.01, 1.05), 4),
            "low": round(price * random.uniform(0.95, 0.99), 4),
        })
    return history

async def generate_sample_trades(user_ids):
    """Generate synthetic trade history"""
    trades = []
    assets = ["RICE", "WHEAT", "KWH", "H2O", "CARBON"]
    now = datetime.now(timezone.utc)
    for i in range(50):
        asset = random.choice(assets)
        base = {"RICE": 0.85, "WHEAT": 0.32, "KWH": 0.12, "H2O": 0.005, "CARBON": 45.0}[asset]
        price = round(base * random.uniform(0.9, 1.1), 4)
        qty = round(random.uniform(10, 1000), 2)
        trades.append({
            "id": str(uuid.uuid4()),
            "buyer_id": random.choice(user_ids),
            "seller_id": random.choice(user_ids),
            "asset_symbol": asset,
            "quantity": qty,
            "price": price,
            "total": round(price * qty, 2),
            "settlement_token": "USD",
            "status": "settled",
            "timestamp": (now - timedelta(hours=random.randint(1, 720))).isoformat(),
        })
    return trades

async def seed_database():
    """Seed database with initial data"""
    logger.info("Starting database seeding...")

    # Seed assets
    existing_assets = await db.assets.count_documents({})
    if existing_assets == 0:
        for asset in SEED_ASSETS:
            asset["id"] = str(uuid.uuid4())
            asset["created_at"] = datetime.now(timezone.utc).isoformat()
            price_history = await generate_price_history(asset["symbol"], asset["base_price"])
            asset["current_price"] = price_history[-1]["price"] if price_history else asset["base_price"]
            asset["price_change_24h"] = round(random.uniform(-5, 8), 2)
            asset["volume_24h"] = random.randint(10000, 500000)
            await db.assets.insert_one(asset)
            # Store price history separately
            if price_history:
                for ph in price_history:
                    ph["_type"] = "price_history"
                await db.price_history.insert_many(price_history)
        logger.info(f"Seeded {len(SEED_ASSETS)} assets")

    # Seed users
    user_ids = []
    for user_data in SEED_USERS:
        existing = await db.users.find_one({"email": user_data["email"]})
        if not existing:
            user_doc = {
                "email": user_data["email"],
                "password_hash": hash_password(user_data["password"]),
                "name": user_data["name"],
                "role": user_data["role"],
                "wallet_address": user_data["wallet_address"],
                "kyc_tier": user_data["kyc_tier"],
                "organization": user_data["organization"],
                "region": random.choice(["EU", "US", "APAC"]),
                "compliance_status": "verified" if user_data["kyc_tier"] >= 2 else "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            result = await db.users.insert_one(user_doc)
            user_ids.append(str(result.inserted_id))
        else:
            user_ids.append(str(existing["_id"]))
            if not verify_password(user_data["password"], existing["password_hash"]):
                await db.users.update_one(
                    {"email": user_data["email"]},
                    {"$set": {"password_hash": hash_password(user_data["password"])}}
                )
    logger.info(f"Seeded {len(SEED_USERS)} users")

    # Seed wallets
    existing_wallets = await db.wallets.count_documents({})
    if existing_wallets == 0:
        for email, balances in SEED_WALLETS.items():
            user = await db.users.find_one({"email": email})
            if user:
                wallet_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": str(user["_id"]),
                    "balances": balances,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.wallets.insert_one(wallet_doc)
        logger.info("Seeded wallets")

    # Seed compliance rules
    existing_rules = await db.compliance_rules.count_documents({})
    if existing_rules == 0:
        for rule_set in COMPLIANCE_RULES:
            rule_set["id"] = str(uuid.uuid4())
            rule_set["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.compliance_rules.insert_one(rule_set)
        logger.info("Seeded compliance rules")

    # Seed prediction markets
    existing_predictions = await db.predictions.count_documents({})
    if existing_predictions == 0:
        for pred in PREDICTION_MARKETS:
            pred["id"] = str(uuid.uuid4())
            pred["created_at"] = datetime.now(timezone.utc).isoformat()
            pred["total_bets"] = random.randint(50, 500)
            await db.predictions.insert_one(pred)
        logger.info("Seeded prediction markets")

    # Seed sample trades
    existing_trades = await db.trades.count_documents({})
    if existing_trades == 0 and user_ids:
        trades = await generate_sample_trades(user_ids)
        if trades:
            await db.trades.insert_many(trades)
            logger.info(f"Seeded {len(trades)} sample trades")

    # Seed carbon credits
    existing_credits = await db.carbon_credits.count_documents({})
    if existing_credits == 0:
        carbon_projects = [
            {"project_name": "Amazon Rainforest Conservation", "project_type": "forestry", "quantity_tonnes": 50000, "vintage_year": 2025, "region": "LATAM", "methodology": "REDD+", "status": "verified", "issuer_email": "inst_buyer_1@e4n.com"},
            {"project_name": "Gujarat Solar Farm", "project_type": "renewable_energy", "quantity_tonnes": 25000, "vintage_year": 2025, "region": "APAC", "methodology": "CDM", "status": "verified", "issuer_email": "inst_buyer_1@e4n.com"},
            {"project_name": "Nordic Wind Energy", "project_type": "renewable_energy", "quantity_tonnes": 15000, "vintage_year": 2026, "region": "EU", "methodology": "Gold Standard", "status": "pending", "issuer_email": "farmer_1@e4n.com"},
            {"project_name": "Kenya Cookstove Project", "project_type": "energy_efficiency", "quantity_tonnes": 8000, "vintage_year": 2025, "region": "AFRICA", "methodology": "Verra VCS", "status": "verified", "issuer_email": "farmer_1@e4n.com"},
            {"project_name": "Texas Methane Capture", "project_type": "methane_capture", "quantity_tonnes": 12000, "vintage_year": 2026, "region": "US", "methodology": "ACR", "status": "issued", "issuer_email": "inst_buyer_1@e4n.com"},
            {"project_name": "Borneo Mangrove Restoration", "project_type": "blue_carbon", "quantity_tonnes": 6000, "vintage_year": 2025, "region": "APAC", "methodology": "Plan Vivo", "status": "verified", "issuer_email": "farmer_1@e4n.com"},
        ]
        for project in carbon_projects:
            user = await db.users.find_one({"email": project.pop("issuer_email")})
            project["id"] = str(uuid.uuid4())
            project["issuer_id"] = str(user["_id"]) if user else ""
            project["price_per_tonne"] = round(random.uniform(20, 80), 2)
            project["retired_tonnes"] = round(project["quantity_tonnes"] * random.uniform(0, 0.3), 2)
            project["available_tonnes"] = round(project["quantity_tonnes"] - project["retired_tonnes"], 2)
            project["created_at"] = datetime.now(timezone.utc).isoformat()
            project["description"] = f"Carbon offset project: {project['project_name']}"
            await db.carbon_credits.insert_one(project)
        logger.info("Seeded carbon credits")

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.assets.create_index("symbol", unique=True)
    await db.orders.create_index([("asset_symbol", 1), ("status", 1)])
    await db.trades.create_index("timestamp")
    await db.carbon_credits.create_index("status")
    await db.wallets.create_index("user_id", unique=True)

    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# E4N Test Credentials\n\n")
        f.write("## Users\n")
        f.write("| Email | Password | Role |\n|---|---|---|\n")
        f.write("| retail_user_1@e4n.com | Test@123 | retail |\n")
        f.write("| inst_buyer_1@e4n.com | Test@123 | institutional |\n")
        f.write("| farmer_1@e4n.com | Test@123 | retail |\n")
        f.write("| regulator_1@e4n.com | Admin@123 | regulator |\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n- POST /api/auth/refresh\n")

    logger.info("Database seeding complete!")

# ===== AUTH ENDPOINTS =====
@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if req.role not in ["retail", "institutional"]:
        req.role = "retail"
    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "wallet_address": f"0x{secrets.token_hex(20)}",
        "kyc_tier": 0,
        "organization": req.organization or "",
        "region": "US",
        "compliance_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    # Create wallet
    await db.wallets.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "balances": {"USD": 10000},
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    access_token = create_access_token(user_id, email, req.role)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "email": email, "name": req.name, "role": req.role, "wallet_address": user_doc["wallet_address"], "token": access_token}

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user["role"])
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {
        "id": user_id, "email": user["email"], "name": user["name"],
        "role": user["role"], "wallet_address": user.get("wallet_address", ""),
        "kyc_tier": user.get("kyc_tier", 0), "organization": user.get("organization", ""),
        "region": user.get("region", "US"), "compliance_status": user.get("compliance_status", "pending"),
        "token": access_token,
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["_id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "wallet_address": user.get("wallet_address", ""),
        "kyc_tier": user.get("kyc_tier", 0), "organization": user.get("organization", ""),
        "region": user.get("region", "US"), "compliance_status": user.get("compliance_status", "pending"),
    }

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"], user["role"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed", "token": access_token}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ===== ASSETS ENDPOINTS =====
@api_router.get("/assets")
async def get_assets():
    assets = await db.assets.find({}, {"_id": 0}).to_list(100)
    return assets

@api_router.get("/assets/{symbol}")
async def get_asset(symbol: str):
    asset = await db.assets.find_one({"symbol": symbol.upper()}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@api_router.get("/assets/{symbol}/price-history")
async def get_price_history(symbol: str, days: int = 30):
    history = await db.price_history.find(
        {"asset": symbol.upper()}, {"_id": 0}
    ).sort("date", -1).limit(days).to_list(days)
    return list(reversed(history))

# ===== WALLET ENDPOINTS =====
@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    if not wallet:
        return {"user_id": user["_id"], "balances": {}, "updated_at": datetime.now(timezone.utc).isoformat()}
    return wallet

# ===== ORDER ENDPOINTS =====
@api_router.post("/orders")
async def create_order(order: OrderCreate, user: dict = Depends(get_current_user)):
    # Validate asset
    asset = await db.assets.find_one({"symbol": order.asset_symbol.upper()}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=400, detail="Invalid asset")

    wallet = await db.wallets.find_one({"user_id": user["_id"]})
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet found")

    # Check balance for buy orders
    if order.side == "buy":
        price = order.price if order.price else asset.get("current_price", asset["base_price"])
        total_cost = price * order.quantity
        available = wallet.get("balances", {}).get(order.settlement_token, 0)
        if available < total_cost:
            raise HTTPException(status_code=400, detail=f"Insufficient {order.settlement_token} balance. Need {total_cost}, have {available}")
    elif order.side == "sell":
        available = wallet.get("balances", {}).get(order.asset_symbol.upper(), 0)
        if available < order.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient {order.asset_symbol} balance. Need {order.quantity}, have {available}")

    price = order.price if order.price else asset.get("current_price", asset["base_price"])
    order_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "user_name": user["name"],
        "asset_symbol": order.asset_symbol.upper(),
        "order_type": order.order_type,
        "side": order.side,
        "quantity": order.quantity,
        "price": price,
        "total": round(price * order.quantity, 2),
        "settlement_token": order.settlement_token,
        "status": "open",
        "filled_quantity": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)

    # Try to match market orders immediately
    if order.order_type == "market":
        await try_match_order(order_doc, user["_id"])

    order_doc.pop("_id", None)
    return order_doc

async def try_match_order(order, user_id):
    """Simple order matching engine"""
    opposite_side = "sell" if order["side"] == "buy" else "buy"
    matching_orders = await db.orders.find({
        "asset_symbol": order["asset_symbol"],
        "side": opposite_side,
        "status": "open",
        "user_id": {"$ne": user_id},
    }).sort("price", 1 if order["side"] == "buy" else -1).to_list(10)

    remaining_qty = order["quantity"]
    for match in matching_orders:
        if remaining_qty <= 0:
            break
        fill_qty = min(remaining_qty, match["quantity"] - match.get("filled_quantity", 0))
        if fill_qty <= 0:
            continue

        trade_price = match["price"]
        trade_total = round(trade_price * fill_qty, 2)
        buyer_id = user_id if order["side"] == "buy" else match["user_id"]
        seller_id = match["user_id"] if order["side"] == "buy" else user_id

        # Create trade
        trade_doc = {
            "id": str(uuid.uuid4()),
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "asset_symbol": order["asset_symbol"],
            "quantity": fill_qty,
            "price": trade_price,
            "total": trade_total,
            "settlement_token": order["settlement_token"],
            "status": "settled",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.trades.insert_one(trade_doc)

        # Update wallets
        await db.wallets.update_one(
            {"user_id": buyer_id},
            {"$inc": {f"balances.{order['asset_symbol']}": fill_qty, f"balances.{order['settlement_token']}": -trade_total}}
        )
        await db.wallets.update_one(
            {"user_id": seller_id},
            {"$inc": {f"balances.{order['asset_symbol']}": -fill_qty, f"balances.{order['settlement_token']}": trade_total}}
        )

        # Update match order
        new_filled = match.get("filled_quantity", 0) + fill_qty
        match_status = "filled" if new_filled >= match["quantity"] else "partial"
        await db.orders.update_one(
            {"id": match["id"]},
            {"$set": {"filled_quantity": new_filled, "status": match_status}}
        )

        remaining_qty -= fill_qty

    # Update original order
    filled = order["quantity"] - remaining_qty
    status = "filled" if remaining_qty <= 0 else ("partial" if filled > 0 else "open")
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {"filled_quantity": filled, "status": status}}
    )

@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user), status: str = None):
    query = {"user_id": user["_id"]}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.delete("/orders/{order_id}")
async def cancel_order(order_id: str, user: dict = Depends(get_current_user)):
    result = await db.orders.update_one(
        {"id": order_id, "user_id": user["_id"], "status": "open"},
        {"$set": {"status": "cancelled"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found or already processed")
    return {"message": "Order cancelled"}

@api_router.get("/orders/book/{symbol}")
async def get_order_book(symbol: str):
    buys = await db.orders.find(
        {"asset_symbol": symbol.upper(), "side": "buy", "status": {"$in": ["open", "partial"]}},
        {"_id": 0}
    ).sort("price", -1).to_list(20)
    sells = await db.orders.find(
        {"asset_symbol": symbol.upper(), "side": "sell", "status": {"$in": ["open", "partial"]}},
        {"_id": 0}
    ).sort("price", 1).to_list(20)
    return {"bids": buys, "asks": sells}

# ===== TRADES ENDPOINTS =====
@api_router.get("/trades")
async def get_trades(user: dict = Depends(get_current_user)):
    trades = await db.trades.find(
        {"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return trades

@api_router.get("/trades/recent")
async def get_recent_trades(symbol: str = None, limit: int = 20):
    query = {}
    if symbol:
        query["asset_symbol"] = symbol.upper()
    trades = await db.trades.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return trades

# ===== CARBON CREDITS ENDPOINTS =====
@api_router.get("/carbon-credits")
async def get_carbon_credits(status: str = None, region: str = None):
    query = {}
    if status:
        query["status"] = status
    if region:
        query["region"] = region
    credits = await db.carbon_credits.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return credits

@api_router.post("/carbon-credits")
async def create_carbon_credit(credit: CarbonCreditCreate, user: dict = Depends(get_current_user)):
    credit_doc = {
        "id": str(uuid.uuid4()),
        "issuer_id": user["_id"],
        "project_name": credit.project_name,
        "project_type": credit.project_type,
        "quantity_tonnes": credit.quantity_tonnes,
        "available_tonnes": credit.quantity_tonnes,
        "retired_tonnes": 0,
        "vintage_year": credit.vintage_year,
        "region": credit.region,
        "methodology": credit.methodology,
        "description": credit.description,
        "price_per_tonne": 45.00,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.carbon_credits.insert_one(credit_doc)
    credit_doc.pop("_id", None)
    return credit_doc

@api_router.put("/carbon-credits/{credit_id}/verify")
async def verify_carbon_credit(credit_id: str, user: dict = Depends(require_role("regulator"))):
    result = await db.carbon_credits.update_one(
        {"id": credit_id},
        {"$set": {"status": "verified", "verified_by": user["_id"], "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Credit not found")
    return {"message": "Carbon credit verified"}

@api_router.post("/carbon-credits/{credit_id}/retire")
async def retire_carbon_credit(credit_id: str, quantity: float = 0, user: dict = Depends(get_current_user)):
    credit = await db.carbon_credits.find_one({"id": credit_id}, {"_id": 0})
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")
    if credit["status"] != "verified":
        raise HTTPException(status_code=400, detail="Only verified credits can be retired")
    retire_qty = quantity if quantity > 0 else credit["available_tonnes"]
    if retire_qty > credit["available_tonnes"]:
        raise HTTPException(status_code=400, detail="Insufficient available tonnes")
    await db.carbon_credits.update_one(
        {"id": credit_id},
        {"$inc": {"retired_tonnes": retire_qty, "available_tonnes": -retire_qty},
         "$set": {"status": "retired" if retire_qty >= credit["available_tonnes"] else "verified"}}
    )
    return {"message": f"Retired {retire_qty} tCO2e", "retired": retire_qty}

@api_router.post("/carbon-credits/exchange")
async def exchange_carbon_credit(exchange: CarbonCreditExchange, user: dict = Depends(get_current_user)):
    credit = await db.carbon_credits.find_one({"id": exchange.credit_id}, {"_id": 0})
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")
    if credit["status"] not in ["verified", "issued"]:
        raise HTTPException(status_code=400, detail="Credit not available for exchange")
    if exchange.quantity_tonnes > credit["available_tonnes"]:
        raise HTTPException(status_code=400, detail="Insufficient available tonnes")

    total_cost = round(exchange.price_per_tonne * exchange.quantity_tonnes, 2)
    wallet = await db.wallets.find_one({"user_id": user["_id"]})
    if not wallet or wallet.get("balances", {}).get(exchange.settlement_token, 0) < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient settlement token balance")

    # Execute exchange
    await db.wallets.update_one(
        {"user_id": user["_id"]},
        {"$inc": {f"balances.{exchange.settlement_token}": -total_cost, "balances.CARBON": exchange.quantity_tonnes}}
    )
    # Credit seller
    if credit.get("issuer_id"):
        await db.wallets.update_one(
            {"user_id": credit["issuer_id"]},
            {"$inc": {f"balances.{exchange.settlement_token}": total_cost, "balances.CARBON": -exchange.quantity_tonnes}}
        )
    await db.carbon_credits.update_one(
        {"id": exchange.credit_id},
        {"$inc": {"available_tonnes": -exchange.quantity_tonnes}}
    )

    trade_doc = {
        "id": str(uuid.uuid4()),
        "buyer_id": user["_id"],
        "seller_id": credit.get("issuer_id", ""),
        "asset_symbol": "CARBON",
        "quantity": exchange.quantity_tonnes,
        "price": exchange.price_per_tonne,
        "total": total_cost,
        "settlement_token": exchange.settlement_token,
        "status": "settled",
        "trade_type": "carbon_exchange",
        "carbon_credit_id": exchange.credit_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.trades.insert_one(trade_doc)
    return {"message": "Carbon credit exchange completed", "trade_id": trade_doc["id"], "total_cost": total_cost}

@api_router.get("/carbon-credits/stats")
async def get_carbon_stats():
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_tonnes": {"$sum": "$quantity_tonnes"},
            "retired_tonnes": {"$sum": "$retired_tonnes"},
        }}
    ]
    stats = await db.carbon_credits.aggregate(pipeline).to_list(10)
    by_region = await db.carbon_credits.aggregate([
        {"$group": {"_id": "$region", "total_tonnes": {"$sum": "$quantity_tonnes"}, "count": {"$sum": 1}}}
    ]).to_list(10)
    by_type = await db.carbon_credits.aggregate([
        {"$group": {"_id": "$project_type", "total_tonnes": {"$sum": "$quantity_tonnes"}, "count": {"$sum": 1}}}
    ]).to_list(10)

    total_credits = await db.carbon_credits.count_documents({})
    total_tonnes = 0
    total_retired = 0
    for s in stats:
        total_tonnes += s.get("total_tonnes", 0)
        total_retired += s.get("retired_tonnes", 0)

    return {
        "total_credits": total_credits,
        "total_tonnes": total_tonnes,
        "total_retired_tonnes": total_retired,
        "by_status": [{k: v for k, v in s.items() if k != "_id"} | {"status": s["_id"]} for s in stats],
        "by_region": [{"region": r["_id"], "total_tonnes": r["total_tonnes"], "count": r["count"]} for r in by_region],
        "by_type": [{"type": t["_id"], "total_tonnes": t["total_tonnes"], "count": t["count"]} for t in by_type],
    }

# ===== COMPLIANCE ENDPOINTS =====
@api_router.get("/compliance/regions")
async def get_compliance_regions():
    regions = await db.compliance_rules.find({}, {"_id": 0, "id": 1, "region": 1, "name": 1, "carbon_tax_rate": 1, "max_transaction_limit": 1}).to_list(20)
    return regions

@api_router.get("/compliance/rules")
async def get_compliance_rules(region: str = None):
    query = {}
    if region:
        query["region"] = region.upper()
    rules = await db.compliance_rules.find(query, {"_id": 0}).to_list(20)
    return rules

@api_router.get("/compliance/status")
async def get_compliance_status(user: dict = Depends(get_current_user)):
    user_region = user.get("region", "US")
    rules = await db.compliance_rules.find_one({"region": user_region}, {"_id": 0})
    trade_count = await db.trades.count_documents({"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]})
    return {
        "user_id": user["_id"],
        "region": user_region,
        "compliance_status": user.get("compliance_status", "pending"),
        "kyc_tier": user.get("kyc_tier", 0),
        "region_rules": rules,
        "total_trades": trade_count,
        "last_checked": datetime.now(timezone.utc).isoformat(),
    }

# ===== DASHBOARD ENDPOINTS =====
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    balances = wallet.get("balances", {}) if wallet else {}

    # Calculate portfolio value
    portfolio_value = balances.get("USD", 0)
    assets = await db.assets.find({}, {"_id": 0}).to_list(100)
    asset_prices = {a["symbol"]: a.get("current_price", a["base_price"]) for a in assets}
    for symbol, qty in balances.items():
        if symbol != "USD" and symbol in asset_prices:
            portfolio_value += qty * asset_prices[symbol]

    trade_count = await db.trades.count_documents({"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]})
    open_orders = await db.orders.count_documents({"user_id": user["_id"], "status": "open"})
    carbon_balance = balances.get("CARBON", 0)
    total_market_volume = await db.trades.count_documents({})

    return {
        "portfolio_value": round(portfolio_value, 2),
        "balances": balances,
        "trade_count": trade_count,
        "open_orders": open_orders,
        "carbon_balance": carbon_balance,
        "total_market_trades": total_market_volume,
        "asset_prices": asset_prices,
    }

@api_router.get("/dashboard/market-data")
async def get_market_data():
    assets = await db.assets.find({"symbol": {"$ne": "USD"}}, {"_id": 0}).to_list(100)
    market_data = []
    for asset in assets:
        history = await db.price_history.find(
            {"asset": asset["symbol"]}, {"_id": 0}
        ).sort("date", -1).limit(30).to_list(30)
        market_data.append({
            "symbol": asset["symbol"],
            "name": asset["name"],
            "category": asset["category"],
            "current_price": asset.get("current_price", asset["base_price"]),
            "price_change_24h": asset.get("price_change_24h", 0),
            "volume_24h": asset.get("volume_24h", 0),
            "price_history": list(reversed(history)),
        })
    return market_data

# ===== RISK ENDPOINTS =====
@api_router.get("/risk/score")
async def get_risk_score(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    balances = wallet.get("balances", {}) if wallet else {}
    trade_count = await db.trades.count_documents({"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]})

    # Simple risk scoring
    diversification = len([v for v in balances.values() if v > 0])
    kyc_tier = user.get("kyc_tier", 0)
    risk_score = max(10, 100 - (diversification * 10) - (kyc_tier * 15) - min(trade_count, 10) * 3)
    risk_level = "low" if risk_score < 30 else ("medium" if risk_score < 60 else "high")

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": {
            "diversification": diversification,
            "kyc_tier": kyc_tier,
            "trade_history": trade_count,
            "compliance_status": user.get("compliance_status", "pending"),
        },
        "recommendations": [
            "Diversify your portfolio across more asset classes" if diversification < 3 else "Good portfolio diversification",
            "Complete KYC verification to reduce risk" if kyc_tier < 2 else "KYC verification complete",
            "Build trading history for better risk profile" if trade_count < 5 else "Established trading history",
        ]
    }

@api_router.get("/risk/market")
async def get_market_risk():
    assets = await db.assets.find({"symbol": {"$ne": "USD"}}, {"_id": 0}).to_list(100)
    risk_data = []
    for asset in assets:
        volatility = abs(asset.get("price_change_24h", 0))
        risk_level = "low" if volatility < 2 else ("medium" if volatility < 5 else "high")
        risk_data.append({
            "symbol": asset["symbol"],
            "name": asset["name"],
            "volatility": volatility,
            "risk_level": risk_level,
            "volume_24h": asset.get("volume_24h", 0),
        })
    return risk_data

# ===== PREDICTION MARKETS =====
@api_router.get("/predictions")
async def get_predictions():
    predictions = await db.predictions.find({}, {"_id": 0}).to_list(50)
    for p in predictions:
        total = p.get("yes_pool", 0) + p.get("no_pool", 0)
        p["yes_probability"] = round(p.get("yes_pool", 0) / total * 100, 1) if total > 0 else 50
        p["no_probability"] = round(100 - p["yes_probability"], 1)
    return predictions

@api_router.post("/predictions/{prediction_id}/bet")
async def place_bet(prediction_id: str, bet: PredictionBet, user: dict = Depends(get_current_user)):
    pred = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction market not found")
    if pred.get("status") != "active":
        raise HTTPException(status_code=400, detail="Market not active")

    wallet = await db.wallets.find_one({"user_id": user["_id"]})
    if not wallet or wallet.get("balances", {}).get("USD", 0) < bet.amount:
        raise HTTPException(status_code=400, detail="Insufficient USD balance")

    pool_key = "yes_pool" if bet.position == "yes" else "no_pool"
    await db.predictions.update_one({"id": prediction_id}, {"$inc": {pool_key: bet.amount, "total_bets": 1}})
    await db.wallets.update_one({"user_id": user["_id"]}, {"$inc": {"balances.USD": -bet.amount}})
    return {"message": f"Bet placed: {bet.position} for ${bet.amount}"}

# ===== AI CHAT ENDPOINTS =====
@api_router.post("/chat")
async def chat_with_ai(msg: ChatMessage, user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        # Get market context for AI
        assets = await db.assets.find({}, {"_id": 0, "symbol": 1, "current_price": 1, "price_change_24h": 1}).to_list(10)
        wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
        balances = wallet.get("balances", {}) if wallet else {}

        market_context = "Current market data:\n"
        for a in assets:
            market_context += f"- {a['symbol']}: ${a.get('current_price', 'N/A')} (24h change: {a.get('price_change_24h', 0)}%)\n"
        market_context += f"\nUser portfolio: {balances}\nUser role: {user['role']}, Region: {user.get('region', 'US')}"

        system_msg = f"""You are E4N AI Assistant, an expert in carbon credit trading, sustainable finance, and commodity markets.
You help users with trade execution, risk analysis, compliance guidance, and market insights.
Be concise, professional, and data-driven.

{market_context}

Capabilities:
- Explain carbon credit markets and compliance rules
- Provide trade suggestions based on market data
- Analyze risk factors and portfolio diversification
- Guide users on compliance requirements by region
- Explain settlement processes and token mechanics"""

        session_id = f"chat_{user['_id']}_{datetime.now(timezone.utc).strftime('%Y%m%d')}"
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=session_id,
            system_message=system_msg,
        ).with_model("openai", "gpt-5.2")

        user_message = UserMessage(text=msg.message)
        response = await chat.send_message(user_message)

        # Store chat in DB
        chat_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "user_message": msg.message,
            "ai_response": response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.chat_messages.insert_one(chat_doc)

        return {"response": response, "timestamp": chat_doc["timestamp"]}
    except Exception as e:
        logger.error(f"AI Chat error: {e}")
        return {"response": "I'm experiencing connectivity issues. Please try again shortly.", "error": True}

@api_router.get("/chat/history")
async def get_chat_history(user: dict = Depends(get_current_user)):
    messages = await db.chat_messages.find(
        {"user_id": user["_id"]}, {"_id": 0}
    ).sort("timestamp", -1).to_list(50)
    return list(reversed(messages))

# ===== ADMIN ENDPOINTS =====
@api_router.get("/admin/users")
async def admin_get_users(user: dict = Depends(require_role("regulator"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return users

@api_router.get("/admin/trades")
async def admin_get_trades(user: dict = Depends(require_role("regulator"))):
    trades = await db.trades.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    return trades

@api_router.get("/admin/reports")
async def admin_get_reports(user: dict = Depends(require_role("regulator"))):
    total_users = await db.users.count_documents({})
    total_trades = await db.trades.count_documents({})
    total_orders = await db.orders.count_documents({})
    carbon_credits = await db.carbon_credits.count_documents({})
    verified_credits = await db.carbon_credits.count_documents({"status": "verified"})
    pending_credits = await db.carbon_credits.count_documents({"status": "pending"})

    trade_volume = await db.trades.aggregate([
        {"$group": {"_id": None, "total_volume": {"$sum": "$total"}}}
    ]).to_list(1)

    return {
        "total_users": total_users,
        "total_trades": total_trades,
        "total_orders": total_orders,
        "total_carbon_credits": carbon_credits,
        "verified_credits": verified_credits,
        "pending_credits": pending_credits,
        "total_trade_volume": trade_volume[0]["total_volume"] if trade_volume else 0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

@api_router.put("/admin/users/{user_id}/compliance")
async def admin_update_compliance(user_id: str, status: str = "verified", user: dict = Depends(require_role("regulator"))):
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"compliance_status": status, "kyc_tier": 2 if status == "verified" else 1}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": f"User compliance updated to {status}"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

# ===== PORTFOLIO ENDPOINT =====
@api_router.get("/portfolio")
async def get_portfolio(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user["_id"]}, {"_id": 0})
    balances = wallet.get("balances", {}) if wallet else {}
    assets = await db.assets.find({}, {"_id": 0}).to_list(100)
    asset_map = {a["symbol"]: a for a in assets}

    holdings = []
    total_value = 0
    for symbol, qty in balances.items():
        if qty <= 0:
            continue
        asset = asset_map.get(symbol, {})
        price = asset.get("current_price", asset.get("base_price", 1))
        value = round(qty * price, 2)
        total_value += value
        holdings.append({
            "symbol": symbol,
            "name": asset.get("name", symbol),
            "quantity": qty,
            "price": price,
            "value": value,
            "change_24h": asset.get("price_change_24h", 0),
            "category": asset.get("category", "settlement"),
        })

    trades = await db.trades.find(
        {"$or": [{"buyer_id": user["_id"]}, {"seller_id": user["_id"]}]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(20)

    return {
        "total_value": round(total_value, 2),
        "holdings": sorted(holdings, key=lambda x: x["value"], reverse=True),
        "recent_trades": trades,
    }

# ===== Include Router =====
app.include_router(api_router)
app.include_router(features_router)
app.include_router(blockchain_router)
app.include_router(contracts_router)

# WebSocket endpoint (on main app, not router)
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back or handle commands
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await seed_database()
    init_features(db, get_current_user, require_role)
    init_blockchain(db, get_current_user, require_role)
    init_contracts(db, get_current_user)
    await seed_blockchain_data()
    await seed_contract_scenarios()
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init: {e}")
    import asyncio
    asyncio.create_task(price_update_loop())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
