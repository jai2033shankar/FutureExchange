"""
E4N Prediction Markets & PINN Models API Tests
Tests for Kalshi-style prediction markets and PINN ML models
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPredictionMarketsPublic:
    """Public prediction market endpoints (no auth required)"""
    
    def test_list_markets(self):
        """GET /api/markets - List all prediction markets"""
        response = requests.get(f"{BASE_URL}/api/markets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 13, f"Expected at least 13 markets, got {len(data)}"
        # Verify market structure
        if data:
            market = data[0]
            assert "id" in market
            assert "title" in market
            assert "yes_price" in market
            assert "no_price" in market
            assert "category" in market
            assert "status" in market
            print(f"✓ Found {len(data)} prediction markets")
    
    def test_market_stats(self):
        """GET /api/markets/stats - Get overall statistics"""
        response = requests.get(f"{BASE_URL}/api/markets/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_markets" in data
        assert "active_markets" in data
        assert "total_volume" in data
        assert "categories" in data
        assert data["active_markets"] >= 13
        print(f"✓ Stats: {data['active_markets']} active markets, ${data['total_volume']:.2f} volume")
    
    def test_market_categories(self):
        """GET /api/markets/categories - Get category list with counts"""
        response = requests.get(f"{BASE_URL}/api/markets/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5, "Expected 5 categories"
        category_keys = [c["key"] for c in data]
        assert "carbon_climate" in category_keys
        assert "commodities" in category_keys
        assert "regulation" in category_keys
        assert "macro_economic" in category_keys
        assert "supply_chain" in category_keys
        print(f"✓ Categories: {', '.join(category_keys)}")
    
    def test_market_leaderboard(self):
        """GET /api/markets/leaderboard - Get top traders"""
        response = requests.get(f"{BASE_URL}/api/markets/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leaderboard has {len(data)} entries")
    
    def test_filter_markets_by_category(self):
        """GET /api/markets?category=carbon_climate - Filter by category"""
        response = requests.get(f"{BASE_URL}/api/markets?category=carbon_climate")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for market in data:
            assert market["category"] == "carbon_climate"
        print(f"✓ Carbon/Climate category has {len(data)} markets")
    
    def test_get_single_market(self):
        """GET /api/markets/{market_id} - Get market detail"""
        # First get list to get a valid ID
        list_response = requests.get(f"{BASE_URL}/api/markets")
        markets = list_response.json()
        if markets:
            market_id = markets[0]["id"]
            response = requests.get(f"{BASE_URL}/api/markets/{market_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == market_id
            assert "price_history" in data
            assert "yes_price" in data
            assert "no_price" in data
            print(f"✓ Market detail: {data['title'][:50]}...")
    
    def test_market_not_found(self):
        """GET /api/markets/{invalid_id} - 404 for invalid market"""
        response = requests.get(f"{BASE_URL}/api/markets/invalid-market-id-12345")
        assert response.status_code == 404


class TestPINNModelsPublic:
    """PINN model endpoints (no auth required)"""
    
    def test_list_pinn_models(self):
        """GET /api/pinn/models - List all PINN models"""
        response = requests.get(f"{BASE_URL}/api/pinn/models")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) == 4
        model_ids = [m["id"] for m in data["models"]]
        assert "ou_forecast" in model_ids
        assert "equilibrium" in model_ids
        assert "vol_surface" in model_ids
        assert "carbon_forecast" in model_ids
        assert data["deterministic"] == True
        print(f"✓ PINN models: {', '.join(model_ids)}")
    
    def test_pinn_forecast_carbon(self):
        """GET /api/pinn/forecast/CARBON - Carbon price forecast"""
        response = requests.get(f"{BASE_URL}/api/pinn/forecast/CARBON?horizon_days=30")
        assert response.status_code == 200
        data = response.json()
        assert data["asset"] == "CARBON"
        assert data["model"] == "PINN-OrnsteinUhlenbeck"
        assert "forecast" in data
        assert len(data["forecast"]) == 31  # 0 to 30 days
        assert "summary" in data
        assert "target_price_30d" in data["summary"]
        print(f"✓ CARBON forecast: target ${data['summary']['target_price_30d']:.2f}")
    
    def test_pinn_forecast_rice(self):
        """GET /api/pinn/forecast/RICE - Rice price forecast"""
        response = requests.get(f"{BASE_URL}/api/pinn/forecast/RICE")
        assert response.status_code == 200
        data = response.json()
        assert data["asset"] == "RICE"
        assert "parameters" in data
        assert "mean_reversion_level" in data["parameters"]
        print(f"✓ RICE forecast: mean reversion level ${data['parameters']['mean_reversion_level']}")
    
    def test_pinn_forecast_all_assets(self):
        """Test forecast for all supported assets"""
        assets = ["RICE", "WHEAT", "KWH", "H2O", "CARBON"]
        for asset in assets:
            response = requests.get(f"{BASE_URL}/api/pinn/forecast/{asset}")
            assert response.status_code == 200, f"Failed for {asset}"
            data = response.json()
            assert data["asset"] == asset
        print(f"✓ All {len(assets)} asset forecasts working")
    
    def test_pinn_forecast_invalid_asset(self):
        """GET /api/pinn/forecast/INVALID - 404 for invalid asset"""
        response = requests.get(f"{BASE_URL}/api/pinn/forecast/INVALID")
        assert response.status_code == 404
    
    def test_pinn_equilibrium_carbon(self):
        """GET /api/pinn/equilibrium/CARBON - Supply-demand equilibrium"""
        response = requests.get(f"{BASE_URL}/api/pinn/equilibrium/CARBON")
        assert response.status_code == 200
        data = response.json()
        assert data["asset"] == "CARBON"
        assert data["model"] == "PINN-SupplyDemandEquilibrium"
        assert "equilibrium_price" in data
        assert "price_signal" in data
        assert data["price_signal"] in ["OVERVALUED", "UNDERVALUED", "FAIR"]
        assert "curves" in data
        print(f"✓ CARBON equilibrium: ${data['equilibrium_price']:.2f} ({data['price_signal']})")
    
    def test_pinn_volatility_surface(self):
        """GET /api/pinn/volatility-surface/CARBON - Vol surface"""
        response = requests.get(f"{BASE_URL}/api/pinn/volatility-surface/CARBON")
        assert response.status_code == 200
        data = response.json()
        assert data["asset"] == "CARBON"
        assert data["model"] == "PINN-VolatilitySurface"
        assert "atm_vol" in data
        assert "surface" in data
        assert "strikes" in data
        assert "expiries" in data
        print(f"✓ CARBON vol surface: ATM vol {data['atm_vol']}%")
    
    def test_pinn_carbon_forecast_specialized(self):
        """GET /api/pinn/carbon-forecast - Specialized carbon forecast"""
        response = requests.get(f"{BASE_URL}/api/pinn/carbon-forecast?horizon_days=60")
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "PINN-CarbonForecaster"
        assert "regime" in data
        assert "policy_scenarios" in data
        assert len(data["policy_scenarios"]) >= 4
        assert "forecast" in data
        print(f"✓ Carbon forecast: regime={data['regime']}, target=${data['target_price']:.2f}")


class TestPredictionMarketsAuth:
    """Authenticated prediction market endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "retail_user_1@e4n.com",
            "password": "Test@123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Login failed - skipping authenticated tests")
    
    def test_get_user_positions(self):
        """GET /api/markets/positions - Get user's positions"""
        response = requests.get(f"{BASE_URL}/api/markets/positions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ User has {len(data)} positions")
    
    def test_trade_yes_contract(self):
        """POST /api/markets/trade - Buy YES contracts"""
        # Get a market first
        markets = requests.get(f"{BASE_URL}/api/markets").json()
        if not markets:
            pytest.skip("No markets available")
        
        market = markets[0]
        trade_payload = {
            "market_id": market["id"],
            "side": "yes",
            "price": market["yes_price"],
            "quantity": 5
        }
        response = requests.post(f"{BASE_URL}/api/markets/trade", json=trade_payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "trade_id" in data
        assert data["side"] == "yes"
        assert data["quantity"] == 5
        print(f"✓ Bought 5 YES contracts @ ${data['price']:.2f}, cost=${data['cost']:.2f}")
    
    def test_trade_no_contract(self):
        """POST /api/markets/trade - Buy NO contracts"""
        markets = requests.get(f"{BASE_URL}/api/markets").json()
        if not markets:
            pytest.skip("No markets available")
        
        market = markets[1] if len(markets) > 1 else markets[0]
        trade_payload = {
            "market_id": market["id"],
            "side": "no",
            "price": market["no_price"],
            "quantity": 3
        }
        response = requests.post(f"{BASE_URL}/api/markets/trade", json=trade_payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["side"] == "no"
        print(f"✓ Bought 3 NO contracts @ ${data['price']:.2f}")
    
    def test_trade_invalid_price(self):
        """POST /api/markets/trade - Reject invalid price"""
        markets = requests.get(f"{BASE_URL}/api/markets").json()
        if not markets:
            pytest.skip("No markets available")
        
        trade_payload = {
            "market_id": markets[0]["id"],
            "side": "yes",
            "price": 1.50,  # Invalid - must be 0.01-0.99
            "quantity": 1
        }
        response = requests.post(f"{BASE_URL}/api/markets/trade", json=trade_payload, headers=self.headers)
        assert response.status_code == 400
        print("✓ Invalid price correctly rejected")
    
    def test_verify_position_after_trade(self):
        """Verify position appears after trade"""
        # Make a trade first
        markets = requests.get(f"{BASE_URL}/api/markets").json()
        if not markets:
            pytest.skip("No markets available")
        
        market = markets[2] if len(markets) > 2 else markets[0]
        trade_payload = {
            "market_id": market["id"],
            "side": "yes",
            "price": market["yes_price"],
            "quantity": 2
        }
        requests.post(f"{BASE_URL}/api/markets/trade", json=trade_payload, headers=self.headers)
        
        # Verify position exists
        positions = requests.get(f"{BASE_URL}/api/markets/positions", headers=self.headers).json()
        market_positions = [p for p in positions if p["market_id"] == market["id"]]
        assert len(market_positions) > 0, "Position should exist after trade"
        print(f"✓ Position verified: {market_positions[0]['quantity']} contracts")


class TestAuthFlow:
    """Test authentication still works"""
    
    def test_login_retail_user(self):
        """POST /api/auth/login - Retail user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "retail_user_1@e4n.com",
            "password": "Test@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == "retail_user_1@e4n.com"
        assert data["role"] == "retail"
        print(f"✓ Retail user login: {data['name']}")
    
    def test_login_institutional_user(self):
        """POST /api/auth/login - Institutional user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "inst_buyer_1@e4n.com",
            "password": "Test@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "institutional"
        print(f"✓ Institutional user login: {data['name']}")
    
    def test_login_regulator(self):
        """POST /api/auth/login - Regulator login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "regulator_1@e4n.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "regulator"
        print(f"✓ Regulator login: {data['name']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - Invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@e4n.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
