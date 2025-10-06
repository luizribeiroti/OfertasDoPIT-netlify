import requests
import sys
from datetime import datetime
import json

class OfertasPITAPITester:
    def __init__(self, base_url="https://offers-pit.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_email = "luiz.ribeiro@ofertas.pit"
        self.admin_password = "secure"

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.admin_email, "senha": self.admin_password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Token obtained successfully")
            print(f"   User: {response.get('user', {}).get('email', 'N/A')}")
            return True
        return False

    def test_get_categorias(self):
        """Test getting categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categorias",
            200
        )
        if success:
            categories = response
            print(f"   Found {len(categories)} categories")
            expected_categories = ["Eletrônicos", "Informática", "Moda", "Casa e Jardim", "Esportes", "Livros"]
            found_categories = [cat.get('nome', '') for cat in categories]
            
            for expected in expected_categories:
                if expected in found_categories:
                    print(f"   ✅ Found category: {expected}")
                else:
                    print(f"   ❌ Missing category: {expected}")
        
        return success

    def test_get_promocoes(self):
        """Test getting promotions"""
        success, response = self.run_test(
            "Get Promotions",
            "GET",
            "promocoes",
            200
        )
        if success:
            promocoes = response
            print(f"   Found {len(promocoes)} promotions")
            for promo in promocoes[:3]:  # Show first 3
                print(f"   - {promo.get('titulo', 'N/A')} - {promo.get('percentualDesconto', 0)}% off")
        
        return success

    def test_get_promocoes_with_filters(self):
        """Test getting promotions with filters"""
        # Test sorting by discount
        success1, response1 = self.run_test(
            "Get Promotions (Sorted by Discount)",
            "GET",
            "promocoes?ordenar_por=maior_desconto",
            200
        )
        
        # Test filtering by category (if we have categories)
        success2, response2 = self.run_test(
            "Get Promotions (All filters)",
            "GET",
            "promocoes?ordenar_por=data_recente&ativo=true",
            200
        )
        
        return success1 and success2

    def test_social_links(self):
        """Test social links configuration"""
        success, response = self.run_test(
            "Get Social Links",
            "GET",
            "config/links",
            200
        )
        if success:
            print(f"   WhatsApp: {response.get('whatsapp', 'N/A')}")
            print(f"   Telegram: {response.get('telegram', 'N/A')}")
        
        return success

    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        if not self.token:
            print("❌ No token available for authenticated tests")
            return False

        # Test creating a category
        success1, response1 = self.run_test(
            "Create Category (Auth Required)",
            "POST",
            "categorias",
            200,
            data={"nome": "Categoria Teste", "slug": "categoria-teste"},
            auth_required=True
        )

        # Test getting promotions with admin access (including inactive)
        success2, response2 = self.run_test(
            "Get All Promotions (Admin)",
            "GET",
            "promocoes?ativo=null",
            200,
            auth_required=True
        )

        return success1 and success2

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

def main():
    print("🚀 Starting Ofertas do PIT API Tests")
    print("=" * 50)
    
    # Setup
    tester = OfertasPITAPITester()
    
    # Run basic tests first
    print("\n📋 BASIC API TESTS")
    print("-" * 30)
    
    tester.test_root_endpoint()
    tester.test_health_check()
    
    # Test public endpoints
    print("\n📋 PUBLIC ENDPOINTS")
    print("-" * 30)
    
    tester.test_get_categorias()
    tester.test_get_promocoes()
    tester.test_get_promocoes_with_filters()
    tester.test_social_links()
    
    # Test authentication
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    
    login_success = tester.test_admin_login()
    
    # Test authenticated endpoints if login succeeded
    if login_success:
        print("\n📋 AUTHENTICATED ENDPOINTS")
        print("-" * 30)
        tester.test_authenticated_endpoints()
    else:
        print("❌ Skipping authenticated tests due to login failure")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())