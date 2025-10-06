import requests
import sys
import json
from datetime import datetime
import os

class NetlifyFunctionsAPITester:
    def __init__(self):
        # Since this is a Netlify Functions environment, we need to test the function directly
        # or through a local Netlify dev server
        self.base_url = "http://localhost:8888"  # Default Netlify dev server
        self.api_url = f"{self.base_url}/.netlify/functions/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_email = "luiz.ribeiro@ofertas.pit"
        self.admin_password = "secure"
        
        print("🔧 Testing Netlify Functions API")
        print(f"   Base URL: {self.base_url}")
        print(f"   API URL: {self.api_url}")

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                        if len(response_data) > 0:
                            print(f"   Sample item keys: {list(response_data[0].keys()) if response_data[0] else 'Empty'}")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                        # Show important values
                        if 'status' in response_data:
                            print(f"   Status: {response_data['status']}")
                        if 'access_token' in response_data:
                            print(f"   Token received: {'Yes' if response_data['access_token'] else 'No'}")
                except Exception as e:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (15s)")
            return False, {}
        except requests.exceptions.ConnectionError as e:
            print(f"❌ Failed - Connection error: {str(e)}")
            print("   💡 Make sure Netlify dev server is running: 'netlify dev'")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        print("\n📋 TESTING HEALTH CHECK")
        print("-" * 30)
        
        # Test root endpoint
        success1, response1 = self.run_test(
            "Root Health Check",
            "GET",
            "/",
            200
        )
        
        # Test explicit health endpoint
        success2, response2 = self.run_test(
            "Health Endpoint",
            "GET",
            "/health",
            200
        )
        
        if success1 and response1:
            print(f"   Service: {response1.get('service', 'N/A')}")
            print(f"   Version: {response1.get('version', 'N/A')}")
            print(f"   Timestamp: {response1.get('timestamp', 'N/A')}")
        
        return success1 and success2

    def test_cors_headers(self):
        """Test CORS configuration"""
        print("\n📋 TESTING CORS CONFIGURATION")
        print("-" * 30)
        
        success, response = self.run_test(
            "CORS Preflight (OPTIONS)",
            "OPTIONS",
            "/health",
            200
        )
        
        return success

    def test_admin_login(self):
        """Test admin login and get token"""
        print("\n📋 TESTING AUTHENTICATION")
        print("-" * 30)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"email": self.admin_email, "senha": self.admin_password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Token obtained successfully")
            print(f"   User: {response.get('user', {}).get('email', 'N/A')}")
            print(f"   Role: {response.get('user', {}).get('role', 'N/A')}")
            print(f"   Token type: {response.get('token_type', 'N/A')}")
            return True
        else:
            print("   ❌ Login failed - no token received")
            if response:
                print(f"   Error: {response.get('error', 'Unknown error')}")
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login Test",
            "POST",
            "/auth/login",
            401,
            data={"email": "wrong@email.com", "senha": "wrongpassword"}
        )
        return success

    def test_get_categorias(self):
        """Test getting categories"""
        print("\n📋 TESTING CATEGORIES")
        print("-" * 30)
        
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "/categorias",
            200
        )
        
        if success:
            categories = response
            print(f"   Found {len(categories)} categories")
            
            # Show category details
            for cat in categories[:5]:  # Show first 5
                print(f"   - {cat.get('nome', 'N/A')} (slug: {cat.get('slug', 'N/A')})")
        
        return success

    def test_get_promocoes(self):
        """Test getting promotions"""
        print("\n📋 TESTING PROMOTIONS")
        print("-" * 30)
        
        success, response = self.run_test(
            "Get Promotions",
            "GET",
            "/promocoes",
            200
        )
        
        if success:
            promocoes = response
            print(f"   Found {len(promocoes)} promotions")
            
            # Show promotion details
            for promo in promocoes[:3]:  # Show first 3
                print(f"   - {promo.get('titulo', 'N/A')}")
                print(f"     Discount: {promo.get('percentualDesconto', 0)}%")
                print(f"     Price: R$ {promo.get('precoOferta', 0)}")
        
        return success

    def test_get_promocoes_with_filters(self):
        """Test getting promotions with filters and sorting"""
        print("\n📋 TESTING PROMOTION FILTERS")
        print("-" * 30)
        
        # Test sorting by discount
        success1, response1 = self.run_test(
            "Get Promotions (Sorted by Discount)",
            "GET",
            "/promocoes?ordenar_por=maior_desconto",
            200
        )
        
        # Test filtering active promotions
        success2, response2 = self.run_test(
            "Get Active Promotions",
            "GET",
            "/promocoes?ativo=true",
            200
        )
        
        # Test sorting by price
        success3, response3 = self.run_test(
            "Get Promotions (Sorted by Price)",
            "GET",
            "/promocoes?ordenar_por=menor_preco",
            200
        )
        
        return success1 and success2 and success3

    def test_get_single_promocao(self):
        """Test getting a single promotion by ID"""
        # First get all promotions to get an ID
        success_list, response_list = self.run_test(
            "Get Promotions for ID Test",
            "GET",
            "/promocoes",
            200
        )
        
        if success_list and response_list and len(response_list) > 0:
            promo_id = response_list[0].get('id')
            if promo_id:
                success, response = self.run_test(
                    f"Get Single Promotion (ID: {promo_id[:8]}...)",
                    "GET",
                    f"/promocoes/{promo_id}",
                    200
                )
                return success
            else:
                print("   ❌ No promotion ID found in response")
                return False
        else:
            print("   ❌ Could not get promotions list for ID test")
            return False

    def test_social_links(self):
        """Test social links configuration"""
        print("\n📋 TESTING SOCIAL LINKS")
        print("-" * 30)
        
        success, response = self.run_test(
            "Get Social Links",
            "GET",
            "/config/links",
            200
        )
        
        if success:
            print(f"   WhatsApp: {response.get('whatsapp', 'N/A')}")
            print(f"   Telegram: {response.get('telegram', 'N/A')}")
        
        return success

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        print("\n📋 TESTING AUTHENTICATED ENDPOINTS")
        print("-" * 30)
        
        if not self.token:
            print("❌ No token available for authenticated tests")
            return False

        # Test creating a category
        success1, response1 = self.run_test(
            "Create Category (Auth Required)",
            "POST",
            "/categorias",
            200,
            data={"nome": "Categoria Teste Netlify", "slug": "categoria-teste-netlify"},
            auth_required=True
        )

        # Test updating social links
        success2, response2 = self.run_test(
            "Update Social Links (Auth Required)",
            "PUT",
            "/config/links",
            200,
            data={"whatsapp": "https://wa.me/test", "telegram": "https://t.me/test"},
            auth_required=True
        )

        return success1 and success2

    def test_unauthorized_access(self):
        """Test that protected endpoints reject unauthorized requests"""
        print("\n📋 TESTING UNAUTHORIZED ACCESS")
        print("-" * 30)
        
        # Test creating category without auth
        success1, response1 = self.run_test(
            "Create Category (No Auth - Should Fail)",
            "POST",
            "/categorias",
            401,
            data={"nome": "Test Category", "slug": "test-category"}
        )
        
        # Test updating links without auth
        success2, response2 = self.run_test(
            "Update Links (No Auth - Should Fail)",
            "PUT",
            "/config/links",
            401,
            data={"whatsapp": "https://wa.me/test"}
        )
        
        return success1 and success2

    def test_invalid_endpoints(self):
        """Test invalid endpoints return 404"""
        print("\n📋 TESTING INVALID ENDPOINTS")
        print("-" * 30)
        
        success, response = self.run_test(
            "Invalid Endpoint (Should Return 404)",
            "GET",
            "/invalid/endpoint",
            404
        )
        
        return success

    def check_environment_variables(self):
        """Check if required environment variables are available"""
        print("\n📋 CHECKING ENVIRONMENT SETUP")
        print("-" * 30)
        
        required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET']
        missing_vars = []
        
        for var in required_vars:
            if not os.environ.get(var):
                missing_vars.append(var)
                print(f"   ❌ Missing: {var}")
            else:
                print(f"   ✅ Found: {var}")
        
        if missing_vars:
            print(f"\n   ⚠️  Missing environment variables: {', '.join(missing_vars)}")
            print("   💡 These are required for Supabase integration")
            return False
        
        return True

def main():
    print("🚀 Starting Netlify Functions API Tests")
    print("=" * 60)
    
    # Setup
    tester = NetlifyFunctionsAPITester()
    
    # Check environment first
    env_ok = tester.check_environment_variables()
    if not env_ok:
        print("\n⚠️  Environment variables missing - some tests may fail")
    
    # Run basic connectivity tests
    health_ok = tester.test_health_check()
    if not health_ok:
        print("\n❌ Health check failed - API may not be running")
        print("💡 Make sure to run 'netlify dev' in the project directory")
        return 1
    
    # Test CORS
    tester.test_cors_headers()
    
    # Test public endpoints
    tester.test_get_categorias()
    tester.test_get_promocoes()
    tester.test_get_promocoes_with_filters()
    tester.test_get_single_promocao()
    tester.test_social_links()
    
    # Test authentication
    login_success = tester.test_admin_login()
    tester.test_invalid_login()
    
    # Test authenticated endpoints if login succeeded
    if login_success:
        tester.test_authenticated_endpoints()
    else:
        print("❌ Skipping authenticated tests due to login failure")
    
    # Test security
    tester.test_unauthorized_access()
    tester.test_invalid_endpoints()

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed_count = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_count} tests failed")
        
        if failed_count > (tester.tests_run * 0.5):
            print("\n💡 TROUBLESHOOTING TIPS:")
            print("   1. Make sure Netlify dev server is running: 'netlify dev'")
            print("   2. Check environment variables are set")
            print("   3. Verify Supabase connection is working")
            print("   4. Check function logs for detailed errors")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())