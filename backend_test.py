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