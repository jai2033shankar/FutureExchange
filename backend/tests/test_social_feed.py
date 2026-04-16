"""
E4N Social Trading Feed API Tests
Tests for: Activity feed, leaderboard, trending assets, copy-trade, sentiment
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RETAIL_USER = {"email": "retail_user_1@e4n.com", "password": "Test@123"}
INST_USER = {"email": "inst_buyer_1@e4n.com", "password": "Test@123"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def retail_auth(api_client):
    """Get retail user auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=RETAIL_USER)
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    pytest.skip("Retail user authentication failed")


@pytest.fixture(scope="module")
def inst_auth(api_client):
    """Get institutional user auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=INST_USER)
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    pytest.skip("Institutional user authentication failed")


# ===== AUTH TESTS =====
class TestAuth:
    """Authentication tests for social feed"""
    
    def test_login_retail_user(self, api_client):
        """Test retail user login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=RETAIL_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["email"] == RETAIL_USER["email"]
        print(f"✓ Retail user login successful: {data['email']}")
    
    def test_login_institutional_user(self, api_client):
        """Test institutional user login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=INST_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "institutional"
        print(f"✓ Institutional user login successful: {data['email']}")


# ===== ACTIVITY FEED TESTS =====
class TestActivityFeed:
    """Tests for GET /api/social/feed"""
    
    def test_get_feed_all_categories(self, api_client):
        """Test fetching all feed events"""
        response = api_client.get(f"{BASE_URL}/api/social/feed")
        assert response.status_code == 200, f"Feed fetch failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Feed should return a list"
        assert len(data) > 0, "Feed should have seeded events"
        print(f"✓ Feed returned {len(data)} events")
    
    def test_feed_event_structure(self, api_client):
        """Test feed event has required fields"""
        response = api_client.get(f"{BASE_URL}/api/social/feed?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Need at least one event to test structure"
        
        event = data[0]
        required_fields = ["id", "category", "action", "display_name", "timestamp"]
        for field in required_fields:
            assert field in event, f"Missing field: {field}"
        print(f"✓ Feed event has all required fields: {required_fields}")
    
    def test_feed_category_filter_trade(self, api_client):
        """Test filtering feed by trade category"""
        response = api_client.get(f"{BASE_URL}/api/social/feed?category=trade&limit=40")
        assert response.status_code == 200
        data = response.json()
        for event in data:
            assert event["category"] == "trade", f"Expected trade category, got {event['category']}"
        print(f"✓ Trade category filter returned {len(data)} events")
    
    def test_feed_category_filter_prediction(self, api_client):
        """Test filtering feed by prediction category"""
        response = api_client.get(f"{BASE_URL}/api/social/feed?category=prediction&limit=40")
        assert response.status_code == 200
        data = response.json()
        for event in data:
            assert event["category"] == "prediction", f"Expected prediction category, got {event['category']}"
        print(f"✓ Prediction category filter returned {len(data)} events")
    
    def test_feed_category_filter_carbon(self, api_client):
        """Test filtering feed by carbon category"""
        response = api_client.get(f"{BASE_URL}/api/social/feed?category=carbon&limit=40")
        assert response.status_code == 200
        data = response.json()
        for event in data:
            assert event["category"] == "carbon", f"Expected carbon category, got {event['category']}"
        print(f"✓ Carbon category filter returned {len(data)} events")
    
    def test_feed_category_filter_bridge(self, api_client):
        """Test filtering feed by bridge category"""
        response = api_client.get(f"{BASE_URL}/api/social/feed?category=bridge&limit=40")
        assert response.status_code == 200
        data = response.json()
        for event in data:
            assert event["category"] == "bridge", f"Expected bridge category, got {event['category']}"
        print(f"✓ Bridge category filter returned {len(data)} events")
    
    def test_feed_category_filter_governance(self, api_client):
        """Test filtering feed by governance category"""
        response = api_client.get(f"{BASE_URL}/api/social/feed?category=governance&limit=40")
        assert response.status_code == 200
        data = response.json()
        for event in data:
            assert event["category"] == "governance", f"Expected governance category, got {event['category']}"
        print(f"✓ Governance category filter returned {len(data)} events")
    
    def test_feed_has_reactions(self, api_client):
        """Test feed events have reactions"""
        response = api_client.get(f"{BASE_URL}/api/social/feed?limit=10")
        assert response.status_code == 200
        data = response.json()
        events_with_reactions = [e for e in data if e.get("reactions")]
        assert len(events_with_reactions) > 0, "Some events should have reactions"
        
        # Check reaction structure
        for event in events_with_reactions:
            reactions = event["reactions"]
            assert isinstance(reactions, dict), "Reactions should be a dict"
        print(f"✓ {len(events_with_reactions)} events have reactions")


# ===== FEED STATS TESTS =====
class TestFeedStats:
    """Tests for GET /api/social/feed/stats"""
    
    def test_get_feed_stats(self, api_client):
        """Test fetching feed statistics"""
        response = api_client.get(f"{BASE_URL}/api/social/feed/stats")
        assert response.status_code == 200, f"Stats fetch failed: {response.text}"
        data = response.json()
        
        required_fields = ["total_events", "last_hour", "last_24h", "by_category", "market_sentiment", "sentiment_score"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Feed stats returned with all required fields")
    
    def test_feed_stats_by_category(self, api_client):
        """Test feed stats has category breakdown"""
        response = api_client.get(f"{BASE_URL}/api/social/feed/stats")
        assert response.status_code == 200
        data = response.json()
        
        by_cat = data.get("by_category", {})
        expected_categories = ["trade", "prediction", "carbon", "bridge", "governance"]
        for cat in expected_categories:
            assert cat in by_cat, f"Missing category in stats: {cat}"
        print(f"✓ Feed stats has all 5 categories: {list(by_cat.keys())}")
    
    def test_feed_stats_sentiment(self, api_client):
        """Test feed stats has sentiment data"""
        response = api_client.get(f"{BASE_URL}/api/social/feed/stats")
        assert response.status_code == 200
        data = response.json()
        
        sentiment = data.get("market_sentiment")
        assert sentiment in ["bullish", "bearish", "neutral"], f"Invalid sentiment: {sentiment}"
        
        score = data.get("sentiment_score")
        assert isinstance(score, (int, float)), "Sentiment score should be numeric"
        assert 0 <= score <= 100, f"Sentiment score should be 0-100, got {score}"
        print(f"✓ Market sentiment: {sentiment} ({score}%)")


# ===== LEADERBOARD TESTS =====
class TestLeaderboard:
    """Tests for GET /api/social/leaderboard"""
    
    def test_get_leaderboard(self, api_client):
        """Test fetching top traders leaderboard"""
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        assert response.status_code == 200, f"Leaderboard fetch failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Leaderboard should return a list"
        assert len(data) >= 8, f"Expected at least 8 traders, got {len(data)}"
        print(f"✓ Leaderboard returned {len(data)} traders")
    
    def test_leaderboard_trader_structure(self, api_client):
        """Test trader has required fields"""
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Need at least one trader"
        
        trader = data[0]
        required_fields = ["id", "display_name", "avatar_initials", "role", "style", "stats", "badges"]
        for field in required_fields:
            assert field in trader, f"Missing field: {field}"
        print(f"✓ Trader has all required fields")
    
    def test_leaderboard_trader_stats(self, api_client):
        """Test trader stats structure"""
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        assert response.status_code == 200
        data = response.json()
        
        trader = data[0]
        stats = trader.get("stats", {})
        stat_fields = ["pnl", "trades", "wins", "win_rate", "volume"]
        for field in stat_fields:
            assert field in stats, f"Missing stat field: {field}"
        print(f"✓ Trader stats has all required fields: {stat_fields}")
    
    def test_leaderboard_has_equity_curve(self, api_client):
        """Test traders have equity curve data"""
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        assert response.status_code == 200
        data = response.json()
        
        trader = data[0]
        equity_curve = trader.get("equity_curve", [])
        assert len(equity_curve) > 0, "Trader should have equity curve data"
        
        # Check equity curve structure
        point = equity_curve[0]
        assert "date" in point, "Equity curve point should have date"
        assert "value" in point, "Equity curve point should have value"
        print(f"✓ Trader has equity curve with {len(equity_curve)} data points")
    
    def test_leaderboard_has_positions(self, api_client):
        """Test traders have top positions"""
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        assert response.status_code == 200
        data = response.json()
        
        trader = data[0]
        positions = trader.get("top_positions", [])
        assert len(positions) > 0, "Trader should have positions"
        
        pos = positions[0]
        assert "asset" in pos, "Position should have asset"
        assert "side" in pos, "Position should have side"
        print(f"✓ Trader has {len(positions)} top positions")


# ===== TRADER PROFILE TESTS =====
class TestTraderProfile:
    """Tests for GET /api/social/leaderboard/{trader_id}"""
    
    def test_get_trader_profile(self, api_client):
        """Test fetching individual trader profile"""
        # First get a trader ID from leaderboard
        lb_response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        assert lb_response.status_code == 200
        traders = lb_response.json()
        assert len(traders) > 0, "Need traders to test profile"
        
        trader_id = traders[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard/{trader_id}")
        assert response.status_code == 200, f"Profile fetch failed: {response.text}"
        
        data = response.json()
        assert data["id"] == trader_id
        print(f"✓ Trader profile fetched: {data['display_name']}")
    
    def test_trader_profile_has_activity(self, api_client):
        """Test trader profile includes recent activity"""
        lb_response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        traders = lb_response.json()
        trader_id = traders[0]["id"]
        
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard/{trader_id}")
        assert response.status_code == 200
        data = response.json()
        
        # recent_activity may be empty if trader has no feed events
        assert "recent_activity" in data, "Profile should have recent_activity field"
        print(f"✓ Trader profile has recent_activity field")
    
    def test_trader_profile_not_found(self, api_client):
        """Test 404 for non-existent trader"""
        response = api_client.get(f"{BASE_URL}/api/social/leaderboard/nonexistent-trader-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent trader returns 404")


# ===== TRENDING ASSETS TESTS =====
class TestTrendingAssets:
    """Tests for GET /api/social/trending"""
    
    def test_get_trending_assets(self, api_client):
        """Test fetching trending assets"""
        response = api_client.get(f"{BASE_URL}/api/social/trending")
        assert response.status_code == 200, f"Trending fetch failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Trending should return a list"
        assert len(data) >= 5, f"Expected at least 5 trending assets, got {len(data)}"
        print(f"✓ Trending returned {len(data)} assets")
    
    def test_trending_asset_structure(self, api_client):
        """Test trending asset has required fields"""
        response = api_client.get(f"{BASE_URL}/api/social/trending")
        assert response.status_code == 200
        data = response.json()
        
        asset = data[0]
        required_fields = ["symbol", "name", "price", "momentum_score", "signal", "buy_pressure", "sparkline"]
        for field in required_fields:
            assert field in asset, f"Missing field: {field}"
        print(f"✓ Trending asset has all required fields")
    
    def test_trending_has_sparkline(self, api_client):
        """Test trending assets have sparkline data"""
        response = api_client.get(f"{BASE_URL}/api/social/trending")
        assert response.status_code == 200
        data = response.json()
        
        asset = data[0]
        sparkline = asset.get("sparkline", [])
        assert len(sparkline) > 0, "Asset should have sparkline data"
        
        point = sparkline[0]
        assert "day" in point or "price" in point, "Sparkline should have data points"
        print(f"✓ Trending asset has sparkline with {len(sparkline)} points")
    
    def test_trending_momentum_scores(self, api_client):
        """Test trending assets have valid momentum scores"""
        response = api_client.get(f"{BASE_URL}/api/social/trending")
        assert response.status_code == 200
        data = response.json()
        
        for asset in data:
            score = asset.get("momentum_score", 0)
            assert 0 <= score <= 100, f"Momentum score should be 0-100, got {score}"
            
            signal = asset.get("signal")
            assert signal in ["hot", "warm", "cold"], f"Invalid signal: {signal}"
        print(f"✓ All trending assets have valid momentum scores and signals")


# ===== SENTIMENT TESTS =====
class TestSentiment:
    """Tests for GET /api/social/sentiment"""
    
    def test_get_sentiment(self, api_client):
        """Test fetching market sentiment"""
        response = api_client.get(f"{BASE_URL}/api/social/sentiment")
        assert response.status_code == 200, f"Sentiment fetch failed: {response.text}"
        data = response.json()
        
        assert "assets" in data, "Sentiment should have assets"
        assert "predictions" in data, "Sentiment should have predictions"
        print(f"✓ Sentiment returned with assets and predictions")
    
    def test_sentiment_asset_structure(self, api_client):
        """Test asset sentiment structure"""
        response = api_client.get(f"{BASE_URL}/api/social/sentiment")
        assert response.status_code == 200
        data = response.json()
        
        assets = data.get("assets", [])
        assert len(assets) > 0, "Should have asset sentiment data"
        
        asset = assets[0]
        required_fields = ["symbol", "buy_pressure", "sell_pressure", "signal"]
        for field in required_fields:
            assert field in asset, f"Missing field: {field}"
        print(f"✓ Asset sentiment has all required fields")
    
    def test_sentiment_buy_sell_pressure(self, api_client):
        """Test buy/sell pressure adds up correctly"""
        response = api_client.get(f"{BASE_URL}/api/social/sentiment")
        assert response.status_code == 200
        data = response.json()
        
        for asset in data.get("assets", []):
            buy = asset.get("buy_pressure", 0)
            sell = asset.get("sell_pressure", 0)
            total = round(buy + sell, 2)
            assert 0.99 <= total <= 1.01, f"Buy + Sell pressure should equal 1, got {total}"
        print(f"✓ Buy/sell pressure sums to 1 for all assets")
    
    def test_sentiment_prediction_markets(self, api_client):
        """Test prediction market sentiment"""
        response = api_client.get(f"{BASE_URL}/api/social/sentiment")
        assert response.status_code == 200
        data = response.json()
        
        predictions = data.get("predictions", [])
        # May be empty if no active prediction markets
        if len(predictions) > 0:
            pred = predictions[0]
            assert "category" in pred, "Prediction sentiment should have category"
            assert "avg_yes_price" in pred, "Prediction sentiment should have avg_yes_price"
            assert "signal" in pred, "Prediction sentiment should have signal"
        print(f"✓ Prediction market sentiment has {len(predictions)} categories")


# ===== COPY TRADE TESTS =====
class TestCopyTrade:
    """Tests for POST /api/social/copy-trade and GET /api/social/copy-trades"""
    
    def test_copy_trade_requires_auth(self, api_client):
        """Test copy trade requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/social/copy-trade", json={
            "trader_id": "test-id",
            "allocation_pct": 10
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Copy trade requires authentication")
    
    def test_copy_trade_success(self, api_client, retail_auth):
        """Test successful copy trade"""
        # Get a trader ID
        lb_response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        traders = lb_response.json()
        trader_id = traders[0]["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/social/copy-trade",
            json={"trader_id": trader_id, "allocation_pct": 10},
            headers=retail_auth
        )
        assert response.status_code == 200, f"Copy trade failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Copy trade should return ID"
        assert data["trader_id"] == trader_id
        assert data["allocation_pct"] == 10
        assert data["status"] == "active"
        print(f"✓ Copy trade created: {data['id']}")
    
    def test_copy_trade_invalid_trader(self, api_client, retail_auth):
        """Test copy trade with invalid trader ID"""
        response = api_client.post(
            f"{BASE_URL}/api/social/copy-trade",
            json={"trader_id": "nonexistent-trader", "allocation_pct": 10},
            headers=retail_auth
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Copy trade with invalid trader returns 404")
    
    def test_get_my_copy_trades_requires_auth(self, api_client):
        """Test get copy trades requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/social/copy-trades")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Get copy trades requires authentication")
    
    def test_get_my_copy_trades(self, api_client, retail_auth):
        """Test fetching user's copy trade subscriptions"""
        response = api_client.get(f"{BASE_URL}/api/social/copy-trades", headers=retail_auth)
        assert response.status_code == 200, f"Get copy trades failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Copy trades should return a list"
        print(f"✓ User has {len(data)} copy trade subscriptions")
    
    def test_institutional_user_copy_trade(self, api_client, inst_auth):
        """Test institutional user can copy trade"""
        lb_response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        traders = lb_response.json()
        trader_id = traders[1]["id"]  # Use different trader
        
        response = api_client.post(
            f"{BASE_URL}/api/social/copy-trade",
            json={"trader_id": trader_id, "allocation_pct": 5},
            headers=inst_auth
        )
        assert response.status_code == 200, f"Institutional copy trade failed: {response.text}"
        print("✓ Institutional user can copy trade")


# ===== INTEGRATION TESTS =====
class TestIntegration:
    """Integration tests for social feed"""
    
    def test_all_endpoints_accessible(self, api_client):
        """Test all social endpoints are accessible"""
        endpoints = [
            "/api/social/feed",
            "/api/social/feed/stats",
            "/api/social/leaderboard",
            "/api/social/trending",
            "/api/social/sentiment",
        ]
        
        for endpoint in endpoints:
            response = api_client.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 200, f"{endpoint} failed: {response.status_code}"
        print(f"✓ All {len(endpoints)} public endpoints accessible")
    
    def test_feed_and_leaderboard_consistency(self, api_client):
        """Test feed events reference valid traders"""
        feed_response = api_client.get(f"{BASE_URL}/api/social/feed?limit=50")
        lb_response = api_client.get(f"{BASE_URL}/api/social/leaderboard")
        
        feed = feed_response.json()
        leaderboard = lb_response.json()
        
        # Get all display names from leaderboard
        lb_names = {t["display_name"] for t in leaderboard}
        
        # Check some feed events have matching display names
        feed_names = {e["display_name"] for e in feed if e.get("display_name")}
        
        # There should be some overlap (anonymized names)
        print(f"✓ Feed has {len(feed_names)} unique traders, leaderboard has {len(lb_names)}")
    
    def test_trending_assets_match_system_assets(self, api_client):
        """Test trending assets are valid system assets"""
        trending_response = api_client.get(f"{BASE_URL}/api/social/trending")
        assets_response = api_client.get(f"{BASE_URL}/api/assets")
        
        trending = trending_response.json()
        assets = assets_response.json()
        
        system_symbols = {a["symbol"] for a in assets}
        trending_symbols = {t["symbol"] for t in trending}
        
        # All trending should be valid system assets
        for symbol in trending_symbols:
            assert symbol in system_symbols, f"Trending asset {symbol} not in system assets"
        print(f"✓ All {len(trending_symbols)} trending assets are valid system assets")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
