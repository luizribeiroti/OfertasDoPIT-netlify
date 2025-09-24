-- Dados de exemplo para Ofertas do PIT
-- Execute com: wrangler d1 execute ofertas-pit-db --file=./seed-data.sql

-- Inserir promoções de exemplo
INSERT OR IGNORE INTO promocoes (id, titulo, imagem_produto, preco_original, preco_oferta, percentual_desconto, link_oferta, categoria_id, ativo) VALUES
('promo-1', 'Smart TV 50" 4K Samsung Crystal', 'https://images.samsung.com/is/image/samsung/p6pim/br/un50cu7700gxzd/gallery/br-uhd-4k-smart-tv-cu7700-un50cu7700gxzd-537096316', 2499.99, 1799.99, 28.00, 'https://www.samsung.com.br', 'cat-eletronicos', 1),
('promo-2', 'iPhone 15 Pro Max 256GB', 'https://via.placeholder.com/400x300/1a1d29/FFD700?text=iPhone+15+Pro', 8999.99, 7499.99, 16.67, 'https://www.apple.com.br', 'cat-eletronicos', 1),
('promo-3', 'Notebook Gamer Acer Nitro 5', 'https://via.placeholder.com/400x300/1a1d29/FFD700?text=Notebook+Gamer', 3999.99, 2799.99, 30.00, 'https://www.acer.com.br', 'cat-informatica', 1),
('promo-4', 'Penalty Bola de Futsal RX 500 XXIII', 'https://imgcentauro-a.akamaihd.net/1366x1366/97414902.jpg', 89.45, 67.90, 24.07, 'https://www.centauro.com.br', 'cat-esportes', 1),
('promo-5', 'Tênis Nike Air Max 270', 'https://via.placeholder.com/400x300/1a1d29/FFD700?text=Nike+Air+Max', 599.99, 399.99, 33.33, 'https://www.nike.com.br', 'cat-moda', 1),
('promo-6', 'Conjunto de Panelas Tramontina', 'https://via.placeholder.com/400x300/1a1d29/FFD700?text=Panelas+Tramontina', 299.99, 189.99, 36.67, 'https://www.tramontina.com.br', 'cat-casa-jardim', 1);

-- Atualizar links sociais
UPDATE configuracoes SET valor = 'https://wa.me/5511999999999' WHERE chave = 'links_whatsapp';
UPDATE configuracoes SET valor = 'https://t.me/ofertasdopit' WHERE chave = 'links_telegram';

-- Verificar dados inseridos
SELECT 'Categorias criadas:' as info;
SELECT id, nome FROM categorias;

SELECT 'Promoções inseridas:' as info;
SELECT id, titulo, percentual_desconto || '% OFF' as desconto FROM promocoes;

SELECT 'Configurações:' as info;
SELECT chave, valor FROM configuracoes;