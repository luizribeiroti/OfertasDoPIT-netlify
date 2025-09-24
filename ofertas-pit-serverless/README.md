# 🚀 Ofertas do PIT - Serverless Edition

Plataforma serverless de promoções construída com **Cloudflare Workers**, **D1 Database** e **React**.

## 🏗️ Arquitetura

```
Frontend: React (Vite) → Cloudflare Pages
Backend: Cloudflare Workers (JavaScript)
Database: Cloudflare D1 (SQLite)
Auth: JWT + Cloudflare KV Storage
```

## 💰 Custos (100% Gratuito)

- **Cloudflare Pages**: Gratuito (500 builds/mês)
- **Cloudflare Workers**: Gratuito (100k requests/dia)
- **Cloudflare D1**: Gratuito (5GB de dados)
- **Cloudflare KV**: Gratuito (10GB de storage)
- **Domínio**: Apenas o custo do seu domínio

## 🛠️ Pré-requisitos

1. **Node.js** 18+ instalado
2. **Conta Cloudflare** (gratuita)
3. **Domínio** configurado no Cloudflare
4. **Wrangler CLI** instalado globalmente:
   ```bash
   npm install -g wrangler
   ```

## 🚀 Deploy Passo a Passo

### 1. Configuração Inicial

```bash
# Clone o projeto
cd ofertas-pit-serverless

# Instalar dependências
npm install
cd frontend && npm install && cd ..

# Login no Cloudflare
wrangler login
```

### 2. Criar Database D1

```bash
# Criar database
wrangler d1 create ofertas-pit-db

# Copiar o ID do database que aparecerá e colocar no wrangler.toml
```

### 3. Criar KV Storage para Sessões

```bash
# Criar namespace KV
wrangler kv:namespace create "SESSIONS"

# Copiar o ID e colocar no wrangler.toml
```

### 4. Configurar wrangler.toml

Edite o arquivo `wrangler.toml` com seus IDs:

```toml
name = "ofertas-do-pit"
main = "src/worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "ofertas-pit-db"
database_id = "SEU_DATABASE_ID_AQUI"

[[kv_namespaces]]
binding = "SESSIONS"
id = "SEU_KV_ID_AQUI"

[vars]
JWT_SECRET = "ofertas-pit-super-secret-key-2024"

[[routes]]
pattern = "ofertasdopit.com.br/api/*"
zone_name = "ofertasdopit.com.br"
```

### 5. Inicializar Database

```bash
# Executar schema SQL
wrangler d1 execute ofertas-pit-db --file=./schema.sql

# Verificar se as tabelas foram criadas
wrangler d1 execute ofertas-pit-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 6. Deploy do Worker (Backend)

```bash
# Deploy do backend
wrangler deploy
```

### 7. Build e Deploy do Frontend

```bash
# Build do frontend
cd frontend
npm run build

# Deploy no Cloudflare Pages (conecte seu repositório Git)
# ou faça upload manual da pasta dist/
```

### 8. Configurar Domínio

1. **No Cloudflare Dashboard:**
   - Vá em "Workers & Pages"
   - Configure custom domain: `ofertasdopit.com.br`
   - Configure subdomain para API: `ofertasdopit.com.br/api/*`

2. **DNS Records:**
   ```
   Type: CNAME
   Name: @
   Content: ofertas-do-pit.workers.dev
   ```

## 🧪 Desenvolvimento Local

### Backend (Worker)

```bash
# Desenvolvimento local do worker
wrangler dev --local

# Com database local
wrangler dev --local --persist
```

### Frontend

```bash
cd frontend
npm run dev
```

O frontend estará em `http://localhost:3000` e fará proxy para o worker em `http://localhost:8787`.

## 📊 Funcionalidades

### ✅ Implementadas

- **Homepage** com grid de ofertas
- **Páginas individuais** de produtos
- **Sistema administrativo** completo
- **Autenticação JWT** com sessões
- **CRUD completo** de ofertas e categorias
- **Filtros e ordenação** avançados
- **Toggle tema** claro/escuro
- **Design responsivo** mobile-first
- **Links sociais** configuráveis

### 🔐 Admin

- **Email:** `luiz.ribeiro@ofertas.pit`
- **Senha:** `secure`
- **Acesso:** `/admin`

## 🎨 Identidade Visual

- **Cores:** Baseadas na logo do PIT (azul escuro + amarelo vibrante)
- **Fontes:** Anton (títulos) + Roboto (corpo)
- **Tema:** Escuro por padrão com toggle para claro

## 📱 API Endpoints

```
GET    /api/health              - Health check
GET    /api/categorias          - Listar categorias
GET    /api/promocoes           - Listar promoções (com filtros)
GET    /api/promocoes/:id       - Buscar promoção por ID
POST   /api/auth/login          - Login admin
POST   /api/promocoes           - Criar promoção (auth)
PUT    /api/promocoes/:id       - Editar promoção (auth)
DELETE /api/promocoes/:id       - Deletar promoção (auth)
GET    /api/config/links        - Links sociais
PUT    /api/config/links        - Atualizar links sociais (auth)
```

## 🔧 Comandos Úteis

```bash
# Ver logs do worker
wrangler tail

# Executar SQL no D1
wrangler d1 execute ofertas-pit-db --command="SELECT * FROM promocoes;"

# Ver dados do KV
wrangler kv:key list --namespace-id=SEU_KV_ID

# Deploy apenas do worker
wrangler deploy

# Deploy com logs
wrangler deploy --verbose
```

## 📈 Monitoramento

1. **Dashboard Cloudflare:** Analytics de requests, latência, erros
2. **Logs:** `wrangler tail` para logs em tempo real
3. **D1 Database:** Metrics de queries no dashboard

## 🛡️ Segurança

- **JWT** para autenticação
- **Bcrypt** para hash de senhas (simulado no serverless)
- **CORS** configurado
- **Rate limiting** automático do Cloudflare
- **Environment variables** para secrets

## 🔄 Backup e Manutenção

```bash
# Backup do database
wrangler d1 execute ofertas-pit-db --command=".dump" --output=backup.sql

# Restaurar backup
wrangler d1 execute ofertas-pit-db --file=backup.sql
```

## 🎯 Performance

- **CDN Global** via Cloudflare
- **Edge Computing** com Workers
- **Caching automático** de assets estáticos
- **Compressão** de imagens e CSS/JS
- **Lazy loading** de componentes React

## 🌐 URLs Finais

- **Site:** `https://ofertasdopit.com.br`
- **API:** `https://ofertasdopit.com.br/api`
- **Admin:** `https://ofertasdopit.com.br/admin`

## 💡 Próximos Passos

1. **Analytics:** Integrar Google Analytics ou Cloudflare Analytics
2. **SEO:** Meta tags dinâmicas e sitemap.xml
3. **PWA:** Service Worker para app offline
4. **Newsletter:** Sistema de email marketing
5. **Comentários:** Sistema de avaliações de ofertas

---

## 🆘 Suporte

- **Cloudflare Docs:** https://developers.cloudflare.com/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **React Docs:** https://react.dev/

**🎉 Seu site de ofertas serverless está pronto para escalar globalmente com custo zero!**