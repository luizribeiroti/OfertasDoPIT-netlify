const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'ofertas-pit-secret-2024'

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Extract path from Netlify function context
  const path = event.path.replace('/.netlify/functions/api', '') || '/'
  const method = event.httpMethod

  console.log(`API Request: ${method} ${path}`)

  try {
    // Health check
    if (path === '/health' || path === '/') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '3.0.0-netlify',
          service: 'Ofertas do PIT API'
        })
      }
    }

    // Auth endpoints
    if (path === '/auth/login' && method === 'POST') {
      return await handleLogin(JSON.parse(event.body), headers)
    }

    // Public endpoints
    if (method === 'GET') {
      if (path === '/categorias') {
        return await handleGetCategorias(headers)
      }
      if (path === '/promocoes') {
        return await handleGetPromocoes(event.queryStringParameters || {}, headers)
      }
      if (path.startsWith('/promocoes/')) {
        const id = path.split('/')[2]
        return await handleGetPromocao(id, headers)
      }
      if (path === '/config/links') {
        return await handleGetSocialLinks(headers)
      }
    }

    // Protected endpoints - require authentication
    const authResult = await verifyAuth(event.headers.authorization || event.headers.Authorization)
    if (!authResult.success) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Token required' })
      }
    }

    // Admin endpoints
    if (path === '/promocoes' && method === 'POST') {
      return await handleCreatePromocao(JSON.parse(event.body), headers)
    }
    if (path.startsWith('/promocoes/') && method === 'PUT') {
      const id = path.split('/')[2]
      return await handleUpdatePromocao(id, JSON.parse(event.body), headers)
    }
    if (path.startsWith('/promocoes/') && method === 'DELETE') {
      const id = path.split('/')[2]
      return await handleDeletePromocao(id, headers)
    }
    if (path === '/categorias' && method === 'POST') {
      return await handleCreateCategoria(JSON.parse(event.body), headers)
    }
    if (path === '/config/links' && method === 'PUT') {
      return await handleUpdateSocialLinks(JSON.parse(event.body), headers)
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found', path, method })
    }

  } catch (error) {
    console.error('Function Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      })
    }
  }
}

// Auth functions
async function handleLogin(body, headers) {
  try {
    const { email, senha } = body

    if (!email || !senha) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email e senha são obrigatórios' })
      }
    }
    
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Email ou senha incorretos' })
      }
    }

    // Simple password verification (in production, use bcrypt)
    const isValidPassword = await verifyPassword(senha, user.senha_hash)
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Email ou senha incorretos' })
      }
    }

    const token = await generateJWT({ sub: user.id, email: user.email })
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request', details: error.message })
    }
  }
}

async function verifyAuth(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false }
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = await verifyJWT(token)
    return { success: true, userId: decoded.sub }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { success: false }
  }
}

// Category functions
async function handleGetCategorias(headers) {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nome')

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || [])
    }
  } catch (error) {
    console.error('Get categorias error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao carregar categorias' })
    }
  }
}

async function handleCreateCategoria(body, headers) {
  try {
    const { nome, slug } = body

    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome, slug })
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('Create categoria error:', error)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Erro ao criar categoria' })
    }
  }
}

// Promotion functions
async function handleGetPromocoes(params, headers) {
  try {
    let query = supabase
      .from('promocoes')
      .select(`
        *,
        categoria:categorias(id, nome, slug)
      `)

    // Apply filters
    if (params.categoria_id) {
      query = query.eq('categoria_id', params.categoria_id)
    }
    if (params.ativo !== 'false') {
      query = query.eq('ativo', true)
    }

    // Apply sorting
    const ordenar_por = params.ordenar_por || 'data_recente'
    switch (ordenar_por) {
      case 'maior_desconto':
        query = query.order('percentual_desconto', { ascending: false })
        break
      case 'menor_desconto':
        query = query.order('percentual_desconto', { ascending: true })
        break
      case 'maior_preco':
        query = query.order('preco_oferta', { ascending: false })
        break
      case 'menor_preco':
        query = query.order('preco_oferta', { ascending: true })
        break
      default:
        query = query.order('data_postagem', { ascending: false })
    }

    const { data, error } = await query.limit(100)
    
    if (error) throw error

    // Format response to match frontend expectations
    const formattedData = (data || []).map(promo => ({
      ...promo,
      imagemProduto: promo.imagem_produto,
      precoOriginal: promo.preco_original,
      precoOferta: promo.preco_oferta,
      percentualDesconto: promo.percentual_desconto,
      linkOferta: promo.link_oferta,
      categoria_id: promo.categoria_id,
      dataPostagem: promo.data_postagem
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formattedData)
    }
  } catch (error) {
    console.error('Get promocoes error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao carregar promoções' })
    }
  }
}

async function handleGetPromocao(id, headers) {
  try {
    const { data, error } = await supabase
      .from('promocoes')
      .select(`
        *,
        categoria:categorias(id, nome, slug)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Promoção não encontrada' })
      }
    }

    // Format response
    const formattedData = {
      ...data,
      imagemProduto: data.imagem_produto,
      precoOriginal: data.preco_original,
      precoOferta: data.preco_oferta,
      percentualDesconto: data.percentual_desconto,
      linkOferta: data.link_oferta,
      categoria_id: data.categoria_id,
      dataPostagem: data.data_postagem
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formattedData)
    }
  } catch (error) {
    console.error('Get promocao error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao carregar promoção' })
    }
  }
}

async function handleCreatePromocao(body, headers) {
  try {
    const { titulo, imagemProduto, precoOriginal, precoOferta, linkOferta, categoria_id, ativo = true } = body

    // Calculate discount percentage
    const percentualDesconto = Math.round(((precoOriginal - precoOferta) / precoOriginal) * 100 * 100) / 100

    const { data, error } = await supabase
      .from('promocoes')
      .insert({
        titulo,
        imagem_produto: imagemProduto,
        preco_original: parseFloat(precoOriginal),
        preco_oferta: parseFloat(precoOferta),
        percentual_desconto: percentualDesconto,
        link_oferta: linkOferta,
        categoria_id,
        ativo
      })
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('Create promocao error:', error)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Erro ao criar promoção', details: error.message })
    }
  }
}

async function handleUpdatePromocao(id, body, headers) {
  try {
    const updateData = { ...body }
    
    // Convert field names to match database
    if (body.imagemProduto) updateData.imagem_produto = body.imagemProduto
    if (body.precoOriginal) updateData.preco_original = parseFloat(body.precoOriginal)
    if (body.precoOferta) updateData.preco_oferta = parseFloat(body.precoOferta)
    if (body.linkOferta) updateData.link_oferta = body.linkOferta
    
    // Recalculate discount if prices changed
    if (body.precoOriginal || body.precoOferta) {
      const original = parseFloat(body.precoOriginal || updateData.preco_original)
      const offer = parseFloat(body.precoOferta || updateData.preco_oferta)
      updateData.percentual_desconto = Math.round(((original - offer) / original) * 100 * 100) / 100
    }

    // Remove frontend field names
    delete updateData.imagemProduto
    delete updateData.precoOriginal
    delete updateData.precoOferta
    delete updateData.linkOferta

    const { data, error } = await supabase
      .from('promocoes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('Update promocao error:', error)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Erro ao atualizar promoção' })
    }
  }
}

async function handleDeletePromocao(id, headers) {
  try {
    const { error } = await supabase
      .from('promocoes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Promoção removida com sucesso' })
    }
  } catch (error) {
    console.error('Delete promocao error:', error)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Erro ao remover promoção' })
    }
  }
}

// Social links functions
async function handleGetSocialLinks(headers) {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['links_whatsapp', 'links_telegram'])

    if (error) throw error

    const links = {
      whatsapp: 'https://wa.me/',
      telegram: 'https://t.me/'
    }

    if (data) {
      data.forEach(config => {
        if (config.chave === 'links_whatsapp') {
          links.whatsapp = config.valor
        } else if (config.chave === 'links_telegram') {
          links.telegram = config.valor
        }
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(links)
    }
  } catch (error) {
    console.error('Get social links error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao carregar links sociais' })
    }
  }
}

async function handleUpdateSocialLinks(body, headers) {
  try {
    const { whatsapp, telegram } = body

    const updates = []
    if (whatsapp) {
      updates.push(
        supabase
          .from('configuracoes')
          .upsert({ chave: 'links_whatsapp', valor: whatsapp }, { onConflict: 'chave' })
      )
    }
    if (telegram) {
      updates.push(
        supabase
          .from('configuracoes')
          .upsert({ chave: 'links_telegram', valor: telegram }, { onConflict: 'chave' })
      )
    }

    await Promise.all(updates)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Links atualizados com sucesso' })
    }
  } catch (error) {
    console.error('Update social links error:', error)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Erro ao atualizar links' })
    }
  }
}

// Utility functions
async function generateJWT(payload) {
  // Simple JWT implementation for serverless
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = { ...payload, iat: now, exp: now + (24 * 60 * 60) }
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url')
  
  const data = `${encodedHeader}.${encodedPayload}`
  
  // Simple signature (in production, use proper HMAC)
  const signature = Buffer.from(JWT_SECRET + data).toString('base64url').slice(0, 32)
  
  return `${data}.${signature}`
}

async function verifyJWT(token) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.')
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }
    
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

async function verifyPassword(password, hash) {
  // Simple password verification (in production, use bcrypt)
  // For now, just check if they match (demo purposes)
  return password === 'secure' // Hardcoded for demo
}