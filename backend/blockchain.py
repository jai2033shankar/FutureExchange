"""
E4N Phase 4 Features Module
- Blockchain simulation layer
- Smart contract simulation
- DAO governance module
- IoT warehouse tokenization
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid, hashlib, json, random, logging

logger = logging.getLogger(__name__)

blockchain_router = APIRouter(prefix="/api")

db = None
get_current_user = None
require_role = None

def init_blockchain(database, auth_fn, role_fn):
    global db, get_current_user, require_role
    db = database
    get_current_user = auth_fn
    require_role = role_fn

async def _auth(request: Request):
    return await get_current_user(request)

# ===== PYDANTIC MODELS =====
class DeployContract(BaseModel):
    name: str
    contract_type: str  # escrow, token_swap, carbon_retirement, settlement
    parameters: dict = {}

class ExecuteContract(BaseModel):
    method: str
    args: dict = {}

class CreateProposal(BaseModel):
    title: str
    description: str
    category: str = "general"  # general, regulation, fee_change, asset_listing
    options: List[str] = ["For", "Against", "Abstain"]
    duration_days: int = 7

class VoteRequest(BaseModel):
    option: str

class CreateWarehouse(BaseModel):
    name: str
    location: str
    asset_types: List[str]
    capacity: float
    region: str

class SensorData(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    weight: Optional[float] = None
    status: str = "normal"

# ===== BLOCKCHAIN SIMULATION =====
def compute_hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()

async def create_block(transactions: list, block_type: str = "standard"):
    last_block = await db.blockchain_blocks.find_one({}, sort=[("index", -1)])
    index = (last_block["index"] + 1) if last_block else 0
    previous_hash = last_block["hash"] if last_block else "0" * 64
    timestamp = datetime.now(timezone.utc).isoformat()

    block_data = json.dumps({
        "index": index,
        "transactions": [t.get("id", "") for t in transactions],
        "previous_hash": previous_hash,
        "timestamp": timestamp,
    }, sort_keys=True)

    block = {
        "index": index,
        "hash": compute_hash(block_data),
        "previous_hash": previous_hash,
        "timestamp": timestamp,
        "block_type": block_type,
        "transactions": transactions,
        "transaction_count": len(transactions),
        "nonce": random.randint(0, 999999),
        "gas_used": random.randint(21000, 150000),
        "size": len(block_data),
    }
    await db.blockchain_blocks.insert_one(block)
    block.pop("_id", None)
    return block

async def create_transaction(tx_type: str, from_addr: str, to_addr: str, data: dict):
    tx = {
        "id": f"0x{uuid.uuid4().hex}",
        "type": tx_type,
        "from": from_addr,
        "to": to_addr,
        "data": data,
        "gas": random.randint(21000, 100000),
        "gas_price": round(random.uniform(1, 50), 2),
        "status": "confirmed",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "block_index": None,
    }
    await db.blockchain_transactions.insert_one(tx)
    tx.pop("_id", None)
    return tx

@blockchain_router.get("/blockchain/stats")
async def get_blockchain_stats():
    total_blocks = await db.blockchain_blocks.count_documents({})
    total_txs = await db.blockchain_transactions.count_documents({})
    total_contracts = await db.smart_contracts.count_documents({})
    latest_block = await db.blockchain_blocks.find_one({}, {"_id": 0}, sort=[("index", -1)])
    if latest_block and "transactions" in latest_block:
        latest_block["transactions"] = [{k: v for k, v in tx.items() if k != "_id"} for tx in latest_block["transactions"]]
    return {
        "total_blocks": total_blocks,
        "total_transactions": total_txs,
        "total_contracts": total_contracts,
        "latest_block": latest_block,
        "network": "E4N Testnet",
        "consensus": "Proof of Authority (Simulated)",
        "block_time": "3 seconds",
        "chain_id": 4444,
    }

@blockchain_router.get("/blockchain/blocks")
async def get_blocks(limit: int = 20):
    blocks = await db.blockchain_blocks.find({}, {"_id": 0}).sort("index", -1).to_list(limit)
    for b in blocks:
        if "transactions" in b:
            b["transactions"] = [{k: v for k, v in tx.items() if k != "_id"} for tx in b["transactions"]]
    return blocks

@blockchain_router.get("/blockchain/blocks/{index}")
async def get_block(index: int):
    block = await db.blockchain_blocks.find_one({"index": index}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if "transactions" in block:
        block["transactions"] = [{k: v for k, v in tx.items() if k != "_id"} for tx in block["transactions"]]
    return block

@blockchain_router.get("/blockchain/transactions")
async def get_transactions(limit: int = 30):
    txs = await db.blockchain_transactions.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return txs

# ===== SMART CONTRACTS =====
CONTRACT_TEMPLATES = {
    "escrow": {
        "name": "Escrow Contract",
        "methods": ["deposit", "release", "refund", "get_balance"],
        "description": "Holds funds in escrow until conditions are met",
    },
    "token_swap": {
        "name": "Atomic Token Swap",
        "methods": ["initiate_swap", "complete_swap", "cancel_swap", "get_swap_status"],
        "description": "Enables atomic swap between two token types",
    },
    "carbon_retirement": {
        "name": "Carbon Retirement Contract",
        "methods": ["retire_credits", "get_retired_amount", "verify_retirement", "issue_certificate"],
        "description": "Manages the retirement and verification of carbon credits",
    },
    "settlement": {
        "name": "DvP Settlement Contract",
        "methods": ["lock_assets", "settle", "rollback", "get_settlement_status"],
        "description": "Delivery vs Payment atomic settlement",
    },
}

@blockchain_router.get("/blockchain/contracts")
async def get_contracts(user: dict = Depends(_auth)):
    contracts = await db.smart_contracts.find({}, {"_id": 0}).sort("deployed_at", -1).to_list(50)
    return contracts

@blockchain_router.get("/blockchain/contracts/templates")
async def get_contract_templates():
    return CONTRACT_TEMPLATES

@blockchain_router.post("/blockchain/contracts/deploy")
async def deploy_contract(req: DeployContract, user: dict = Depends(_auth)):
    template = CONTRACT_TEMPLATES.get(req.contract_type)
    if not template:
        raise HTTPException(status_code=400, detail=f"Unknown contract type. Available: {list(CONTRACT_TEMPLATES.keys())}")

    contract_address = f"0x{uuid.uuid4().hex[:40]}"
    contract = {
        "id": str(uuid.uuid4()),
        "address": contract_address,
        "name": req.name,
        "contract_type": req.contract_type,
        "template": template,
        "parameters": req.parameters,
        "deployer": user["_id"],
        "deployer_name": user["name"],
        "status": "active",
        "state": {},
        "execution_log": [],
        "deployed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.smart_contracts.insert_one(contract)

    # Create deployment transaction
    tx = await create_transaction(
        "contract_deployment", user.get("wallet_address", "0x0"),
        contract_address, {"contract_type": req.contract_type, "name": req.name}
    )
    # Create block with deployment tx
    await create_block([tx], "contract_deployment")

    contract.pop("_id", None)
    return contract

@blockchain_router.get("/blockchain/contracts/{contract_id}")
async def get_contract(contract_id: str):
    contract = await db.smart_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@blockchain_router.post("/blockchain/contracts/{contract_id}/execute")
async def execute_contract(contract_id: str, req: ExecuteContract, user: dict = Depends(_auth)):
    contract = await db.smart_contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract["status"] != "active":
        raise HTTPException(status_code=400, detail="Contract not active")

    template = contract.get("template", {})
    if req.method not in template.get("methods", []):
        raise HTTPException(status_code=400, detail=f"Method '{req.method}' not found. Available: {template.get('methods', [])}")

    # Simulate execution
    result = {
        "method": req.method,
        "args": req.args,
        "success": True,
        "gas_used": random.randint(21000, 80000),
        "return_value": f"Executed {req.method} successfully",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Update contract state
    log_entry = {
        "executor": user["_id"],
        "method": req.method,
        "args": req.args,
        "result": result["return_value"],
        "timestamp": result["timestamp"],
    }
    await db.smart_contracts.update_one(
        {"id": contract_id},
        {"$push": {"execution_log": log_entry}}
    )

    tx = await create_transaction(
        "contract_execution", user.get("wallet_address", "0x0"),
        contract.get("address", "0x0"),
        {"contract_id": contract_id, "method": req.method, "args": req.args}
    )
    await create_block([tx], "contract_execution")

    return result

# ===== DAO GOVERNANCE =====
@blockchain_router.get("/governance/proposals")
async def get_proposals(status: str = None):
    query = {}
    if status:
        query["status"] = status
    proposals = await db.governance_proposals.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    # Calculate vote counts
    for p in proposals:
        votes = await db.governance_votes.find({"proposal_id": p["id"]}, {"_id": 0}).to_list(1000)
        vote_counts = {}
        for opt in p.get("options", []):
            vote_counts[opt] = sum(1 for v in votes if v.get("option") == opt)
        p["vote_counts"] = vote_counts
        p["total_votes"] = len(votes)
        # Check if expired
        if p.get("end_date") and datetime.fromisoformat(p["end_date"]) < datetime.now(timezone.utc):
            if p["status"] == "active":
                await db.governance_proposals.update_one({"id": p["id"]}, {"$set": {"status": "closed"}})
                p["status"] = "closed"
    return proposals

@blockchain_router.post("/governance/proposals")
async def create_proposal(req: CreateProposal, user: dict = Depends(_auth)):
    proposal = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "description": req.description,
        "category": req.category,
        "options": req.options,
        "proposer_id": user["_id"],
        "proposer_name": user["name"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "end_date": (datetime.now(timezone.utc) + timedelta(days=req.duration_days)).isoformat(),
        "quorum": 3,
    }
    await db.governance_proposals.insert_one(proposal)

    tx = await create_transaction("governance_proposal", user.get("wallet_address", "0x0"), "0xDAO", {"proposal_id": proposal["id"], "title": req.title})
    await create_block([tx], "governance")

    proposal.pop("_id", None)
    return proposal

@blockchain_router.post("/governance/proposals/{proposal_id}/vote")
async def vote_on_proposal(proposal_id: str, req: VoteRequest, user: dict = Depends(_auth)):
    proposal = await db.governance_proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal["status"] != "active":
        raise HTTPException(status_code=400, detail="Voting is closed")
    if req.option not in proposal.get("options", []):
        raise HTTPException(status_code=400, detail=f"Invalid option. Choose from: {proposal['options']}")

    existing = await db.governance_votes.find_one({"proposal_id": proposal_id, "voter_id": user["_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You have already voted on this proposal")

    vote = {
        "id": str(uuid.uuid4()),
        "proposal_id": proposal_id,
        "voter_id": user["_id"],
        "voter_name": user["name"],
        "option": req.option,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.governance_votes.insert_one(vote)

    tx = await create_transaction("governance_vote", user.get("wallet_address", "0x0"), "0xDAO", {"proposal_id": proposal_id, "vote": req.option})
    await create_block([tx], "governance")

    return {"message": f"Vote '{req.option}' recorded", "vote_id": vote["id"]}

# ===== IoT WAREHOUSE TOKENIZATION =====
@blockchain_router.get("/warehouses")
async def get_warehouses():
    warehouses = await db.warehouses.find({}, {"_id": 0}).to_list(50)
    return warehouses

@blockchain_router.post("/warehouses")
async def create_warehouse(req: CreateWarehouse, user: dict = Depends(_auth)):
    warehouse = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "location": req.location,
        "asset_types": req.asset_types,
        "capacity": req.capacity,
        "current_utilization": round(random.uniform(0.3, 0.85) * req.capacity, 2),
        "region": req.region,
        "owner_id": user["_id"],
        "owner_name": user["name"],
        "token_address": f"0x{uuid.uuid4().hex[:40]}",
        "status": "active",
        "sensors": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.warehouses.insert_one(warehouse)

    tx = await create_transaction("warehouse_tokenization", user.get("wallet_address", "0x0"), warehouse["token_address"], {"warehouse_id": warehouse["id"], "name": req.name})
    await create_block([tx], "warehouse")

    warehouse.pop("_id", None)
    return warehouse

@blockchain_router.get("/warehouses/{warehouse_id}")
async def get_warehouse(warehouse_id: str):
    wh = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return wh

@blockchain_router.get("/warehouses/{warehouse_id}/sensors")
async def get_warehouse_sensors(warehouse_id: str):
    wh = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    # Generate simulated sensor data
    sensors = []
    for i in range(4):
        sensors.append({
            "sensor_id": f"SENSOR-{warehouse_id[:6]}-{i+1}",
            "type": ["temperature", "humidity", "weight", "air_quality"][i],
            "value": [round(random.uniform(18, 28), 1), round(random.uniform(40, 70), 1), round(random.uniform(100, 5000), 1), round(random.uniform(80, 100), 1)][i],
            "unit": ["C", "%", "kg", "AQI"][i],
            "status": random.choice(["normal", "normal", "normal", "warning"]),
            "last_reading": datetime.now(timezone.utc).isoformat(),
            "history": [
                {"value": round(random.uniform(15, 30), 1), "timestamp": (datetime.now(timezone.utc) - timedelta(hours=j)).isoformat()}
                for j in range(24, 0, -1)
            ],
        })
    return sensors

@blockchain_router.post("/warehouses/{warehouse_id}/sensors/data")
async def post_sensor_data(warehouse_id: str, data: SensorData, user: dict = Depends(_auth)):
    wh = await db.warehouses.find_one({"id": warehouse_id})
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    reading = {
        "id": str(uuid.uuid4()),
        "warehouse_id": warehouse_id,
        "data": data.dict(),
        "recorded_by": user["_id"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.sensor_readings.insert_one(reading)

    if data.status == "warning" or data.status == "critical":
        tx = await create_transaction("sensor_alert", wh.get("token_address", "0x0"), "0xALERT", {"warehouse_id": warehouse_id, "status": data.status})
        await create_block([tx], "iot_alert")

    reading.pop("_id", None)
    return reading

# ===== SEED BLOCKCHAIN DATA =====
async def seed_blockchain_data():
    """Seed initial blockchain, contracts, proposals, and warehouses"""
    existing_blocks = await db.blockchain_blocks.count_documents({})
    if existing_blocks > 0:
        return

    logger.info("Seeding blockchain data...")

    # Genesis block
    genesis = {
        "index": 0,
        "hash": compute_hash("E4N Genesis Block"),
        "previous_hash": "0" * 64,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "block_type": "genesis",
        "transactions": [],
        "transaction_count": 0,
        "nonce": 0,
        "gas_used": 0,
        "size": 256,
    }
    await db.blockchain_blocks.insert_one(genesis)

    # Sample blocks
    for i in range(1, 16):
        tx = {
            "id": f"0x{uuid.uuid4().hex}",
            "type": random.choice(["transfer", "trade", "carbon_retirement", "contract_execution"]),
            "from": f"0x{uuid.uuid4().hex[:40]}",
            "to": f"0x{uuid.uuid4().hex[:40]}",
            "data": {"amount": random.randint(1, 1000)},
            "gas": random.randint(21000, 100000),
            "gas_price": round(random.uniform(1, 50), 2),
            "status": "confirmed",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=i*3)).isoformat(),
        }
        await db.blockchain_transactions.insert_one(tx)
        prev = await db.blockchain_blocks.find_one({}, sort=[("index", -1)])
        block_data = json.dumps({"index": i, "tx": tx["id"], "prev": prev["hash"]})
        block = {
            "index": i,
            "hash": compute_hash(block_data),
            "previous_hash": prev["hash"],
            "timestamp": tx["timestamp"],
            "block_type": "standard",
            "transactions": [tx],
            "transaction_count": 1,
            "nonce": random.randint(0, 999999),
            "gas_used": tx["gas"],
            "size": random.randint(500, 2000),
        }
        await db.blockchain_blocks.insert_one(block)

    # Sample smart contracts
    for ct, template in CONTRACT_TEMPLATES.items():
        contract = {
            "id": str(uuid.uuid4()),
            "address": f"0x{uuid.uuid4().hex[:40]}",
            "name": f"E4N {template['name']}",
            "contract_type": ct,
            "template": template,
            "parameters": {},
            "deployer": "system",
            "deployer_name": "E4N System",
            "status": "active",
            "state": {},
            "execution_log": [],
            "deployed_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.smart_contracts.insert_one(contract)

    # Sample governance proposals
    proposals = [
        {"title": "Increase carbon credit trading fee to 0.5%", "description": "Proposal to increase the trading fee on carbon credit transactions from 0.3% to 0.5% to fund platform development.", "category": "fee_change", "options": ["For", "Against", "Abstain"]},
        {"title": "List Hydrogen Token (H2) on the exchange", "description": "Add hydrogen energy tokens to the E4N exchange to support the growing hydrogen economy.", "category": "asset_listing", "options": ["For", "Against", "Abstain"]},
        {"title": "Implement mandatory carbon offset for all trades", "description": "Require a 0.1% carbon offset fee on all trades to make E4N carbon-neutral.", "category": "regulation", "options": ["For", "Against", "Abstain"]},
    ]
    for p in proposals:
        p["id"] = str(uuid.uuid4())
        p["proposer_id"] = "system"
        p["proposer_name"] = "E4N DAO"
        p["status"] = "active"
        p["created_at"] = datetime.now(timezone.utc).isoformat()
        p["end_date"] = (datetime.now(timezone.utc) + timedelta(days=random.randint(5, 30))).isoformat()
        p["quorum"] = 3
        await db.governance_proposals.insert_one(p)

    # Sample warehouses
    warehouses = [
        {"name": "Rotterdam Grain Terminal", "location": "Rotterdam, Netherlands", "asset_types": ["WHEAT", "RICE"], "capacity": 50000, "region": "EU"},
        {"name": "Houston Energy Storage", "location": "Houston, TX, USA", "asset_types": ["KWH"], "capacity": 100000, "region": "US"},
        {"name": "Mumbai Water Reserve", "location": "Mumbai, India", "asset_types": ["H2O"], "capacity": 200000, "region": "APAC"},
        {"name": "Nairobi Carbon Vault", "location": "Nairobi, Kenya", "asset_types": ["CARBON"], "capacity": 25000, "region": "AFRICA"},
    ]
    for w in warehouses:
        w["id"] = str(uuid.uuid4())
        w["current_utilization"] = round(random.uniform(0.3, 0.85) * w["capacity"], 2)
        w["owner_id"] = "system"
        w["owner_name"] = "E4N Infrastructure"
        w["token_address"] = f"0x{uuid.uuid4().hex[:40]}"
        w["status"] = "active"
        w["sensors"] = []
        w["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.warehouses.insert_one(w)

    # Create indexes
    await db.blockchain_blocks.create_index("index", unique=True)
    await db.blockchain_transactions.create_index("timestamp")
    await db.smart_contracts.create_index("address")
    await db.governance_proposals.create_index("status")
    await db.warehouses.create_index("region")

    logger.info("Blockchain data seeded!")
