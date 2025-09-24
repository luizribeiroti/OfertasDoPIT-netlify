-- Ofertas do PIT Database Schema
-- SQLite para Cloudflare D1

-- Categorias de produtos
CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Promoções/Ofertas
CREATE TABLE IF NOT EXISTS promocoes (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    imagem_produto TEXT NOT NULL,
    preco_original REAL NOT NULL,
    preco_oferta REAL NOT NULL,
    percentual_desconto REAL NOT NULL,
    link_oferta TEXT NOT NULL,
    categoria_id TEXT NOT NULL,
    data_postagem DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Usuários admin
CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configurações do site
CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir categorias padrão
INSERT OR IGNORE INTO categorias (id, nome, slug) VALUES
('cat-eletronicos', 'Eletrônicos', 'eletronicos'),
('cat-informatica', 'Informática', 'informatica'),
('cat-moda', 'Moda', 'moda'),
('cat-casa-jardim', 'Casa e Jardim', 'casa-jardim'),
('cat-esportes', 'Esportes', 'esportes'),
('cat-livros', 'Livros', 'livros');

-- Inserir usuário admin padrão (senha: secure)
INSERT OR IGNORE INTO usuarios (id, email, senha_hash, role) VALUES
('admin-luiz', 'luiz.ribeiro@ofertas.pit', '$2a$10$rOJ3N1XYJxwDTvr3gfBcj.qhZa5/Tj8xgE6k.gK3lY2UZD1m2OJ6W', 'admin');

-- Inserir configurações padrão
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES
('links_whatsapp', 'https://wa.me/'),
('links_telegram', 'https://t.me/'),
('site_titulo', 'Ofertas do PIT'),
('site_descricao', 'As melhores ofertas da internet!');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_promocoes_categoria ON promocoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_promocoes_ativo ON promocoes(ativo);
CREATE INDEX IF NOT EXISTS idx_promocoes_data ON promocoes(data_postagem DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);