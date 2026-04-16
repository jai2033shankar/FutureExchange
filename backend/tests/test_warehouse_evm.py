"""
E4N Warehouse Tokenization & EVM Bridge API Tests
Tests for iteration 8: Deep warehouse tokenization and EVM bridge features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://necessity-trade.preview.emergentagent.com').rstrip('/')

# Test credentials
RETAIL_USER = {"email": "retail_user_1@e4n.com", "password": "Test@123"}
INST_USER = {"email": "inst_buyer_1@e4n.com", "password": "Test@123"}
REGULATOR = {"email": "regulator_1@e4n.com", "password": "Admin@123"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for retail user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=RETAIL_USER)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def warehouse_id(api_client):
    """Get first warehouse ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/warehouses")
    if response.status_code == 200:
        warehouses = response.json()
        if warehouses:
            return warehouses[0]["id"]
    pytest.skip("No warehouses found")


# ===== AUTHENTICATION TESTS =====
class TestAuth:
    """Authentication tests for all user types"""
    
    def test_login_retail_user(self, api_client):
        """Test retail user login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=RETAIL_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["email"] == RETAIL_USER["email"]
        print(f"✓ Retail user login successful: {data['name']}")
    
    def test_login_institutional_user(self, api_client):
        """Test institutional user login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=INST_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["role"] == "institutional"
        print(f"✓ Institutional user login successful: {data['name']}")
    
    def test_login_regulator(self, api_client):
        """Test regulator login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=REGULATOR)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["role"] == "regulator"
        print(f"✓ Regulator login successful: {data['name']}")


# ===== WAREHOUSE TOKENIZATION TESTS =====
class TestWarehouseTokenization:
    """Warehouse tokenization deep module tests"""
    
    def test_get_warehouses_list(self, api_client):
        """Test GET /api/warehouses - list all warehouses"""
        response = api_client.get(f"{BASE_URL}/api/warehouses")
        assert response.status_code == 200, f"Failed: {response.text}"
        warehouses = response.json()
        assert isinstance(warehouses, list)
        assert len(warehouses) >= 4, "Expected at least 4 seeded warehouses"
        # Verify warehouse structure
        wh = warehouses[0]
        assert "id" in wh
        assert "name" in wh
        assert "location" in wh
        assert "capacity" in wh
        print(f"✓ GET /api/warehouses: {len(warehouses)} warehouses found")
        for w in warehouses:
            print(f"  - {w['name']} ({w['location']})")
    
    def test_get_warehouse_token_info(self, api_client, warehouse_id):
        """Test GET /api/warehouses/{id}/token-info"""
        response = api_client.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/token-info")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Verify token info structure
        assert "total_supply" in data
        assert "circulating_supply" in data
        assert "locked_supply" in data
        assert "holders" in data
        assert "recent_events" in data
        assert "warehouse" in data
        print(f"✓ GET /api/warehouses/{warehouse_id}/token-info")
        print(f"  - Token Symbol: {data.get('token_symbol')}")
        print(f"  - Total Supply: {data.get('total_supply')}")
        print(f"  - Holders: {len(data.get('holders', []))}")
        print(f"  - Recent Events: {len(data.get('recent_events', []))}")
    
    def test_get_warehouse_inventory(self, api_client, warehouse_id):
        """Test GET /api/warehouses/{id}/inventory"""
        response = api_client.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/inventory")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "inventory" in data
        assert "summary" in data
        assert "warehouse_id" in data
        inventory = data["inventory"]
        summary = data["summary"]
        print(f"✓ GET /api/warehouses/{warehouse_id}/inventory")
        print(f"  - Inventory Lots: {len(inventory)}")
        print(f"  - Summary Assets: {len(summary)}")
        if inventory:
            lot = inventory[0]
            assert "lot_number" in lot
            assert "asset_symbol" in lot
            assert "quantity" in lot
            assert "grade" in lot
            print(f"  - Sample Lot: {lot['lot_number']} - {lot['asset_symbol']} ({lot['quantity']})")
    
    def test_get_warehouse_alerts(self, api_client, warehouse_id):
        """Test GET /api/warehouses/{id}/alerts"""
        response = api_client.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/alerts")
        assert response.status_code == 200, f"Failed: {response.text}"
        alerts = response.json()
        assert isinstance(alerts, list)
        print(f"✓ GET /api/warehouses/{warehouse_id}/alerts: {len(alerts)} alerts")
        if alerts:
            alert = alerts[0]
            assert "severity" in alert
            assert "type" in alert
            assert "message" in alert
            print(f"  - Sample Alert: [{alert['severity']}] {alert['type']}: {alert['message'][:50]}...")
    
    def test_get_warehouse_compliance(self, api_client, warehouse_id):
        """Test GET /api/warehouses/{id}/compliance"""
        response = api_client.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/compliance")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "compliance_score" in data
        assert "certifications" in data
        assert "region" in data
        print(f"✓ GET /api/warehouses/{warehouse_id}/compliance")
        print(f"  - Compliance Score: {data['compliance_score']}%")
        print(f"  - Region: {data['region']}")
        print(f"  - Certifications: {len(data.get('certifications', []))}")
    
    def test_get_warehouse_analytics(self, api_client, warehouse_id):
        """Test GET /api/warehouses/{id}/analytics"""
        response = api_client.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/analytics")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "utilization_trend" in data
        assert "value_trend" in data
        assert "activity" in data
        assert "current_utilization_pct" in data
        print(f"✓ GET /api/warehouses/{warehouse_id}/analytics")
        print(f"  - Current Utilization: {data['current_utilization_pct']}%")
        print(f"  - Utilization Trend Points: {len(data.get('utilization_trend', []))}")
        print(f"  - Value Trend Points: {len(data.get('value_trend', []))}")
    
    def test_mint_tokens_authenticated(self, authenticated_client, warehouse_id):
        """Test POST /api/warehouses/tokens/mint (requires auth)"""
        payload = {
            "warehouse_id": warehouse_id,
            "amount": 100.0,
            "reason": "test_inventory_deposit"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/warehouses/tokens/mint", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "new_supply" in data
        assert "event" in data
        event = data["event"]
        assert event["type"] == "mint"
        assert event["amount"] == 100.0
        print(f"✓ POST /api/warehouses/tokens/mint")
        print(f"  - Minted: {payload['amount']} tokens")
        print(f"  - New Supply: {data['new_supply']}")
        print(f"  - TX Hash: {event['tx_hash'][:20]}...")
    
    def test_burn_tokens_authenticated(self, authenticated_client, warehouse_id):
        """Test POST /api/warehouses/tokens/burn (requires auth)"""
        payload = {
            "warehouse_id": warehouse_id,
            "amount": 50.0,
            "reason": "test_inventory_withdrawal"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/warehouses/tokens/burn", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "new_supply" in data
        assert "event" in data
        event = data["event"]
        assert event["type"] == "burn"
        print(f"✓ POST /api/warehouses/tokens/burn")
        print(f"  - Burned: {payload['amount']} tokens")
        print(f"  - New Supply: {data['new_supply']}")
    
    def test_deposit_inventory_authenticated(self, authenticated_client, warehouse_id):
        """Test POST /api/warehouses/inventory/deposit (requires auth)"""
        payload = {
            "warehouse_id": warehouse_id,
            "asset_symbol": "WHEAT",
            "quantity": 500.0,
            "grade": "A",
            "lot_number": ""
        }
        response = authenticated_client.post(f"{BASE_URL}/api/warehouses/inventory/deposit", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "inventory" in data
        assert "tokens_minted" in data
        inv = data["inventory"]
        assert inv["asset_symbol"] == "WHEAT"
        assert inv["quantity"] == 500.0
        assert inv["grade"] == "A"
        assert "lot_number" in inv
        print(f"✓ POST /api/warehouses/inventory/deposit")
        print(f"  - Deposited: {payload['quantity']} {payload['asset_symbol']}")
        print(f"  - Lot Number: {inv['lot_number']}")
        print(f"  - Tokens Minted: {data['tokens_minted']}")
    
    def test_warehouse_not_found(self, api_client):
        """Test 404 for invalid warehouse ID"""
        response = api_client.get(f"{BASE_URL}/api/warehouses/invalid-id-12345/token-info")
        assert response.status_code == 404
        print("✓ GET /api/warehouses/invalid-id/token-info returns 404")


# ===== EVM BRIDGE TESTS =====
class TestEVMBridge:
    """EVM Bridge simulation tests"""
    
    def test_get_chains(self, api_client):
        """Test GET /api/evm/chains - list supported chains"""
        response = api_client.get(f"{BASE_URL}/api/evm/chains")
        assert response.status_code == 200, f"Failed: {response.text}"
        chains = response.json()
        assert isinstance(chains, list)
        assert len(chains) == 4, "Expected 4 chains (E4N L2, Ethereum, Arbitrum, Avalanche)"
        chain_names = [c["name"] for c in chains]
        print(f"✓ GET /api/evm/chains: {len(chains)} chains")
        for c in chains:
            print(f"  - {c['name']} (Chain ID: {c['chain_id']}, Type: {c['type']})")
            assert "chain_id" in c
            assert "type" in c
            assert "block_time" in c
            assert "finality" in c
            assert "features" in c
    
    def test_get_bridge_stats(self, api_client):
        """Test GET /api/evm/bridge/stats"""
        response = api_client.get(f"{BASE_URL}/api/evm/bridge/stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        stats = response.json()
        assert "total_transfers" in stats
        assert "total_volume_usd" in stats
        assert "tvl" in stats
        assert "pending_transfers" in stats
        assert "supported_assets" in stats
        print(f"✓ GET /api/evm/bridge/stats")
        print(f"  - Total Transfers: {stats['total_transfers']}")
        print(f"  - Total Volume: ${stats['total_volume_usd']:,.2f}")
        print(f"  - Pending: {stats['pending_transfers']}")
        print(f"  - Supported Assets: {stats['supported_assets']}")
    
    def test_get_all_bridge_transfers(self, api_client):
        """Test GET /api/evm/bridge/transfers/all (public)"""
        response = api_client.get(f"{BASE_URL}/api/evm/bridge/transfers/all")
        assert response.status_code == 200, f"Failed: {response.text}"
        transfers = response.json()
        assert isinstance(transfers, list)
        assert len(transfers) >= 10, "Expected at least 10 seeded transfers"
        print(f"✓ GET /api/evm/bridge/transfers/all: {len(transfers)} transfers")
        if transfers:
            t = transfers[0]
            assert "asset_symbol" in t
            assert "amount" in t
            assert "source_chain" in t
            assert "dest_chain" in t
            assert "status" in t
            assert "steps" in t
            print(f"  - Sample: {t['amount']} {t['asset_symbol']} ({t['source_chain_name']} → {t['dest_chain_name']}) [{t['status']}]")
    
    def test_get_gas_oracle(self, api_client):
        """Test GET /api/evm/gas-oracle"""
        response = api_client.get(f"{BASE_URL}/api/evm/gas-oracle")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "comparison" in data
        assert "chains" in data
        assert "recommendation" in data
        comparison = data["comparison"]
        assert len(comparison) >= 5, "Expected at least 5 operations compared"
        print(f"✓ GET /api/evm/gas-oracle")
        print(f"  - Operations Compared: {len(comparison)}")
        print(f"  - Chains: {list(data['chains'].keys())}")
        print(f"  - Recommendation: {data['recommendation'][:80]}...")
        # Verify gas comparison structure
        for op in comparison:
            assert "operation" in op
            assert "e4n_l2" in op
            assert "ethereum" in op
    
    def test_get_contract_templates(self, api_client):
        """Test GET /api/evm/contracts/templates"""
        response = api_client.get(f"{BASE_URL}/api/evm/contracts/templates")
        assert response.status_code == 200, f"Failed: {response.text}"
        templates = response.json()
        assert isinstance(templates, list)
        assert len(templates) == 5, "Expected 5 contract templates"
        template_types = [t["type"] for t in templates]
        expected_types = ["escrow", "token_swap", "dvp_settlement", "warehouse_receipt", "carbon_retirement"]
        for et in expected_types:
            assert et in template_types, f"Missing template: {et}"
        print(f"✓ GET /api/evm/contracts/templates: {len(templates)} templates")
        for t in templates:
            print(f"  - {t['name']} (v{t['version']}): {len(t.get('functions', []))} functions")
            assert "functions" in t
            assert "events" in t
    
    def test_get_contract_deployments(self, api_client):
        """Test GET /api/evm/contracts/deployments"""
        response = api_client.get(f"{BASE_URL}/api/evm/contracts/deployments")
        assert response.status_code == 200, f"Failed: {response.text}"
        deployments = response.json()
        assert isinstance(deployments, list)
        assert len(deployments) >= 10, "Expected at least 10 seeded deployments"
        print(f"✓ GET /api/evm/contracts/deployments: {len(deployments)} deployments")
        if deployments:
            d = deployments[0]
            assert "contract_name" in d
            assert "chain" in d
            assert "address" in d
            assert "status" in d
            print(f"  - Sample: {d['contract_name']} on {d['chain_name']} ({d['address'][:20]}...)")
    
    def test_get_deployments_by_chain(self, api_client):
        """Test GET /api/evm/contracts/deployments?chain=e4n_l2"""
        response = api_client.get(f"{BASE_URL}/api/evm/contracts/deployments?chain=e4n_l2")
        assert response.status_code == 200, f"Failed: {response.text}"
        deployments = response.json()
        for d in deployments:
            assert d["chain"] == "e4n_l2"
        print(f"✓ GET /api/evm/contracts/deployments?chain=e4n_l2: {len(deployments)} E4N L2 deployments")
    
    def test_bridge_transfer_authenticated(self, authenticated_client):
        """Test POST /api/evm/bridge/transfer (requires auth)"""
        payload = {
            "asset_symbol": "CARBON",
            "amount": 50.0,
            "source_chain": "e4n_l2",
            "dest_chain": "ethereum",
            "recipient_address": ""
        }
        response = authenticated_client.post(f"{BASE_URL}/api/evm/bridge/transfer", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "status" in data
        assert "steps" in data
        assert data["asset_symbol"] == "CARBON"
        assert data["amount"] == 50.0
        assert data["source_chain"] == "e4n_l2"
        assert data["dest_chain"] == "ethereum"
        assert len(data["steps"]) == 4
        print(f"✓ POST /api/evm/bridge/transfer")
        print(f"  - Transfer ID: {data['id'][:20]}...")
        print(f"  - Amount: {data['amount']} {data['asset_symbol']}")
        print(f"  - Route: {data['source_chain_name']} → {data['dest_chain_name']}")
        print(f"  - Status: {data['status']}")
        print(f"  - Gas Cost: ${data['gas_cost']['total_usd']:.6f}")
    
    def test_deploy_contract_authenticated(self, authenticated_client):
        """Test POST /api/evm/contracts/deploy (requires auth)"""
        payload = {
            "contract_type": "escrow",
            "chain": "e4n_l2",
            "parameters": {}
        }
        response = authenticated_client.post(f"{BASE_URL}/api/evm/contracts/deploy", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "address" in data
        assert "tx_hash" in data
        assert data["contract_type"] == "escrow"
        assert data["chain"] == "e4n_l2"
        assert data["status"] == "deployed"
        print(f"✓ POST /api/evm/contracts/deploy")
        print(f"  - Contract: {data['contract_name']}")
        print(f"  - Address: {data['address']}")
        print(f"  - Chain: {data['chain_name']}")
        print(f"  - Gas Used: {data['gas_used']:,}")
    
    def test_bridge_transfer_invalid_chain(self, authenticated_client):
        """Test bridge transfer with invalid chain returns 400"""
        payload = {
            "asset_symbol": "CARBON",
            "amount": 50.0,
            "source_chain": "invalid_chain",
            "dest_chain": "ethereum"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/evm/bridge/transfer", json=payload)
        assert response.status_code == 400
        print("✓ POST /api/evm/bridge/transfer with invalid chain returns 400")
    
    def test_bridge_transfer_same_chain(self, authenticated_client):
        """Test bridge transfer with same source/dest returns 400"""
        payload = {
            "asset_symbol": "CARBON",
            "amount": 50.0,
            "source_chain": "ethereum",
            "dest_chain": "ethereum"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/evm/bridge/transfer", json=payload)
        assert response.status_code == 400
        print("✓ POST /api/evm/bridge/transfer with same chain returns 400")
    
    def test_deploy_invalid_contract_type(self, authenticated_client):
        """Test deploy with invalid contract type returns 400"""
        payload = {
            "contract_type": "invalid_type",
            "chain": "e4n_l2"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/evm/contracts/deploy", json=payload)
        assert response.status_code == 400
        print("✓ POST /api/evm/contracts/deploy with invalid type returns 400")


# ===== WAREHOUSE SENSORS TESTS =====
class TestWarehouseSensors:
    """Warehouse sensor endpoint tests"""
    
    def test_get_warehouse_sensors(self, api_client, warehouse_id):
        """Test GET /api/warehouses/{id}/sensors"""
        response = api_client.get(f"{BASE_URL}/api/warehouses/{warehouse_id}/sensors")
        assert response.status_code == 200, f"Failed: {response.text}"
        sensors = response.json()
        assert isinstance(sensors, list)
        print(f"✓ GET /api/warehouses/{warehouse_id}/sensors: {len(sensors)} sensors")
        if sensors:
            s = sensors[0]
            assert "sensor_id" in s
            assert "type" in s
            assert "value" in s
            assert "unit" in s
            assert "status" in s
            print(f"  - Sample: {s['type']} = {s['value']} {s['unit']} [{s['status']}]")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
