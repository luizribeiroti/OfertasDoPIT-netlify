const { createClient } = require('@supabase/supabase-js')
const { generateId, formatDate, parseDate, calculateDiscount, createSlug } = require('./utils')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Anon Key are required')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Database operations for Promocoes (Promotions)
class PromocaoService {
  static async getAll(filters = {}) {
    try {
      let query = supabase
        .from('promocoes')
        .select(`
          *,
          categoria:categorias(id, nome, slug)
        `)

      // Apply filters
      if (filters.ativo !== undefined) {
        query = query.eq('ativo', filters.ativo)
      }

      if (filters.categoria_id) {
        query = query.eq('categoria_id', filters.categoria_id)
      }

      // Apply sorting
      switch (filters.ordenar_por) {
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
        case 'data_recente':
        default:
          query = query.order('data_postagem', { ascending: false })
          break
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching promocoes:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Database error in getAll:', error)
      throw error
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('promocoes')
        .select(`
          *,
          categoria:categorias(id, nome, slug)
        `)
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching promocao by id:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in getById:', error)
      throw error
    }
  }

  static async create(promocaoData) {
    try {
      // Calculate discount percentage
      const percentualDesconto = calculateDiscount(
        promocaoData.preco_original, 
        promocaoData.preco_oferta
      )

      const newPromocao = {
        id: generateId(),
        titulo: promocaoData.titulo,
        imagem_produto: promocaoData.imagem_produto,
        preco_original: parseFloat(promocaoData.preco_original),
        preco_oferta: parseFloat(promocaoData.preco_oferta),
        percentual_desconto: percentualDesconto,
        link_oferta: promocaoData.link_oferta,
        categoria_id: promocaoData.categoria_id,
        data_postagem: formatDate(new Date()),
        ativo: promocaoData.ativo !== undefined ? promocaoData.ativo : true
      }

      const { data, error } = await supabase
        .from('promocoes')
        .insert(newPromocao)
        .select()
        .single()

      if (error) {
        console.error('Error creating promocao:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in create:', error)
      throw error
    }
  }

  static async update(id, promocaoData) {
    try {
      const updateData = { ...promocaoData }

      // Recalculate discount if prices changed
      if (updateData.preco_original && updateData.preco_oferta) {
        updateData.percentual_desconto = calculateDiscount(
          parseFloat(updateData.preco_original),
          parseFloat(updateData.preco_oferta)
        )
      }

      // Convert prices to numbers
      if (updateData.preco_original) {
        updateData.preco_original = parseFloat(updateData.preco_original)
      }
      if (updateData.preco_oferta) {
        updateData.preco_oferta = parseFloat(updateData.preco_oferta)
      }

      const { data, error } = await supabase
        .from('promocoes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating promocao:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in update:', error)
      throw error
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('promocoes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting promocao:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Database error in delete:', error)
      throw error
    }
  }
}

// Database operations for Categorias (Categories)
class CategoriaService {
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome', { ascending: true })

      if (error) {
        console.error('Error fetching categorias:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Database error in getAll:', error)
      throw error
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching categoria by id:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in getById:', error)
      throw error
    }
  }

  static async create(categoriaData) {
    try {
      const newCategoria = {
        id: generateId(),
        nome: categoriaData.nome,
        slug: categoriaData.slug || createSlug(categoriaData.nome)
      }

      const { data, error } = await supabase
        .from('categorias')
        .insert(newCategoria)
        .select()
        .single()

      if (error) {
        console.error('Error creating categoria:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in create:', error)
      throw error
    }
  }

  static async update(id, categoriaData) {
    try {
      const updateData = { ...categoriaData }

      if (updateData.nome && !updateData.slug) {
        updateData.slug = createSlug(updateData.nome)
      }

      const { data, error } = await supabase
        .from('categorias')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating categoria:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in update:', error)
      throw error
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting categoria:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Database error in delete:', error)
      throw error
    }
  }
}

// Database operations for Usuarios (Users)
class UsuarioService {
  static async getByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user by email:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in getByEmail:', error)
      throw error
    }
  }

  static async create(userData) {
    try {
      const newUser = {
        id: generateId(),
        email: userData.email,
        senha: userData.senha, // Should be hashed before calling this
        role: userData.role || 'admin'
      }

      const { data, error } = await supabase
        .from('usuarios')
        .insert(newUser)
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in create user:', error)
      throw error
    }
  }
}

// Database operations for Configuracoes (Settings)
class ConfiguracaoService {
  static async getSocialLinks() {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['whatsapp_link', 'telegram_link'])

      if (error) {
        console.error('Error fetching social links:', error)
        throw error
      }

      const links = {}
      data?.forEach(item => {
        if (item.chave === 'whatsapp_link') {
          links.whatsapp = item.valor
        } else if (item.chave === 'telegram_link') {
          links.telegram = item.valor
        }
      })

      return links
    } catch (error) {
      console.error('Database error in getSocialLinks:', error)
      throw error
    }
  }

  static async setSocialLink(type, url) {
    try {
      const chave = type === 'whatsapp' ? 'whatsapp_link' : 'telegram_link'
      
      const { data, error } = await supabase
        .from('configuracoes')
        .upsert({ chave, valor: url })
        .select()
        .single()

      if (error) {
        console.error('Error setting social link:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Database error in setSocialLink:', error)
      throw error
    }
  }
}

module.exports = {
  PromocaoService,
  CategoriaService,
  UsuarioService,
  ConfiguracaoService
}