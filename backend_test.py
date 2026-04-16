#!/usr/bin/env python3
"""
E4N Backend API Testing Suite
Tests all endpoints for the Exchange for Necessities platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class E4NAPITester:
    def __init__(self, base_url="https://necessity-trade.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different users
        self.users = {
            "retail": {"email": "retail_user_1@e4n.com", "password": "Test@123"},
            "institutional": {"email": "inst_buyer_1@e4n.com", "password": "Test@123"},
            "farmer": {"email": "farmer_1@e4n.com", "password": "Test@123"},
            "regulator": {"email": "regulator_1@e4n.com", "password": "Admin@123"}
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.results = {}

    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
        else:
            print(f"❌ {test_name}: FAILED - {details}")
            self.failed_tests.append({"test": test_name, "error": details, "response": response_data})
        
        self.results[test_name] = {
            "success": success,
            "details": details,
            "response_data": response_data
        }

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    user_type: Optional[str] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request with optional authentication"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add auth header if user_type specified
        if user_type and user_type in self.tokens:
            headers['Authorization'] = f'Bearer {self.tokens[user_type]}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, f"Unsupported method: {method}", None
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            if not success:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                if response_data:
                    error_msg += f" - {response_data}"
                return False, error_msg, response_data
            
            return True, "Success", response_data
            
        except Exception as e:
            return False, f"Request failed: {str(e)}", None

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test login for each user type
        for user_type, credentials in self.users.items():
            success, error, response = self.make_request(
                'POST', '/auth/login', credentials, expected_status=200
            )
            
            if success and response and 'token' in response:
                self.tokens[user_type] = response['token']
                self.log_result(f"Login {user_type}", True, f"Role: {response.get('role', 'unknown')}")
            else:
                self.log_result(f"Login {user_type}", False, error, response)
        
        # Test /auth/me for retail user
        if 'retail' in self.tokens:
            success, error, response = self.make_request(
                'GET', '/auth/me', user_type='retail'
            )
            self.log_result("Get current user", success, error, response)
        
        # Test logout
        success, error, response = self.make_request(
            'POST', '/auth/logout', user_type='retail'
        )
        self.log_result("Logout", success, error)

    def test_assets_endpoints(self):
        """Test assets endpoints"""
        print("\n💰 Testing Assets Endpoints...")
        
        # Test get all assets
        success, error, response = self.make_request('GET', '/assets')
        if success and response:
            asset_count = len(response) if isinstance(response, list) else 0
            self.log_result("Get all assets", success, f"Found {asset_count} assets", response)
            
            # Test individual asset if assets exist
            if asset_count > 0 and isinstance(response, list):
                first_asset = response[0]
                symbol = first_asset.get('symbol', 'RICE')
                
                success2, error2, response2 = self.make_request('GET', f'/assets/{symbol}')
                self.log_result(f"Get asset {symbol}", success2, error2, response2)
                
                # Test price history
                success3, error3, response3 = self.make_request('GET', f'/assets/{symbol}/price-history')
                self.log_result(f"Get price history {symbol}", success3, error3)
        else:
            self.log_result("Get all assets", success, error, response)

    def test_wallet_endpoints(self):
        """Test wallet endpoints"""
        print("\n👛 Testing Wallet Endpoints...")
        
        if 'retail' in self.tokens:
            success, error, response = self.make_request(
                'GET', '/wallet', user_type='retail'
            )
            self.log_result("Get wallet", success, error, response)

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n📊 Testing Dashboard Endpoints...")
        
        if 'retail' in self.tokens:
            # Test dashboard stats
            success, error, response = self.make_request(
                'GET', '/dashboard/stats', user_type='retail'
            )
            self.log_result("Get dashboard stats", success, error, response)
            
            # Test market data
            success2, error2, response2 = self.make_request(
                'GET', '/dashboard/market-data'
            )
            self.log_result("Get market data", success2, error2, response2)

    def test_carbon_credits_endpoints(self):
        """Test carbon credits endpoints"""
        print("\n🌱 Testing Carbon Credits Endpoints...")
        
        # Test get carbon credits
        success, error, response = self.make_request('GET', '/carbon-credits')
        self.log_result("Get carbon credits", success, error, response)
        
        # Test carbon stats
        success2, error2, response2 = self.make_request('GET', '/carbon-credits/stats')
        self.log_result("Get carbon stats", success2, error2, response2)
        
        # Test create carbon credit (requires auth)
        if 'institutional' in self.tokens:
            credit_data = {
                "project_name": "Test Solar Project",
                "project_type": "renewable_energy",
                "quantity_tonnes": 1000,
                "vintage_year": 2025,
                "region": "US",
                "methodology": "CDM",
                "description": "Test carbon credit project"
            }
            success3, error3, response3 = self.make_request(
                'POST', '/carbon-credits', credit_data, user_type='institutional'
            )
            self.log_result("Create carbon credit", success3, error3, response3)

    def test_compliance_endpoints(self):
        """Test compliance endpoints"""
        print("\n⚖️ Testing Compliance Endpoints...")
        
        # Test compliance rules
        success, error, response = self.make_request('GET', '/compliance/rules')
        self.log_result("Get compliance rules", success, error, response)
        
        # Test compliance regions
        success2, error2, response2 = self.make_request('GET', '/compliance/regions')
        self.log_result("Get compliance regions", success2, error2, response2)
        
        # Test compliance status (requires auth)
        if 'retail' in self.tokens:
            success3, error3, response3 = self.make_request(
                'GET', '/compliance/status', user_type='retail'
            )
            self.log_result("Get compliance status", success3, error3, response3)

    def test_predictions_endpoints(self):
        """Test prediction markets endpoints"""
        print("\n🔮 Testing Predictions Endpoints...")
        
        # Test get predictions
        success, error, response = self.make_request('GET', '/predictions')
        self.log_result("Get predictions", success, error, response)

    def test_portfolio_endpoints(self):
        """Test portfolio endpoints"""
        print("\n📈 Testing Portfolio Endpoints...")
        
        if 'retail' in self.tokens:
            success, error, response = self.make_request(
                'GET', '/portfolio', user_type='retail'
            )
            self.log_result("Get portfolio", success, error, response)

    def test_risk_endpoints(self):
        """Test risk endpoints"""
        print("\n⚠️ Testing Risk Endpoints...")
        
        if 'retail' in self.tokens:
            # Test risk score
            success, error, response = self.make_request(
                'GET', '/risk/score', user_type='retail'
            )
            self.log_result("Get risk score", success, error, response)
        
        # Test market risk
        success2, error2, response2 = self.make_request('GET', '/risk/market')
        self.log_result("Get market risk", success2, error2, response2)

    def test_admin_endpoints(self):
        """Test admin endpoints (regulator only)"""
        print("\n👨‍💼 Testing Admin Endpoints...")
        
        if 'regulator' in self.tokens:
            # Test admin users
            success, error, response = self.make_request(
                'GET', '/admin/users', user_type='regulator'
            )
            self.log_result("Admin get users", success, error, response)
            
            # Test admin trades
            success2, error2, response2 = self.make_request(
                'GET', '/admin/trades', user_type='regulator'
            )
            self.log_result("Admin get trades", success2, error2, response2)
            
            # Test admin reports
            success3, error3, response3 = self.make_request(
                'GET', '/admin/reports', user_type='regulator'
            )
            self.log_result("Admin get reports", success3, error3, response3)

    def test_phase2_features(self):
        """Test Phase 2 features: Advanced orders, notifications, carbon calculator"""
        print("\n🚀 Testing Phase 2 Features...")
        
        if 'retail' in self.tokens:
            # Test notifications
            success, error, response = self.make_request(
                'GET', '/notifications', user_type='retail'
            )
            self.log_result("Get notifications", success, error, response)
            
            # Test carbon calculator
            calc_data = {
                "electricity_kwh": 1000,
                "natural_gas_therms": 50,
                "vehicle_miles": 12000,
                "flights_hours": 10,
                "waste_tonnes": 2,
                "employees": 5,
                "region": "US"
            }
            success2, error2, response2 = self.make_request(
                'POST', '/carbon-calculator/calculate', calc_data
            )
            self.log_result("Carbon calculator", success2, error2, response2)
            
            # Test stop-loss order
            stop_loss_data = {
                "asset_symbol": "RICE",
                "quantity": 10,
                "trigger_price": 0.80,
                "settlement_token": "USD"
            }
            success3, error3, response3 = self.make_request(
                'POST', '/orders/stop-loss', stop_loss_data, user_type='retail'
            )
            self.log_result("Create stop-loss order", success3, error3, response3)
            
            # Test KYC status
            success4, error4, response4 = self.make_request(
                'GET', '/kyc/status', user_type='retail'
            )
            self.log_result("Get KYC status", success4, error4, response4)
            
            # Test CSV export
            success5, error5, response5 = self.make_request(
                'GET', '/reports/trades/csv', user_type='retail'
            )
            self.log_result("Export trades CSV", success5, error5, response5)

    def test_phase3_contracts(self):
        """Test Phase 3 features: Market Guards, RFQ, Pre-Harvest, Disputes, ESG, CBDC"""
        print("\n🛡️ Testing Phase 3 Contract Features...")
        
        # Test public platform stats (no auth needed)
        success, error, response = self.make_request('GET', '/platform/stats')
        self.log_result("Get platform stats (public)", success, error, response)
        
        if 'retail' in self.tokens:
            # Test concentration guard
            success2, error2, response2 = self.make_request(
                'GET', '/guards/concentration/RICE', user_type='retail'
            )
            self.log_result("Get concentration status RICE", success2, error2, response2)
            
            # Test whale alerts
            success3, error3, response3 = self.make_request(
                'GET', '/guards/whale-alerts', user_type='retail'
            )
            self.log_result("Get whale alerts", success3, error3, response3)
            
            # Test pre-harvest loans
            success4, error4, response4 = self.make_request(
                'GET', '/credit/pre-harvest/all'
            )
            self.log_result("Get all pre-harvest loans", success4, error4, response4)
            
            # Test disputes
            success5, error5, response5 = self.make_request(
                'GET', '/disputes', user_type='retail'
            )
            self.log_result("Get disputes", success5, error5, response5)
            
            # Test RFQ orders
            success6, error6, response6 = self.make_request(
                'GET', '/rfq/orders', user_type='retail'
            )
            self.log_result("Get RFQ orders", success6, error6, response6)
            
            # Test ESG trade footprint calculation
            esg_data = {
                "trade_id": "test_trade_001",
                "distance_km": 500,
                "transport_mode": "road",
                "weight_tonnes": 10
            }
            success7, error7, response7 = self.make_request(
                'POST', '/esg/trade-footprint', esg_data, user_type='retail'
            )
            self.log_result("Calculate ESG trade footprint", success7, error7, response7)
            
            # Test quality report submission
            quality_data = {
                "trade_id": "test_trade_001",
                "moisture_pct": 12.5,
                "purity_pct": 95.0,
                "grade": "A",
                "spectral_hash": "HSM_VERIFIED_abc123def456"
            }
            success8, error8, response8 = self.make_request(
                'POST', '/quality/report', quality_data, user_type='retail'
            )
            self.log_result("Submit quality report", success8, error8, response8)
            
            # Test CBDC settlement
            cbdc_data = {
                "trade_id": "test_trade_001",
                "amount": 1000.0,
                "currency": "USD",
                "sovereign_signature": "0x1234567890abcdef1234567890abcdef12345678"
            }
            success9, error9, response9 = self.make_request(
                'POST', '/cbdc/settle', cbdc_data, user_type='retail'
            )
            self.log_result("CBDC settlement", success9, error9, response9)

    def test_phase4_blockchain(self):
        """Test Phase 4 features: Blockchain, smart contracts, governance, warehouses"""
        print("\n⛓️ Testing Phase 4 Blockchain Features...")
        
        # Test blockchain stats
        success, error, response = self.make_request('GET', '/blockchain/stats')
        self.log_result("Get blockchain stats", success, error, response)
        
        # Test blockchain blocks
        success2, error2, response2 = self.make_request('GET', '/blockchain/blocks')
        self.log_result("Get blockchain blocks", success2, error2, response2)
        
        # Test blockchain transactions
        success3, error3, response3 = self.make_request('GET', '/blockchain/transactions')
        self.log_result("Get blockchain transactions", success3, error3, response3)
        
        if 'retail' in self.tokens:
            # Test smart contracts
            success4, error4, response4 = self.make_request(
                'GET', '/blockchain/contracts', user_type='retail'
            )
            self.log_result("Get smart contracts", success4, error4, response4)
            
            # Test contract templates
            success5, error5, response5 = self.make_request('GET', '/blockchain/contracts/templates')
            self.log_result("Get contract templates", success5, error5, response5)
            
            # Test governance proposals
            success6, error6, response6 = self.make_request('GET', '/governance/proposals')
            self.log_result("Get governance proposals", success6, error6, response6)
            
            # Test warehouses
            success7, error7, response7 = self.make_request('GET', '/warehouses')
            self.log_result("Get warehouses", success7, error7, response7)

    def test_phase5_demo_features(self):
        """Test Phase 5 features: E2E Demo Script and WebSocket prices"""
        print("\n🎯 Testing Phase 5 Demo Features...")
        
        # Test E2E demo script - this should execute 16 scenarios (including new hardening scenarios)
        success, error, response = self.make_request('POST', '/demo/run-all')
        if success and response:
            total_scenarios = response.get('total_scenarios', 0)
            passed = response.get('passed', 0)
            success_rate = response.get('success_rate', '0%')
            self.log_result("E2E Demo Script (16 scenarios)", success, f"Executed {total_scenarios} scenarios, {passed} passed ({success_rate})", response)
        else:
            self.log_result("E2E Demo Script (16 scenarios)", success, error, response)

    def test_phase6_hardening_features(self):
        """Test Phase 6 Institutional Hardening features"""
        print("\n🛡️ Testing Phase 6 Institutional Hardening Features...")
        
        if 'retail' in self.tokens:
            # Test hardening dashboard
            success, error, response = self.make_request(
                'GET', '/hardening/dashboard', user_type='retail'
            )
            self.log_result("Get hardening dashboard", success, error, response)
            
            # Test volatility breakers
            success2, error2, response2 = self.make_request(
                'GET', '/guards/volatility-breakers'
            )
            self.log_result("Get volatility breakers", success2, error2, response2)
            
            # Test ZK identity profile
            success3, error3, response3 = self.make_request(
                'GET', '/identity/profile', user_type='retail'
            )
            self.log_result("Get ZK identity profile", success3, error3, response3)
            
            # Test oracle price feed for CARBON
            success4, error4, response4 = self.make_request(
                'GET', '/oracle/price-feed/CARBON'
            )
            self.log_result("Get oracle price feed CARBON", success4, error4, response4)
            
            # Test insurance treasury
            success5, error5, response5 = self.make_request(
                'GET', '/insurance/treasury'
            )
            self.log_result("Get insurance treasury", success5, error5, response5)
            
            # Test SAR monitor
            success6, error6, response6 = self.make_request(
                'GET', '/compliance/sar-monitor', user_type='retail'
            )
            self.log_result("Get SAR monitor", success6, error6, response6)
            
            # Test scan for wash trading
            success7, error7, response7 = self.make_request(
                'POST', '/compliance/scan-wash-trading', user_type='retail'
            )
            self.log_result("Scan wash trading", success7, error7, response7)
            
            # Test custody handovers
            success8, error8, response8 = self.make_request(
                'GET', '/logistics/custody-handovers', user_type='retail'
            )
            self.log_result("Get custody handovers", success8, error8, response8)
            
            # Test debt market
            success9, error9, response9 = self.make_request(
                'GET', '/credit/debt-market'
            )
            self.log_result("Get debt market", success9, error9, response9)
            
            # Test sybil-resistant concentration check
            success10, error10, response10 = self.make_request(
                'GET', '/guards/sybil-check/RICE', user_type='retail'
            )
            self.log_result("Sybil-resistant concentration check RICE", success10, error10, response10)
            
            # Test link wallet to ZK identity
            wallet_data = {
                "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
                "zk_proof": "zk_proof_test_12345678"
            }
            success11, error11, response11 = self.make_request(
                'POST', '/identity/link-wallet', wallet_data, user_type='retail'
            )
            self.log_result("Link wallet to ZK identity", success11, error11, response11)
            
            # Test oracle submission
            oracle_data = {
                "trade_id": "test_trade_hardening_001",
                "oracle_type": "iot_sensor",
                "grade": "A",
                "data": {"moisture": 12.5, "purity": 95.0},
                "signature": "HSM_iot_sensor_abc123def456"
            }
            success12, error12, response12 = self.make_request(
                'POST', '/oracle/submit', oracle_data, user_type='retail'
            )
            self.log_result("Submit oracle data", success12, error12, response12)
            
            # Test insurance fee collection
            success13, error13, response13 = self.make_request(
                'POST', '/insurance/collect-fee?trade_value=10000', user_type='retail'
            )
            self.log_result("Collect insurance fee", success13, error13, response13)
            
            # Test custody handover creation
            lch_data = {
                "trade_id": "test_trade_hardening_001",
                "asset_symbol": "WHEAT",
                "quantity": 1000,
                "pickup_grade": "A",
                "transporter_id": "TRN-TEST-001",
                "transporter_signature": "HSM_transporter_signature_test123"
            }
            success14, error14, response14 = self.make_request(
                'POST', '/logistics/custody-handover', lch_data, user_type='retail'
            )
            self.log_result("Create custody handover", success14, error14, response14)

    def test_trading_endpoints(self):
        """Test trading endpoints"""
        print("\n💹 Testing Trading Endpoints...")
        
        if 'retail' in self.tokens:
            # Test get orders
            success, error, response = self.make_request(
                'GET', '/orders', user_type='retail'
            )
            self.log_result("Get orders", success, error, response)
            
            # Test get trades
            success2, error2, response2 = self.make_request(
                'GET', '/trades', user_type='retail'
            )
            self.log_result("Get trades", success2, error2, response2)
            
            # Test recent trades
            success3, error3, response3 = self.make_request('GET', '/trades/recent')
            self.log_result("Get recent trades", success3, error3, response3)
            
            # Test order book
            success4, error4, response4 = self.make_request('GET', '/orders/book/RICE')
            self.log_result("Get order book", success4, error4, response4)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting E4N Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run test suites in order
        self.test_auth_endpoints()
        self.test_assets_endpoints()
        self.test_wallet_endpoints()
        self.test_dashboard_endpoints()
        self.test_carbon_credits_endpoints()
        self.test_compliance_endpoints()
        self.test_predictions_endpoints()
        self.test_portfolio_endpoints()
        self.test_risk_endpoints()
        self.test_trading_endpoints()
        self.test_admin_endpoints()
        self.test_phase2_features()
        self.test_phase3_contracts()
        self.test_phase4_blockchain()
        self.test_phase5_demo_features()
        self.test_phase6_hardening_features()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure['test']}: {failure['error']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = E4NAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    try:
        with open('/app/test_reports/backend_api_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'failed_tests': len(tester.failed_tests),
                'success_rate': round(tester.tests_passed/tester.tests_run*100, 1) if tester.tests_run > 0 else 0,
                'failures': tester.failed_tests,
                'detailed_results': tester.results
            }, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save results file: {e}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())