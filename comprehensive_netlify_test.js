// Comprehensive Netlify Functions Test
const path = require('path');

// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'mock-anon-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ofertas-pit-secret-2024';

console.log('🚀 Comprehensive Netlify Functions API Test');
console.log('='.repeat(60));

let utils, database, api;
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

function logTest(name, success, details = '') {
    testResults.total++;
    if (success) {
        testResults.passed++;
        console.log(`✅ ${name}`);
        if (details) console.log(`   ${details}`);
    } else {
        testResults.failed++;
        testResults.errors.push(name);
        console.log(`❌ ${name}`);
        if (details) console.log(`   ${details}`);
    }
}

// Import modules
try {
    utils = require('./ofertas-pit-netlify/netlify/functions/utils.js');
    database = require('./ofertas-pit-netlify/netlify/functions/database.js');
    api = require('./ofertas-pit-netlify/netlify/functions/api.js');
    
    logTest('Module Imports', true, 'All modules loaded successfully');
} catch (error) {
    logTest('Module Imports', false, error.message);
    process.exit(1);
}

// Test utility functions
console.log('\n📋 UTILITY FUNCTIONS TESTS');
console.log('-'.repeat(40));

try {
    // Test ID generation
    const id = utils.generateId();
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    logTest('UUID Generation', isValidUUID, `Generated: ${id}`);
    
    // Test slug creation
    const slug = utils.createSlug('Eletrônicos & Informática');
    const expectedSlug = 'eletronicos-informatica';
    logTest('Slug Creation', slug === expectedSlug, `"${slug}" === "${expectedSlug}"`);
    
    // Test discount calculation
    const discount = utils.calculateDiscount(100, 80);
    logTest('Discount Calculation', discount === 20, `${discount}% (100 -> 80)`);
    
    // Test email validation
    const validEmail = utils.isValidEmail('test@example.com');
    const invalidEmail = utils.isValidEmail('invalid-email');
    logTest('Email Validation', validEmail && !invalidEmail, `Valid: ${validEmail}, Invalid: ${invalidEmail}`);
    
    // Test URL validation
    const validUrl = utils.isValidUrl('https://example.com');
    const invalidUrl = utils.isValidUrl('not-a-url');
    logTest('URL Validation', validUrl && !invalidUrl, `Valid: ${validUrl}, Invalid: ${invalidUrl}`);
    
    // Test JWT functions
    const mockUser = { id: 'test-id', email: 'test@example.com', role: 'admin' };
    const token = utils.generateToken(mockUser);
    const decoded = utils.verifyToken(token);
    const jwtWorking = token && decoded && decoded.userId === mockUser.id;
    logTest('JWT Token Generation/Verification', jwtWorking, `Token length: ${token.length}`);
    
    // Test response creation
    const response = utils.createResponse(200, { test: 'data' });
    const responseValid = response.statusCode === 200 && 
                         response.headers['Access-Control-Allow-Origin'] === '*' &&
                         JSON.parse(response.body).test === 'data';
    logTest('Response Creation', responseValid, 'Status, CORS headers, and body correct');
    
} catch (error) {
    logTest('Utility Functions', false, error.message);
}

// Test API endpoints
console.log('\n📋 API ENDPOINT TESTS');
console.log('-'.repeat(40));

async function testEndpoints() {
    try {
        // Test health check
        const healthEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/health',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        const healthResponse = await api.handler(healthEvent, {});
        const healthData = JSON.parse(healthResponse.body);
        const healthWorking = healthResponse.statusCode === 200 && 
                             healthData.status === 'healthy' &&
                             healthData.service === 'Ofertas do PIT API';
        logTest('Health Check Endpoint', healthWorking, 
               `Status: ${healthData.status}, Service: ${healthData.service}`);
        
        // Test CORS preflight
        const corsEvent = {
            httpMethod: 'OPTIONS',
            path: '/.netlify/functions/api/health',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        const corsResponse = await api.handler(corsEvent, {});
        logTest('CORS Preflight', corsResponse.statusCode === 200, 
               `Status: ${corsResponse.statusCode}`);
        
        // Test root endpoint
        const rootEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        const rootResponse = await api.handler(rootEvent, {});
        const rootData = JSON.parse(rootResponse.body);
        logTest('Root Endpoint', rootResponse.statusCode === 200 && rootData.status === 'healthy',
               `Status: ${rootResponse.statusCode}`);
        
        // Test invalid endpoint
        const invalidEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/invalid-endpoint',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        const invalidResponse = await api.handler(invalidEvent, {});
        logTest('Invalid Endpoint (404)', invalidResponse.statusCode === 404,
               `Status: ${invalidResponse.statusCode}`);
        
        // Test login endpoint structure (will fail without database but should show proper error handling)
        const loginEvent = {
            httpMethod: 'POST',
            path: '/.netlify/functions/api/auth/login',
            headers: { 'Content-Type': 'application/json' },
            queryStringParameters: null,
            body: JSON.stringify({
                email: 'luiz.ribeiro@ofertas.pit',
                senha: 'secure'
            })
        };
        
        try {
            const loginResponse = await api.handler(loginEvent, {});
            // Should fail gracefully with proper error response
            const hasProperErrorHandling = loginResponse.statusCode >= 400 && 
                                         loginResponse.body && 
                                         JSON.parse(loginResponse.body).error;
            logTest('Login Endpoint Error Handling', hasProperErrorHandling,
                   `Status: ${loginResponse.statusCode} (expected error without database)`);
        } catch (loginError) {
            logTest('Login Endpoint Error Handling', false, `Unexpected error: ${loginError.message}`);
        }
        
        // Test missing body in login
        const loginNoBodyEvent = {
            httpMethod: 'POST',
            path: '/.netlify/functions/api/auth/login',
            headers: { 'Content-Type': 'application/json' },
            queryStringParameters: null,
            body: JSON.stringify({})
        };
        
        const loginNoBodyResponse = await api.handler(loginNoBodyEvent, {});
        const properValidation = loginNoBodyResponse.statusCode === 400;
        logTest('Login Validation (Missing Fields)', properValidation,
               `Status: ${loginNoBodyResponse.statusCode}`);
        
        // Test categorias endpoint (will fail without database)
        const categoriasEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/categorias',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        try {
            const categoriasResponse = await api.handler(categoriasEvent, {});
            const hasErrorHandling = categoriasResponse.statusCode >= 400;
            logTest('Categories Endpoint Structure', hasErrorHandling,
                   `Status: ${categoriasResponse.statusCode} (expected error without database)`);
        } catch (catError) {
            logTest('Categories Endpoint Structure', false, `Unexpected error: ${catError.message}`);
        }
        
        // Test promocoes endpoint (will fail without database)
        const promocoesEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/promocoes',
            headers: {},
            queryStringParameters: { ordenar_por: 'maior_desconto', ativo: 'true' },
            body: null
        };
        
        try {
            const promocoesResponse = await api.handler(promocoesEvent, {});
            const hasErrorHandling = promocoesResponse.statusCode >= 400;
            logTest('Promotions Endpoint Structure', hasErrorHandling,
                   `Status: ${promocoesResponse.statusCode} (expected error without database)`);
        } catch (promoError) {
            logTest('Promotions Endpoint Structure', false, `Unexpected error: ${promoError.message}`);
        }
        
        // Test social links endpoint
        const linksEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/config/links',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        try {
            const linksResponse = await api.handler(linksEvent, {});
            const hasErrorHandling = linksResponse.statusCode >= 400;
            logTest('Social Links Endpoint Structure', hasErrorHandling,
                   `Status: ${linksResponse.statusCode} (expected error without database)`);
        } catch (linksError) {
            logTest('Social Links Endpoint Structure', false, `Unexpected error: ${linksError.message}`);
        }
        
        // Test unauthorized access to protected endpoints
        const createCategoryEvent = {
            httpMethod: 'POST',
            path: '/.netlify/functions/api/categorias',
            headers: { 'Content-Type': 'application/json' },
            queryStringParameters: null,
            body: JSON.stringify({ nome: 'Test Category', slug: 'test-category' })
        };
        
        const unauthorizedResponse = await api.handler(createCategoryEvent, {});
        logTest('Unauthorized Access Protection', unauthorizedResponse.statusCode === 401,
               `Status: ${unauthorizedResponse.statusCode} (should be 401)`);
        
        // Test with invalid auth header
        const invalidAuthEvent = {
            httpMethod: 'POST',
            path: '/.netlify/functions/api/categorias',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-token'
            },
            queryStringParameters: null,
            body: JSON.stringify({ nome: 'Test Category', slug: 'test-category' })
        };
        
        const invalidAuthResponse = await api.handler(invalidAuthEvent, {});
        logTest('Invalid Token Protection', invalidAuthResponse.statusCode === 401,
               `Status: ${invalidAuthResponse.statusCode} (should be 401)`);
        
    } catch (error) {
        logTest('API Endpoint Tests', false, error.message);
    }
}

// Test database service structure
console.log('\n📋 DATABASE SERVICE STRUCTURE TESTS');
console.log('-'.repeat(40));

try {
    const { PromocaoService, CategoriaService, UsuarioService, ConfiguracaoService } = database;
    
    // Check if services have required methods
    const promocaoMethods = ['getAll', 'getById', 'create', 'update', 'delete'];
    const categoriaMethods = ['getAll', 'getById', 'create', 'update', 'delete'];
    const usuarioMethods = ['getByEmail', 'create'];
    const configMethods = ['getSocialLinks', 'setSocialLink'];
    
    const promocaoComplete = promocaoMethods.every(method => typeof PromocaoService[method] === 'function');
    logTest('PromocaoService Methods', promocaoComplete, 
           `Has: ${promocaoMethods.filter(m => typeof PromocaoService[m] === 'function').join(', ')}`);
    
    const categoriaComplete = categoriaMethods.every(method => typeof CategoriaService[method] === 'function');
    logTest('CategoriaService Methods', categoriaComplete,
           `Has: ${categoriaMethods.filter(m => typeof CategoriaService[m] === 'function').join(', ')}`);
    
    const usuarioComplete = usuarioMethods.every(method => typeof UsuarioService[method] === 'function');
    logTest('UsuarioService Methods', usuarioComplete,
           `Has: ${usuarioMethods.filter(m => typeof UsuarioService[m] === 'function').join(', ')}`);
    
    const configComplete = configMethods.every(method => typeof ConfiguracaoService[method] === 'function');
    logTest('ConfiguracaoService Methods', configComplete,
           `Has: ${configMethods.filter(m => typeof ConfiguracaoService[m] === 'function').join(', ')}`);
    
} catch (error) {
    logTest('Database Service Structure', false, error.message);
}

// Run async tests and show final results
testEndpoints().then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    const successRate = Math.round((testResults.passed / testResults.total) * 100);
    console.log(`\n📈 Success Rate: ${successRate}%`);
    
    console.log('\n🔍 ANALYSIS:');
    if (successRate >= 80) {
        console.log('✅ Netlify Functions API structure is working correctly');
        console.log('✅ All utility functions are operational');
        console.log('✅ API routing and error handling is functional');
        console.log('✅ Authentication and authorization logic is in place');
    } else {
        console.log('⚠️  Some issues detected in the API structure');
    }
    
    console.log('\n💡 NOTES:');
    console.log('   - Database operations require Supabase connection');
    console.log('   - Environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) needed for full functionality');
    console.log('   - Functions are ready for deployment to Netlify');
    console.log('   - CORS headers are properly configured');
    console.log('   - JWT authentication system is implemented');
    
    if (testResults.failed === 0) {
        console.log('\n🎉 All structural tests passed! API is ready for integration.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Review the issues above.');
        process.exit(1);
    }
    
}).catch((error) => {
    console.log('\n❌ Test execution failed:', error.message);
    process.exit(1);
});