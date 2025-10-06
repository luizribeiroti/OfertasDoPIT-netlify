# Ofertas do PIT - Netlify + Supabase

Uma plataforma de compartilhamento de ofertas e promoções, construída com React, Netlify Functions e Supabase.

## 🚀 Características

- **Frontend**: React.js com Vite
- **Backend**: Netlify Functions (serverless)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: JWT
- **Estilização**: CSS customizado com tema escuro/claro
- **Deploy**: Netlify (100% gratuito)

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase
- Conta no Netlify
- Git

## 🛠️ Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login e crie um novo projeto
3. Anote a **URL do projeto** e **chave pública (anon key)**

### 2. Configurar Banco de Dados

Execute as seguintes queries SQL no SQL Editor do Supabase:

```sql
-- Criar tabela de categorias
CREATE TABLE categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de usuários
CREATE TABLE usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de promoções
CREATE TABLE promocoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  imagem_produto TEXT,
  preco_original DECIMAL(10,2) NOT NULL,
  preco_oferta DECIMAL(10,2) NOT NULL,
  percentual_desconto INTEGER NOT NULL,
  link_oferta TEXT NOT NULL,
  categoria_id UUID REFERENCES categorias(id),
  data_postagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);

-- Criar tabela de configurações
CREATE TABLE configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias iniciais
INSERT INTO categorias (nome, slug) VALUES
('Eletrônicos', 'eletronicos'),
('Casa e Jardim', 'casa-jardim'),
('Moda', 'moda'),
('Livros', 'livros'),
('Esportes', 'esportes'),
('Beleza', 'beleza'),
('Informática', 'informatica'),
('Games', 'games');

-- Inserir usuário admin inicial
INSERT INTO usuarios (email, senha, role) VALUES
('luiz.ribeiro@ofertas.pit', 'secure', 'admin');

-- Inserir configurações iniciais
INSERT INTO configuracoes (chave, valor) VALUES
('whatsapp_link', 'https://wa.me/5511999999999'),
('telegram_link', 'https://t.me/ofertasdopit');

-- Inserir algumas promoções de exemplo
INSERT INTO promocoes (titulo, imagem_produto, preco_original, preco_oferta, percentual_desconto, link_oferta, categoria_id) VALUES
('Smartphone Samsung Galaxy A54', 'https://via.placeholder.com/300x200/1a1d29/FFD700?text=Galaxy+A54', 1500.00, 999.00, 33, 'https://exemplo.com/galaxy-a54', (SELECT id FROM categorias WHERE slug = 'eletronicos')),
('Cafeteira Elétrica Philco', 'https://via.placeholder.com/300x200/1a1d29/FFD700?text=Cafeteira', 299.00, 179.00, 40, 'https://exemplo.com/cafeteira', (SELECT id FROM categorias WHERE slug = 'casa-jardim')),
('Tênis Nike Air Max', 'https://via.placeholder.com/300x200/1a1d29/FFD700?text=Nike+Air+Max', 599.00, 399.00, 33, 'https://exemplo.com/nike-air-max', (SELECT id FROM categorias WHERE slug = 'esportes'));
```

### 3. Configurar RLS (Row Level Security)

Execute no SQL Editor para configurar as políticas de segurança:

```sql
-- Habilitar RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura pública
CREATE POLICY "Categorias são públicas" ON categorias FOR SELECT USING (true);
CREATE POLICY "Promoções ativas são públicas" ON promocoes FOR SELECT USING (ativo = true);
CREATE POLICY "Configurações são públicas" ON configuracoes FOR SELECT USING (true);

-- Políticas para usuários (apenas leitura para login)
CREATE POLICY "Usuários podem fazer login" ON usuarios FOR SELECT USING (true);

-- Políticas para operações de admin (desabilitar por enquanto, usar service key)
-- CREATE POLICY "Admin pode tudo em categorias" ON categorias FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
-- CREATE POLICY "Admin pode tudo em promocoes" ON promocoes FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
-- CREATE POLICY "Admin pode tudo em configuracoes" ON configuracoes FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

## 🚀 Deploy no Netlify

### 1. Preparar o Repositório

1. Faça fork deste projeto ou crie um novo repositório
2. Envie o código para o GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/ofertas-pit-netlify.git
git push -u origin main
```

### 2. Configurar no Netlify

1. Acesse [netlify.com](https://netlify.com) e faça login
2. Clique em "New site from Git"
3. Conecte ao seu repositório GitHub
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### 3. Configurar Variáveis de Ambiente

No painel do Netlify, vá em **Site settings > Environment variables** e adicione:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica-aqui
JWT_SECRET=sua-chave-secreta-jwt-aqui
```

**Onde encontrar as chaves do Supabase:**
- Acesse seu projeto no Supabase
- Vá em **Settings > API**
- `SUPABASE_URL` = URL
- `SUPABASE_ANON_KEY` = anon/public key

### 4. Deploy

1. Clique em **Deploy site**
2. Aguarde o build completar
3. Seu site estará disponível no domínio fornecido pelo Netlify

## 🔧 Desenvolvimento Local

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica-aqui
JWT_SECRET=sua-chave-secreta-jwt-aqui
```

### 3. Executar Localmente

```bash
# Desenvolvimento com Netlify Dev
npm run netlify-dev

# Ou desenvolvimento simples
npm run dev
```

Acesse: http://localhost:8888

## 🎯 Funcionalidades

### Público Geral
- ✅ Visualizar ofertas por categoria
- ✅ Filtrar e ordenar promoções
- ✅ Ver detalhes da promoção
- ✅ Acessar links das lojas
- ✅ Alternar entre tema claro/escuro
- ✅ Acessar grupos do WhatsApp/Telegram

### Admin
- ✅ Login no painel administrativo
- ✅ Gerenciar categorias
- ✅ Criar/editar/excluir promoções
- ✅ Ver estatísticas
- ✅ Configurar links sociais

### Credenciais de Admin
- **Email**: `luiz.ribeiro@ofertas.pit`
- **Senha**: `secure`

## 📁 Estrutura do Projeto

```
ofertas-pit-netlify/
├── netlify/
│   └── functions/          # Netlify Functions (backend serverless)
│       ├── api.js         # API principal
│       ├── database.js    # Serviços do banco de dados
│       └── utils.js       # Utilitários e helpers
├── src/                   # Frontend React
│   ├── App.jsx           # Componente principal
│   ├── App.css           # Estilos customizados
│   ├── index.css         # Estilos base
│   └── main.jsx          # Entry point
├── public/               # Arquivos estáticos
├── netlify.toml         # Configuração do Netlify
├── package.json         # Dependências do projeto
└── vite.config.js       # Configuração do Vite
```

## 🔌 API Endpoints

### Públicos
- `GET /api/health` - Health check
- `GET /api/categorias` - Listar categorias
- `GET /api/promocoes` - Listar promoções (com filtros)
- `GET /api/promocoes/:id` - Detalhes da promoção
- `GET /api/config/links` - Links sociais

### Autenticação
- `POST /api/auth/login` - Login do admin

### Admin (requer autenticação)
- `POST /api/promocoes` - Criar promoção
- `PUT /api/promocoes/:id` - Atualizar promoção
- `DELETE /api/promocoes/:id` - Excluir promoção
- `POST /api/categorias` - Criar categoria
- `PUT /api/config/links` - Atualizar links sociais

## 🎨 Personalização

### Cores do Tema
As cores estão definidas no arquivo `src/App.css`:

```css
:root {
  --pit-primary: #FFD700;      /* Amarelo principal */
  --pit-bg-main: #1a1d29;      /* Fundo escuro */
  --pit-accent: #FF8C00;       /* Laranja de destaque */
  /* ... */
}
```

### Adicionando Categorias
Execute no SQL Editor do Supabase:

```sql
INSERT INTO categorias (nome, slug) VALUES
('Nova Categoria', 'nova-categoria');
```

## 🐛 Solução de Problemas

### Build Fails no Netlify
- Verifique se as variáveis de ambiente estão corretas
- Confirme que o Node.js version é 18+
- Veja os logs de build no Netlify

### Erro de Banco de Dados
- Verifique se as chaves do Supabase estão corretas
- Confirme que as tabelas foram criadas
- Teste a conexão no console do Supabase

### Problemas de CORS
- As configurações de CORS estão no arquivo `netlify.toml`
- Verifique se os headers estão sendo enviados corretamente

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📞 Suporte

Para dúvidas ou suporte, entre em contato através do email configurado no sistema.