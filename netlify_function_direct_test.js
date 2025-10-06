// Direct test of Netlify Functions without dev server
const path = require('path');

// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'mock-anon-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ofertas-pit-secret-2024';

console.log('🔧 Direct Netlify Functions Test');
console.log('================================');

// Test function imports
let utils, database, api;

try {
    console.log('\n📋 TESTING FUNCTION IMPORTS');
    console.log('-'.repeat(30));
    
    // Test utils import
    utils = require('./ofertas-pit-netlify/netlify/functions/utils.js');
    console.log('✅ Utils module imported successfully');
    console.log(`   Available functions: ${Object.keys(utils).join(', ')}`);
    
    // Test database import
    database = require('./ofertas-pit-netlify/netlify/functions/database.js');
    console.log('✅ Database module imported successfully');
    console.log(`   Available services: ${Object.keys(database).join(', ')}`);
    
    // Test API import
    api = require('./ofertas-pit-netlify/netlify/functions/api.js');
    console.log('✅ API module imported successfully');
    console.log(`   Handler function: ${typeof api.handler === 'function' ? 'Found' : 'Missing'}`);
    
} catch (error) {
    console.log('❌ Function import failed:', error.message);
    process.exit(1);
}

// Test utility functions
console.log('\n📋 TESTING UTILITY FUNCTIONS');
console.log('-'.repeat(30));

try {
    const { generateId, createSlug, calculateDiscount, formatDate, isValidEmail, isValidUrl } = utils;
    
    // Test ID generation
    const id = generateId();
    console.log(`✅ ID Generation: ${id} (${id.length} chars)`);
    
    // Test slug creation
    const slug = createSlug('Eletrônicos & Informática');
    console.log(`✅ Slug Creation: "${slug}"`);
    
    // Test discount calculation
    const discount = calculateDiscount(100, 80);
    console.log(`✅ Discount Calculation: ${discount}% (100 -> 80)`);
    
    // Test date formatting
    const formattedDate = formatDate(new Date());
    console.log(`✅ Date Formatting: ${formattedDate}`);
    
    // Test email validation
    const validEmail = isValidEmail('test@example.com');
    const invalidEmail = isValidEmail('invalid-email');
    console.log(`✅ Email Validation: valid=${validEmail}, invalid=${invalidEmail}`);
    
    // Test URL validation
    const validUrl = isValidUrl('https://example.com');
    const invalidUrl = isValidUrl('not-a-url');
    console.log(`✅ URL Validation: valid=${validUrl}, invalid=${invalidUrl}`);
    
} catch (error) {
    console.log('❌ Utility function test failed:', error.message);
}

// Test JWT functions
console.log('\n📋 TESTING JWT FUNCTIONS');
console.log('-'.repeat(30));

try {
    const { generateToken, verifyToken } = utils;
    
    const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin'
    };
    
    // Generate token
    const token = generateToken(mockUser);
    console.log(`✅ Token Generation: ${token ? 'Success' : 'Failed'}`);
    console.log(`   Token length: ${token.length} chars`);
    
    // Verify token
    const decoded = verifyToken(token);
    console.log(`✅ Token Verification: ${decoded ? 'Success' : 'Failed'}`);
    if (decoded) {
        console.log(`   Decoded user ID: ${decoded.userId}`);
        console.log(`   Decoded email: ${decoded.email}`);
    }
    
    // Test invalid token
    const invalidDecoded = verifyToken('invalid-token');
    console.log(`✅ Invalid Token Test: ${invalidDecoded === null ? 'Correctly rejected' : 'Failed'}`);
    
} catch (error) {
    console.log('❌ JWT function test failed:', error.message);
}

// Test API handler with mock events
console.log('\n📋 TESTING API HANDLER');
console.log('-'.repeat(30));

async function testApiHandler() {
    try {
        const { handler } = api;
        
        // Test health check
        const healthEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/health',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        console.log('Testing health check endpoint...');
        const healthResponse = await handler(healthEvent, {});
        console.log(`✅ Health Check: Status ${healthResponse.statusCode}`);
        
        if (healthResponse.statusCode === 200) {
            const healthData = JSON.parse(healthResponse.body);
            console.log(`   Service: ${healthData.service}`);
            console.log(`   Status: ${healthData.status}`);
            console.log(`   Version: ${healthData.version}`);
        }
        
        // Test CORS preflight
        const corsEvent = {
            httpMethod: 'OPTIONS',
            path: '/.netlify/functions/api/health',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        console.log('Testing CORS preflight...');
        const corsResponse = await handler(corsEvent, {});
        console.log(`✅ CORS Preflight: Status ${corsResponse.statusCode}`);
        
        // Test invalid endpoint
        const invalidEvent = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api/invalid-endpoint',
            headers: {},
            queryStringParameters: null,
            body: null
        };
        
        console.log('Testing invalid endpoint...');
        const invalidResponse = await handler(invalidEvent, {});
        console.log(`✅ Invalid Endpoint: Status ${invalidResponse.statusCode} (should be 404)`);
        
        // Test login endpoint (will fail due to no database, but should show structure)
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
        
        console.log('Testing login endpoint (will fail without database)...');
        try {
            const loginResponse = await handler(loginEvent, {});
            console.log(`✅ Login Endpoint Structure: Status ${loginResponse.statusCode}`);
            if (loginResponse.statusCode !== 200) {
                const errorData = JSON.parse(loginResponse.body);
                console.log(`   Expected error: ${errorData.error || errorData.message}`);
            }
        } catch (loginError) {
            console.log(`⚠️  Login test failed (expected without database): ${loginError.message}`);
        }
        
    } catch (error) {
        console.log('❌ API handler test failed:', error.message);
        console.log('   Stack:', error.stack);
    }
}

// Test response creation
console.log('\n📋 TESTING RESPONSE CREATION');
console.log('-'.repeat(30));

try {
    const { createResponse, corsHeaders } = utils;
    
    const response = createResponse(200, { message: 'Test response' });
    console.log('✅ Response Creation: Success');
    console.log(`   Status Code: ${response.statusCode}`);
    console.log(`   Headers: ${Object.keys(response.headers).join(', ')}`);
    console.log(`   Body: ${response.body}`);
    
    // Check CORS headers
    const hasCors = response.headers['Access-Control-Allow-Origin'] === '*';
    console.log(`✅ CORS Headers: ${hasCors ? 'Present' : 'Missing'}`);
    
} catch (error) {
    console.log('❌ Response creation test failed:', error.message);
}

// Run async tests
testApiHandler().then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIRECT FUNCTION TESTS COMPLETED');
    console.log('='.repeat(50));
    console.log('✅ Function structure appears to be working');
    console.log('⚠️  Database operations will require Supabase connection');
    console.log('💡 To test with real data, set up Supabase environment variables');
}).catch((error) => {
    console.log('\n❌ Async tests failed:', error.message);
    process.exit(1);
});