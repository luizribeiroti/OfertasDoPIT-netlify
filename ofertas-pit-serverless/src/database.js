/**
 * Database service for Ofertas do PIT
 * Cloudflare D1 SQLite operations
 */

import { generateId, calculateDiscountPercentage } from './utils.js';

export class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  // Category operations
  async getCategorias() {
    const result = await this.db.prepare(`
      SELECT id, nome, slug, created_at 
      FROM categorias 
      ORDER BY nome ASC
    `).all();
    
    return result.results || [];
  }

  async createCategoria({ nome, slug }) {
    const id = generateId();
    
    await this.db.prepare(`
      INSERT INTO categorias (id, nome, slug) 
      VALUES (?, ?, ?)
    `).bind(id, nome, slug).run();
    
    return {
      id,
      nome,
      slug,
      created_at: new Date().toISOString()
    };
  }

  async getCategoriaById(id) {
    const result = await this.db.prepare(`
      SELECT * FROM categorias WHERE id = ?
    `).bind(id).first();
    
    return result;
  }

  // Promotion operations
  async getPromocoes(filters = {}) {
    let query = `
      SELECT p.*, c.nome as categoria_nome
      FROM promocoes p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.categoria_id) {
      query += ` AND p.categoria_id = ?`;
      params.push(filters.categoria_id);
    }

    if (filters.ativo !== undefined) {
      query += ` AND p.ativo = ?`;
      params.push(filters.ativo ? 1 : 0);
    }

    // Ordering
    switch (filters.ordenar_por) {
      case 'maior_desconto':
        query += ` ORDER BY p.percentual_desconto DESC`;
        break;
      case 'menor_desconto':
        query += ` ORDER BY p.percentual_desconto ASC`;
        break;
      case 'maior_preco':
        query += ` ORDER BY p.preco_oferta DESC`;
        break;
      case 'menor_preco':
        query += ` ORDER BY p.preco_oferta ASC`;
        break;
      case 'data_recente':
      default:
        query += ` ORDER BY p.data_postagem DESC`;
        break;
    }

    query += ` LIMIT 100`;

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results?.map(this.formatPromocao) || [];
  }

  async getPromocaoById(id) {
    const result = await this.db.prepare(`
      SELECT p.*, c.nome as categoria_nome, c.slug as categoria_slug
      FROM promocoes p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ?
    `).bind(id).first();
    
    return result ? this.formatPromocao(result) : null;
  }

  async createPromocao(data) {
    // Verify category exists
    const categoria = await this.getCategoriaById(data.categoria_id);
    if (!categoria) {
      throw new Error('Categoria não encontrada');
    }

    const id = generateId();
    const percentualDesconto = calculateDiscountPercentage(
      data.precoOriginal, 
      data.precoOferta
    );

    const promocao = {
      id,
      titulo: data.titulo,
      imagem_produto: data.imagemProduto,
      preco_original: data.precoOriginal,
      preco_oferta: data.precoOferta,
      percentual_desconto: percentualDesconto,
      link_oferta: data.linkOferta,
      categoria_id: data.categoria_id,
      ativo: data.ativo !== undefined ? data.ativo : true,
      data_postagem: new Date().toISOString()
    };

    await this.db.prepare(`
      INSERT INTO promocoes 
      (id, titulo, imagem_produto, preco_original, preco_oferta, 
       percentual_desconto, link_oferta, categoria_id, ativo, data_postagem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      promocao.id,
      promocao.titulo,
      promocao.imagem_produto,
      promocao.preco_original,
      promocao.preco_oferta,
      promocao.percentual_desconto,
      promocao.link_oferta,
      promocao.categoria_id,
      promocao.ativo ? 1 : 0,
      promocao.data_postagem
    ).run();

    return this.formatPromocao(promocao);
  }

  async updatePromocao(id, data) {
    const existing = await this.getPromocaoById(id);
    if (!existing) {
      throw new Error('Promoção não encontrada');
    }

    const updates = [];
    const params = [];

    if (data.titulo !== undefined) {
      updates.push('titulo = ?');
      params.push(data.titulo);
    }
    if (data.imagemProduto !== undefined) {
      updates.push('imagem_produto = ?');
      params.push(data.imagemProduto);
    }
    if (data.precoOriginal !== undefined) {
      updates.push('preco_original = ?');
      params.push(data.precoOriginal);
    }
    if (data.precoOferta !== undefined) {
      updates.push('preco_oferta = ?');
      params.push(data.precoOferta);
    }
    if (data.linkOferta !== undefined) {
      updates.push('link_oferta = ?');
      params.push(data.linkOferta);
    }
    if (data.categoria_id !== undefined) {
      // Verify category exists
      const categoria = await this.getCategoriaById(data.categoria_id);
      if (!categoria) {
        throw new Error('Categoria não encontrada');
      }
      updates.push('categoria_id = ?');
      params.push(data.categoria_id);
    }
    if (data.ativo !== undefined) {
      updates.push('ativo = ?');
      params.push(data.ativo ? 1 : 0);
    }

    // Recalculate discount if prices changed
    if (data.precoOriginal !== undefined || data.precoOferta !== undefined) {
      const originalPrice = data.precoOriginal !== undefined ? data.precoOriginal : existing.precoOriginal;
      const offerPrice = data.precoOferta !== undefined ? data.precoOferta : existing.precoOferta;
      const discount = calculateDiscountPercentage(originalPrice, offerPrice);
      updates.push('percentual_desconto = ?');
      params.push(discount);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.prepare(`
      UPDATE promocoes 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `).bind(...params).run();

    return await this.getPromocaoById(id);
  }

  async deletePromocao(id) {
    const result = await this.db.prepare(`
      DELETE FROM promocoes WHERE id = ?
    `).bind(id).run();

    if (result.changes === 0) {
      throw new Error('Promoção não encontrada');
    }

    return true;
  }

  // User operations
  async getUserByEmail(email) {
    const result = await this.db.prepare(`
      SELECT * FROM usuarios WHERE email = ?
    `).bind(email).first();
    
    return result;
  }

  async getUserById(id) {
    const result = await this.db.prepare(`
      SELECT id, email, role, created_at FROM usuarios WHERE id = ?
    `).bind(id).first();
    
    return result;
  }

  // Configuration operations
  async getSocialLinks() {
    const whatsapp = await this.db.prepare(`
      SELECT valor FROM configuracoes WHERE chave = 'links_whatsapp'
    `).bind().first();

    const telegram = await this.db.prepare(`
      SELECT valor FROM configuracoes WHERE chave = 'links_telegram'
    `).bind().first();

    return {
      whatsapp: whatsapp?.valor || 'https://wa.me/',
      telegram: telegram?.valor || 'https://t.me/'
    };
  }

  async updateSocialLinks(links) {
    if (links.whatsapp) {
      await this.db.prepare(`
        INSERT OR REPLACE INTO configuracoes (chave, valor, updated_at)
        VALUES ('links_whatsapp', ?, ?)
      `).bind(links.whatsapp, new Date().toISOString()).run();
    }

    if (links.telegram) {
      await this.db.prepare(`
        INSERT OR REPLACE INTO configuracoes (chave, valor, updated_at)
        VALUES ('links_telegram', ?, ?)
      `).bind(links.telegram, new Date().toISOString()).run();
    }

    return true;
  }

  // Utility methods
  formatPromocao(promocao) {
    return {
      id: promocao.id,
      titulo: promocao.titulo,
      imagemProduto: promocao.imagem_produto,
      precoOriginal: promocao.preco_original,
      precoOferta: promocao.preco_oferta,
      percentualDesconto: promocao.percentual_desconto,
      linkOferta: promocao.link_oferta,
      categoria_id: promocao.categoria_id,
      dataPostagem: promocao.data_postagem,
      ativo: promocao.ativo === 1,
      categoria_nome: promocao.categoria_nome,
      categoria_slug: promocao.categoria_slug
    };
  }

  // Stats for admin dashboard
  async getStats() {
    const totalPromocoes = await this.db.prepare(`
      SELECT COUNT(*) as count FROM promocoes
    `).first();

    const promocoesAtivas = await this.db.prepare(`
      SELECT COUNT(*) as count FROM promocoes WHERE ativo = 1
    `).first();

    const totalCategorias = await this.db.prepare(`
      SELECT COUNT(*) as count FROM categorias
    `).first();

    return {
      totalPromocoes: totalPromocoes?.count || 0,
      promocoesAtivas: promocoesAtivas?.count || 0,
      totalCategorias: totalCategorias?.count || 0
    };
  }
}