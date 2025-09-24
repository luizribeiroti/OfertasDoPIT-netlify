/**
 * Ofertas do PIT - Cloudflare Worker API
 * Serverless backend para plataforma de ofertas
 */

import { handleCORS, generateId, hashPassword, verifyPassword, generateJWT, verifyJWT } from './utils.js';
import { DatabaseService } from './database.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Initialize database service
      const db = new DatabaseService(env.DB);

      // API Routes
      if (path.startsWith('/api/')) {
        return await handleAPIRequest(request, env, db, path);
      }

      // Serve static files (handled by Cloudflare Pages)
      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleAPIRequest(request, env, db, path) {
  const method = request.method;
  const url = new URL(request.url);

  // Health Check
  if (path === '/api/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0-serverless'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Authentication
  if (path === '/api/auth/login' && method === 'POST') {
    return await handleLogin(request, env, db);
  }

  // Public routes (no auth required)
  if (method === 'GET') {
    if (path === '/api/categorias') {
      return await handleGetCategorias(db);
    }
    if (path === '/api/promocoes') {
      return await handleGetPromocoes(request, db);
    }
    if (path.match(/^\/api\/promocoes\/[^/]+$/)) {
      const id = path.split('/').pop();
      return await handleGetPromocao(id, db);
    }
    if (path === '/api/config/links') {
      return await handleGetSocialLinks(db);
    }
  }

  // Protected routes (require auth)
  const authResult = await verifyAuth(request, env);
  if (!authResult.success) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Admin routes
  if (path === '/api/promocoes' && method === 'POST') {
    return await handleCreatePromocao(request, db);
  }
  if (path.match(/^\/api\/promocoes\/[^/]+$/) && method === 'PUT') {
    const id = path.split('/').pop();
    return await handleUpdatePromocao(id, request, db);
  }
  if (path.match(/^\/api\/promocoes\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    return await handleDeletePromocao(id, db);
  }
  if (path === '/api/categorias' && method === 'POST') {
    return await handleCreateCategoria(request, db);
  }
  if (path === '/api/config/links' && method === 'PUT') {
    return await handleUpdateSocialLinks(request, db);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Authentication handlers
async function handleLogin(request, env, db) {
  try {
    const { email, senha } = await request.json();
    
    const user = await db.getUserByEmail(email);
    if (!user || !await verifyPassword(senha, user.senha_hash)) {
      return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = await generateJWT({ sub: user.id }, env.JWT_SECRET);
    
    // Store session in KV
    await env.SESSIONS.put(user.id, JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      loginAt: new Date().toISOString()
    }), { expirationTtl: 86400 }); // 24 hours

    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    };

    return new Response(JSON.stringify({
      access_token: token,
      token_type: 'bearer',
      user: userResponse
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function verifyAuth(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false };
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    if (!payload || !payload.sub) {
      return { success: false };
    }

    return { success: true, userId: payload.sub };
  } catch {
    return { success: false };
  }
}

// Category handlers
async function handleGetCategorias(db) {
  const categorias = await db.getCategorias();
  return new Response(JSON.stringify(categorias), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCreateCategoria(request, db) {
  try {
    const { nome, slug } = await request.json();
    const categoria = await db.createCategoria({ nome, slug });
    return new Response(JSON.stringify(categoria), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Promotion handlers
async function handleGetPromocoes(request, db) {
  const url = new URL(request.url);
  const filters = {
    categoria_id: url.searchParams.get('categoria_id'),
    ordenar_por: url.searchParams.get('ordenar_por') || 'data_recente',
    ativo: url.searchParams.get('ativo') !== 'false'
  };
  
  const promocoes = await db.getPromocoes(filters);
  return new Response(JSON.stringify(promocoes), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetPromocao(id, db) {
  const promocao = await db.getPromocaoById(id);
  if (!promocao) {
    return new Response(JSON.stringify({ error: 'Promoção não encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify(promocao), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCreatePromocao(request, db) {
  try {
    const data = await request.json();
    const promocao = await db.createPromocao(data);
    return new Response(JSON.stringify(promocao), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleUpdatePromocao(id, request, db) {
  try {
    const data = await request.json();
    const promocao = await db.updatePromocao(id, data);
    return new Response(JSON.stringify(promocao), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDeletePromocao(id, db) {
  try {
    await db.deletePromocao(id);
    return new Response(JSON.stringify({ message: 'Promoção removida com sucesso' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Social links handlers
async function handleGetSocialLinks(db) {
  const links = await db.getSocialLinks();
  return new Response(JSON.stringify(links), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUpdateSocialLinks(request, db) {
  try {
    const links = await request.json();
    await db.updateSocialLinks(links);
    return new Response(JSON.stringify({ message: 'Links atualizados com sucesso' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}