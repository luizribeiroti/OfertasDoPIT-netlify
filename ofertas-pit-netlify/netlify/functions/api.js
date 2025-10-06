const { createResponse, verifyToken, comparePassword } = require('./utils')
const { PromocaoService, CategoriaService, UsuarioService, ConfiguracaoService } = require('./database')

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'ofertas-pit-secret-2024'

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, '')
  }

  // Extract path from Netlify function context
  const path = event.path.replace('/.netlify/functions/api', '') || '/'
  const method = event.httpMethod

  console.log(`API Request: ${method} ${path}`)

  try {
    // Health check
    if (path === '/health' || path === '/') {
      return createResponse(200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0-netlify',
        service: 'Ofertas do PIT API'
      })
    }

    // Auth endpoints
    if (path === '/auth/login' && method === 'POST') {
      return await handleLogin(JSON.parse(event.body))
    }

    // Public endpoints
    if (method === 'GET') {
      if (path === '/categorias') {
        return await handleGetCategorias()
      }
      if (path === '/promocoes') {
        return await handleGetPromocoes(event.queryStringParameters || {})
      }
      if (path.startsWith('/promocoes/')) {
        const id = path.split('/')[2]
        return await handleGetPromocao(id)
      }
      if (path === '/config/links') {
        return await handleGetSocialLinks()
      }
    }

    // Protected endpoints - require authentication
    const authResult = await verifyAuth(event.headers.authorization || event.headers.Authorization)
    if (!authResult.success) {
      return createResponse(401, { error: 'Unauthorized - Token required' })
    }

    // Admin endpoints
    if (path === '/promocoes' && method === 'POST') {
      return await handleCreatePromocao(JSON.parse(event.body))
    }
    if (path.startsWith('/promocoes/') && method === 'PUT') {
      const id = path.split('/')[2]
      return await handleUpdatePromocao(id, JSON.parse(event.body))
    }
    if (path.startsWith('/promocoes/') && method === 'DELETE') {
      const id = path.split('/')[2]
      return await handleDeletePromocao(id)
    }
    if (path === '/categorias' && method === 'POST') {
      return await handleCreateCategoria(JSON.parse(event.body))
    }
    if (path === '/config/links' && method === 'PUT') {
      return await handleUpdateSocialLinks(JSON.parse(event.body))
    }

    return createResponse(404, { error: 'Endpoint not found', path, method })

  } catch (error) {
    console.error('Function Error:', error)
    return createResponse(500, { 
      error: 'Internal Server Error',
      message: error.message 
    })
  }
}

// Auth functions
async function handleLogin(body) {
  try {
    const { email, senha } = body

    if (!email || !senha) {
      return createResponse(400, { error: 'Email e senha são obrigatórios' })
    }
    
    const user = await UsuarioService.getByEmail(email)

    if (!user) {
      return createResponse(401, { error: 'Email ou senha incorretos' })
    }

    // For demo purposes, check against hardcoded password
    // In production, use comparePassword(senha, user.senha)
    const isValidPassword = senha === 'secure'
    if (!isValidPassword) {
      return createResponse(401, { error: 'Email ou senha incorretos' })
    }

    const token = require('./utils').generateToken(user)
    
    return createResponse(200, {
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return createResponse(400, { error: 'Invalid request', details: error.message })
  }
}

async function verifyAuth(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false }
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (!decoded) {
      return { success: false }
    }
    return { success: true, userId: decoded.userId }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { success: false }
  }
}

// Category functions
async function handleGetCategorias() {
  try {
    const categorias = await CategoriaService.getAll()
    return createResponse(200, categorias)
  } catch (error) {
    console.error('Get categorias error:', error)
    return createResponse(500, { error: 'Erro ao carregar categorias' })
  }
}

async function handleCreateCategoria(body) {
  try {
    const categoria = await CategoriaService.create(body)
    return createResponse(200, categoria)
  } catch (error) {
    console.error('Create categoria error:', error)
    return createResponse(400, { error: 'Erro ao criar categoria' })
  }
}

// Promotion functions
async function handleGetPromocoes(params) {
  try {
    const filters = {}
    
    if (params.categoria_id) {
      filters.categoria_id = params.categoria_id
    }
    if (params.ativo !== 'false') {
      filters.ativo = true
    }
    if (params.ordenar_por) {
      filters.ordenar_por = params.ordenar_por
    }

    const promocoes = await PromocaoService.getAll(filters)
    
    // Format response to match frontend expectations
    const formattedData = promocoes.map(promo => ({
      ...promo,
      imagemProduto: promo.imagem_produto,
      precoOriginal: promo.preco_original,
      precoOferta: promo.preco_oferta,
      percentualDesconto: promo.percentual_desconto,
      linkOferta: promo.link_oferta,
      categoria_id: promo.categoria_id,
      dataPostagem: promo.data_postagem
    }))

    return createResponse(200, formattedData)
  } catch (error) {
    console.error('Get promocoes error:', error)
    return createResponse(500, { error: 'Erro ao carregar promoções' })
  }
}

async function handleGetPromocao(id) {
  try {
    const promocao = await PromocaoService.getById(id)

    if (!promocao) {
      return createResponse(404, { error: 'Promoção não encontrada' })
    }

    // Format response
    const formattedData = {
      ...promocao,
      imagemProduto: promocao.imagem_produto,
      precoOriginal: promocao.preco_original,
      precoOferta: promocao.preco_oferta,
      percentualDesconto: promocao.percentual_desconto,
      linkOferta: promocao.link_oferta,
      categoria_id: promocao.categoria_id,
      dataPostagem: promocao.data_postagem
    }

    return createResponse(200, formattedData)
  } catch (error) {
    console.error('Get promocao error:', error)
    return createResponse(500, { error: 'Erro ao carregar promoção' })
  }
}

async function handleCreatePromocao(body) {
  try {
    // Convert frontend field names to database field names
    const promocaoData = {
      titulo: body.titulo,
      imagem_produto: body.imagemProduto,
      preco_original: body.precoOriginal,
      preco_oferta: body.precoOferta,
      link_oferta: body.linkOferta,
      categoria_id: body.categoria_id,
      ativo: body.ativo !== undefined ? body.ativo : true
    }

    const promocao = await PromocaoService.create(promocaoData)
    return createResponse(200, promocao)
  } catch (error) {
    console.error('Create promocao error:', error)
    return createResponse(400, { error: 'Erro ao criar promoção', details: error.message })
  }
}

async function handleUpdatePromocao(id, body) {
  try {
    const updateData = {}
    
    // Convert field names to match database
    if (body.titulo) updateData.titulo = body.titulo
    if (body.imagemProduto) updateData.imagem_produto = body.imagemProduto
    if (body.precoOriginal) updateData.preco_original = body.precoOriginal
    if (body.precoOferta) updateData.preco_oferta = body.precoOferta
    if (body.linkOferta) updateData.link_oferta = body.linkOferta
    if (body.categoria_id) updateData.categoria_id = body.categoria_id
    if (body.ativo !== undefined) updateData.ativo = body.ativo

    const promocao = await PromocaoService.update(id, updateData)
    return createResponse(200, promocao)
  } catch (error) {
    console.error('Update promocao error:', error)
    return createResponse(400, { error: 'Erro ao atualizar promoção' })
  }
}

async function handleDeletePromocao(id) {
  try {
    await PromocaoService.delete(id)
    return createResponse(200, { message: 'Promoção removida com sucesso' })
  } catch (error) {
    console.error('Delete promocao error:', error)
    return createResponse(400, { error: 'Erro ao remover promoção' })
  }
}

// Social links functions
async function handleGetSocialLinks() {
  try {
    const links = await ConfiguracaoService.getSocialLinks()
    
    // Provide default links if none are configured
    const defaultLinks = {
      whatsapp: links.whatsapp || 'https://wa.me/',
      telegram: links.telegram || 'https://t.me/'
    }

    return createResponse(200, defaultLinks)
  } catch (error) {
    console.error('Get social links error:', error)
    return createResponse(500, { error: 'Erro ao carregar links sociais' })
  }
}

async function handleUpdateSocialLinks(body) {
  try {
    const { whatsapp, telegram } = body

    const promises = []
    if (whatsapp) {
      promises.push(ConfiguracaoService.setSocialLink('whatsapp', whatsapp))
    }
    if (telegram) {
      promises.push(ConfiguracaoService.setSocialLink('telegram', telegram))
    }

    await Promise.all(promises)

    return createResponse(200, { message: 'Links atualizados com sucesso' })
  } catch (error) {
    console.error('Update social links error:', error)
    return createResponse(400, { error: 'Erro ao atualizar links' })
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