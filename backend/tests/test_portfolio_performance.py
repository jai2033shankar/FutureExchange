"""
E4N Portfolio Performance Dashboard - Backend API Tests
Tests for:
- GET /api/portfolio/performance - Unified PnL with attribution
- GET /api/portfolio/value-history - 60-day portfolio value time series
- GET /api/portfolio/risk-metrics - Sharpe, Sortino, Calmar, max drawdown, volatility
- GET /api/portfolio/product-breakdown - Per-asset PnL, per-prediction PnL, monthly attribution
- GET /api/portfolio (existing) - Holdings endpoint still works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERS = {
    "retail": {"email": "retail_user_1@e4n.com", "password": "Test@123"},
    "institutional": {"email": "inst_buyer_1@e4n.com", "password": "Test@123"},
    "regulator": {"email": "regulator_1@e4n.com", "password": "Admin@123"},
}


@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_session(api_session):
    """Authenticated session for retail user"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS["retail"])
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data
    api_session.headers.update({"Authorization": f"Bearer {data['token']}"})
    return api_session


@pytest.fixture(scope="module")
def inst_session():
    """Authenticated session for institutional user"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS["institutional"])
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    return session


class TestAuthentication:
    """Auth tests for portfolio endpoints"""

    def test_login_retail_user(self, api_session):
        """Test retail user login"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS["retail"])
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USERS["retail"]["email"]
        assert data["role"] == "retail"
        assert "token" in data

    def test_login_institutional_user(self, api_session):
        """Test institutional user login"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS["institutional"])
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USERS["institutional"]["email"]
        assert data["role"] == "institutional"

    def test_login_invalid_credentials(self, api_session):
        """Test invalid credentials rejection"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@e4n.com", "password": "wrong"
        })
        assert response.status_code == 401


class TestPortfolioPerformance:
    """Tests for GET /api/portfolio/performance"""

    def test_performance_endpoint_returns_200(self, auth_session):
        """Test performance endpoint returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/performance")
        assert response.status_code == 200

    def test_performance_has_required_fields(self, auth_session):
        """Test performance response has all required fields"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/performance")
        data = response.json()
        
        # Top-level fields
        assert "current_value" in data
        assert "total_pnl" in data
        assert "total_pnl_pct" in data
        assert "total_trades" in data
        assert "total_volume" in data
        assert "attribution" in data
        assert "best_trade" in data or data.get("best_trade") is None
        assert "worst_trade" in data or data.get("worst_trade") is None

    def test_performance_attribution_structure(self, auth_session):
        """Test attribution has trading, predictions, carbon breakdown"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/performance")
        data = response.json()
        attribution = data["attribution"]
        
        # Trading attribution
        assert "trading" in attribution
        assert "pnl" in attribution["trading"]
        assert "trades" in attribution["trading"]
        assert "volume" in attribution["trading"]
        assert "win_rate" in attribution["trading"]
        
        # Predictions attribution
        assert "predictions" in attribution
        assert "pnl" in attribution["predictions"]
        assert "positions" in attribution["predictions"]
        assert "wins" in attribution["predictions"]
        assert "win_rate" in attribution["predictions"]
        
        # Carbon attribution
        assert "carbon" in attribution
        assert "pnl" in attribution["carbon"]
        assert "trades" in attribution["carbon"]
        assert "volume" in attribution["carbon"]

    def test_performance_values_are_numeric(self, auth_session):
        """Test all numeric fields are actually numbers"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/performance")
        data = response.json()
        
        assert isinstance(data["current_value"], (int, float))
        assert isinstance(data["total_pnl"], (int, float))
        assert isinstance(data["total_pnl_pct"], (int, float))
        assert isinstance(data["total_trades"], int)
        assert isinstance(data["total_volume"], (int, float))

    def test_performance_requires_auth(self, api_session):
        """Test performance endpoint requires authentication"""
        # Create new session without auth
        new_session = requests.Session()
        response = new_session.get(f"{BASE_URL}/api/portfolio/performance")
        assert response.status_code == 401


class TestValueHistory:
    """Tests for GET /api/portfolio/value-history"""

    def test_value_history_returns_200(self, auth_session):
        """Test value history endpoint returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/value-history")
        assert response.status_code == 200

    def test_value_history_returns_list(self, auth_session):
        """Test value history returns a list"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/value-history")
        data = response.json()
        assert isinstance(data, list)

    def test_value_history_has_60_days(self, auth_session):
        """Test value history returns ~60 days of data"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/value-history")
        data = response.json()
        # Should have approximately 60-61 records
        assert len(data) >= 55, f"Expected ~60 records, got {len(data)}"
        assert len(data) <= 65, f"Expected ~60 records, got {len(data)}"

    def test_value_history_record_structure(self, auth_session):
        """Test each record has required fields"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/value-history")
        data = response.json()
        
        for record in data[:5]:  # Check first 5 records
            assert "date" in record
            assert "value" in record
            assert "daily_pnl" in record
            assert "cumulative_pnl" in record
            assert isinstance(record["value"], (int, float))

    def test_value_history_dates_are_sorted(self, auth_session):
        """Test dates are in chronological order"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/value-history")
        data = response.json()
        dates = [r["date"] for r in data]
        assert dates == sorted(dates), "Dates should be in ascending order"

    def test_value_history_requires_auth(self, api_session):
        """Test value history requires authentication"""
        new_session = requests.Session()
        response = new_session.get(f"{BASE_URL}/api/portfolio/value-history")
        assert response.status_code == 401


class TestRiskMetrics:
    """Tests for GET /api/portfolio/risk-metrics"""

    def test_risk_metrics_returns_200(self, auth_session):
        """Test risk metrics endpoint returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        assert response.status_code == 200

    def test_risk_metrics_has_sharpe_ratio(self, auth_session):
        """Test risk metrics includes Sharpe ratio"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        assert "sharpe_ratio" in data
        assert isinstance(data["sharpe_ratio"], (int, float))

    def test_risk_metrics_has_sortino_ratio(self, auth_session):
        """Test risk metrics includes Sortino ratio"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        assert "sortino_ratio" in data
        assert isinstance(data["sortino_ratio"], (int, float))

    def test_risk_metrics_has_calmar_ratio(self, auth_session):
        """Test risk metrics includes Calmar ratio"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        assert "calmar_ratio" in data
        assert isinstance(data["calmar_ratio"], (int, float))

    def test_risk_metrics_has_max_drawdown(self, auth_session):
        """Test risk metrics includes max drawdown"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        assert "max_drawdown_pct" in data
        assert isinstance(data["max_drawdown_pct"], (int, float))
        assert data["max_drawdown_pct"] >= 0, "Max drawdown should be non-negative"

    def test_risk_metrics_has_volatility(self, auth_session):
        """Test risk metrics includes volatility"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        assert "annualized_volatility_pct" in data
        assert isinstance(data["annualized_volatility_pct"], (int, float))

    def test_risk_metrics_has_drawdown_chart(self, auth_session):
        """Test risk metrics includes drawdown chart data"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        assert "drawdown_chart" in data
        assert isinstance(data["drawdown_chart"], list)
        assert len(data["drawdown_chart"]) > 0
        
        # Check chart record structure
        chart_record = data["drawdown_chart"][0]
        assert "date" in chart_record
        assert "drawdown" in chart_record

    def test_risk_metrics_has_daily_returns(self, auth_session):
        """Test risk metrics includes daily returns"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        assert "daily_returns" in data
        assert isinstance(data["daily_returns"], list)
        assert len(data["daily_returns"]) > 0
        
        # Check daily return structure
        daily_return = data["daily_returns"][0]
        assert "date" in daily_return
        assert "return_pct" in daily_return

    def test_risk_metrics_has_all_fields(self, auth_session):
        """Test risk metrics has all expected fields"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        data = response.json()
        
        expected_fields = [
            "sharpe_ratio", "sortino_ratio", "calmar_ratio",
            "max_drawdown_pct", "annualized_return_pct", "annualized_volatility_pct",
            "win_rate_pct", "total_trades", "profit_factor", "avg_trade_pnl",
            "best_day_pct", "worst_day_pct", "drawdown_chart", "daily_returns"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"

    def test_risk_metrics_requires_auth(self, api_session):
        """Test risk metrics requires authentication"""
        new_session = requests.Session()
        response = new_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        assert response.status_code == 401


class TestProductBreakdown:
    """Tests for GET /api/portfolio/product-breakdown"""

    def test_product_breakdown_returns_200(self, auth_session):
        """Test product breakdown endpoint returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/product-breakdown")
        assert response.status_code == 200

    def test_product_breakdown_has_by_asset(self, auth_session):
        """Test product breakdown includes by_asset"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/product-breakdown")
        data = response.json()
        assert "by_asset" in data
        assert isinstance(data["by_asset"], list)

    def test_product_breakdown_asset_structure(self, auth_session):
        """Test by_asset records have correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/product-breakdown")
        data = response.json()
        
        if len(data["by_asset"]) > 0:
            asset = data["by_asset"][0]
            assert "symbol" in asset
            assert "trades" in asset
            assert "volume" in asset
            assert "pnl" in asset

    def test_product_breakdown_has_by_prediction(self, auth_session):
        """Test product breakdown includes by_prediction"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/product-breakdown")
        data = response.json()
        assert "by_prediction" in data
        assert isinstance(data["by_prediction"], list)

    def test_product_breakdown_has_monthly_attribution(self, auth_session):
        """Test product breakdown includes monthly_attribution"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/product-breakdown")
        data = response.json()
        assert "monthly_attribution" in data
        assert isinstance(data["monthly_attribution"], list)
        assert len(data["monthly_attribution"]) == 6, "Should have 6 months of data"

    def test_product_breakdown_monthly_structure(self, auth_session):
        """Test monthly attribution has correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/product-breakdown")
        data = response.json()
        
        for month in data["monthly_attribution"]:
            assert "month" in month
            assert "trading_pnl" in month
            assert "prediction_pnl" in month
            assert "carbon_pnl" in month

    def test_product_breakdown_requires_auth(self, api_session):
        """Test product breakdown requires authentication"""
        new_session = requests.Session()
        response = new_session.get(f"{BASE_URL}/api/portfolio/product-breakdown")
        assert response.status_code == 401


class TestExistingPortfolioEndpoint:
    """Tests for existing GET /api/portfolio endpoint"""

    def test_portfolio_still_works(self, auth_session):
        """Test existing portfolio endpoint still returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio")
        assert response.status_code == 200

    def test_portfolio_has_holdings(self, auth_session):
        """Test portfolio has holdings array"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio")
        data = response.json()
        assert "holdings" in data
        assert isinstance(data["holdings"], list)

    def test_portfolio_has_total_value(self, auth_session):
        """Test portfolio has total_value"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio")
        data = response.json()
        assert "total_value" in data
        assert isinstance(data["total_value"], (int, float))

    def test_portfolio_holdings_structure(self, auth_session):
        """Test holdings have correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio")
        data = response.json()
        
        if len(data["holdings"]) > 0:
            holding = data["holdings"][0]
            assert "symbol" in holding
            assert "quantity" in holding
            assert "price" in holding
            assert "value" in holding
            assert "category" in holding


class TestInstitutionalUser:
    """Tests with institutional user to verify different portfolio data"""

    def test_inst_performance(self, inst_session):
        """Test institutional user can access performance"""
        response = inst_session.get(f"{BASE_URL}/api/portfolio/performance")
        assert response.status_code == 200
        data = response.json()
        assert "current_value" in data
        # Institutional user should have higher portfolio value
        assert data["current_value"] > 0

    def test_inst_risk_metrics(self, inst_session):
        """Test institutional user can access risk metrics"""
        response = inst_session.get(f"{BASE_URL}/api/portfolio/risk-metrics")
        assert response.status_code == 200
        data = response.json()
        assert "sharpe_ratio" in data

    def test_inst_value_history(self, inst_session):
        """Test institutional user can access value history"""
        response = inst_session.get(f"{BASE_URL}/api/portfolio/value-history")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 55


class TestEdgeCases:
    """Edge case tests"""

    def test_value_history_custom_days(self, auth_session):
        """Test value history with custom days parameter"""
        response = auth_session.get(f"{BASE_URL}/api/portfolio/value-history?days=30")
        assert response.status_code == 200
        data = response.json()
        # Should still return data (may be capped or use default)
        assert isinstance(data, list)

    def test_concurrent_requests(self, auth_session):
        """Test multiple concurrent requests don't fail"""
        import concurrent.futures
        
        def make_request(endpoint):
            return auth_session.get(f"{BASE_URL}/api/portfolio/{endpoint}")
        
        endpoints = ["performance", "value-history", "risk-metrics", "product-breakdown"]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(make_request, ep) for ep in endpoints]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        for result in results:
            assert result.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
