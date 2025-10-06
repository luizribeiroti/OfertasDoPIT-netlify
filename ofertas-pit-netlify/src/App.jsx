import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { Sun, Moon, Menu, X, ShoppingBag, Tag, Users, LogOut, Plus, Edit, Trash2 } from 'lucide-react';
import './App.css';

// API Configuration for Netlify
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8888/.netlify/functions/api';

// Configure axios
axios.defaults.baseURL = API_BASE_URL;

// Add request interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Theme Context
const ThemeContext = createContext();

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

// Theme Provider
const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, senha) => {
    try {
      const response = await axios.post('/auth/login', { email, senha });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erro no login' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Header Component
const Header = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: 'Melhores Ofertas', href: '/', icon: ShoppingBag },
    { name: 'Categorias', href: '/categorias', icon: Tag },
    { name: 'Grupo de Ofertas', href: '/grupos', icon: Users }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="header-pit">
      <div className="header-container">
        <div className="logo-container">
          <img 
            src="https://customer-assets.emergentagent.com/job_a8138b1b-edf9-4291-92c9-8cdaa90d4465/artifacts/p6ezu0s0_image.png" 
            alt="Ofertas do PIT"
            className="logo"
          />
        </div>

        <nav className="nav-desktop">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="header-controls">
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span className="theme-toggle-text">
              {isDark ? "Claro" : "Escuro"}
            </span>
          </button>

          {user && (
            <div className="admin-controls">
              <button 
                onClick={() => navigate('/admin')}
                className="admin-btn"
              >
                Admin
              </button>
              <button 
                onClick={logout}
                className="logout-btn"
                aria-label="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="mobile-menu-toggle"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="nav-mobile">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link-mobile ${isActive(item.href) ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};

// Footer Component
const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer-pit">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-logo">
            <img 
              src="https://customer-assets.emergentagent.com/job_a8138b1b-edf9-4291-92c9-8cdaa90d4465/artifacts/p6ezu0s0_image.png" 
              alt="Ofertas do PIT"
              className="footer-logo-img"
            />
          </div>
          
          <div className="footer-links">
            <Link to="/" className="footer-link">Melhores Ofertas</Link>
            <Link to="/categorias" className="footer-link">Categorias</Link>
            <Link to="/grupos" className="footer-link">Grupo de Ofertas</Link>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} Ofertas do PIT. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

// Deal Card Component
const DealCard = ({ promocao, categoria }) => {
  const navigate = useNavigate();
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleCardClick = () => {
    navigate(`/produto/${promocao.id}`);
  };

  const categoriaNome = categoria?.nome || promocao.categoria?.nome || 'Sem categoria';

  return (
    <div className="deal-card" onClick={handleCardClick}>
      <div className="deal-image-container">
        <img 
          src={promocao.imagemProduto || promocao.imagem_produto} 
          alt={promocao.titulo}
          className="deal-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200/1a1d29/FFD700?text=Imagem+Indisponível';
          }}
        />
        <div className="deal-discount">
          -{promocao.percentualDesconto || promocao.percentual_desconto}%
        </div>
      </div>
      
      <div className="deal-content">
        <h3 className="deal-title">{promocao.titulo}</h3>
        
        <span className="deal-category">{categoriaNome}</span>
        
        <div className="deal-prices">
          <span className="deal-price-original">
            {formatPrice(promocao.precoOriginal || promocao.preco_original)}
          </span>
          <span className="deal-price-offer">
            {formatPrice(promocao.precoOferta || promocao.preco_oferta)}
          </span>
        </div>
        
        <div className="deal-button-container">
          <button className="deal-button">
            Ver Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};

// Home Page - Melhores Ofertas
const HomePage = () => {
  const [promocoes, setPromocoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('data_recente');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [sortBy, categoryFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [promocoesRes, categoriasRes] = await Promise.all([
        axios.get('/promocoes', {
          params: {
            ordenar_por: sortBy,
            categoria_id: categoryFilter || undefined
          }
        }),
        axios.get('/categorias')
      ]);
      
      setPromocoes(promocoesRes.data);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoriaById = (id) => {
    return categorias.find(cat => cat.id === id);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando ofertas...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="hero-section">
        <h1 className="hero-title">Melhores Ofertas</h1>
        <p className="hero-subtitle">Descubra as promoções mais quentes da internet!</p>
      </div>
      
      <div className="filters-section">
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="category-filter">Categoria:</label>
            <select 
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Todas as categorias</option>
              {categorias.map(categoria => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="sort-filter">Ordenar por:</label>
            <select 
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="data_recente">Últimas Postagens</option>
              <option value="maior_desconto">Maior Desconto</option>
              <option value="menor_desconto">Menor Desconto</option>
              <option value="maior_preco">Maior Preço</option>
              <option value="menor_preco">Menor Preço</option>
            </select>
          </div>
        </div>
      </div>

      <div className="deals-grid">
        {promocoes.length === 0 ? (
          <div className="no-deals">
            <ShoppingBag size={48} />
            <h3>Nenhuma oferta encontrada</h3>
            <p>Tente ajustar os filtros ou volte mais tarde para novas ofertas!</p>
          </div>
        ) : (
          promocoes.map(promocao => (
            <DealCard 
              key={promocao.id} 
              promocao={promocao}
              categoria={getCategoriaById(promocao.categoria_id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Product Detail Page Component
const ProductDetailPage = () => {
  const { id } = useParams();
  const [produto, setProduto] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      
      const productRes = await axios.get(`/promocoes/${id}`);
      setProduto(productRes.data);
      
      const categoriasRes = await axios.get('/categorias');
      const allCategorias = categoriasRes.data;
      
      const productCategory = allCategorias.find(cat => cat.id === productRes.data.categoria_id);
      setCategoria(productCategory);
      
      if (productCategory) {
        const relatedRes = await axios.get('/promocoes', {
          params: {
            categoria_id: productRes.data.categoria_id,
            ativo: true
          }
        });
        
        const related = relatedRes.data
          .filter(p => p.id !== id)
          .slice(0, 3);
        setRelatedProducts(related);
      }
      
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando produto...</p>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="page-container">
        <div className="product-not-found">
          <h2>Produto não encontrado</h2>
          <button onClick={() => navigate('/')} className="back-btn">
            Voltar às Ofertas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <button onClick={() => navigate('/')} className="breadcrumb-link">
          Melhores Ofertas
        </button>
        <span className="breadcrumb-separator">›</span>
        {categoria && (
          <>
            <span className="breadcrumb-item">{categoria.nome}</span>
            <span className="breadcrumb-separator">›</span>
          </>
        )}
        <span className="breadcrumb-current">{produto.titulo}</span>
      </div>

      <div className="product-detail-container">
        <div className="product-detail-grid">
          <div className="product-image-section">
            <div className="product-image-container">
              <img 
                src={produto.imagemProduto || produto.imagem_produto} 
                alt={produto.titulo}
                className="product-detail-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600x400/1a1d29/FFD700?text=Imagem+Indisponível';
                }}
              />
              <div className="product-discount-badge">
                -{produto.percentualDesconto || produto.percentual_desconto}%
              </div>
            </div>
          </div>

          <div className="product-info-section">
            <div className="product-header">
              <h1 className="product-title">{produto.titulo}</h1>
              
              {categoria && (
                <span className="product-category-badge">{categoria.nome}</span>
              )}
            </div>

            <div className="product-prices">
              <div className="price-original">
                <span className="price-label">De:</span>
                <span className="price-value">
                  {formatPrice(produto.precoOriginal || produto.preco_original)}
                </span>
              </div>
              <div className="price-offer">
                <span className="price-label">Por apenas:</span>
                <span className="price-value">
                  {formatPrice(produto.precoOferta || produto.preco_oferta)}
                </span>
              </div>
              <div className="price-savings">
                Você economiza: <strong>
                  {formatPrice((produto.precoOriginal || produto.preco_original) - (produto.precoOferta || produto.preco_oferta))}
                </strong>
              </div>
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span className="meta-label">Publicado em:</span>
                <span className="meta-value">
                  {formatDate(produto.dataPostagem || produto.data_postagem)}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Desconto:</span>
                <span className="meta-value discount-highlight">
                  {produto.percentualDesconto || produto.percentual_desconto}% OFF
                </span>
              </div>
            </div>

            <div className="product-actions">
              <a 
                href={produto.linkOferta || produto.link_oferta}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-now-btn"
              >
                🛒 Comprar na Loja
              </a>
              
              <button 
                onClick={() => navigate('/')}
                className="back-to-offers-btn"
              >
                ← Voltar às Ofertas
              </button>
            </div>

            <div className="product-warning">
              ⚠️ <strong>Atenção:</strong> Os preços podem variar. Verifique o valor atual no site da loja antes de finalizar a compra.
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="related-products-section">
          <h2>Outras ofertas de {categoria?.nome}</h2>
          <div className="related-products-grid">
            {relatedProducts.map(relatedProduct => (
              <DealCard 
                key={relatedProduct.id} 
                promocao={relatedProduct}
                categoria={categoria}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Categories Page
const CategoriesPage = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const response = await axios.get('/categorias');
      setCategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoria) => {
    navigate(`/?categoria=${categoria.id}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando categorias...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="hero-section">
        <h1 className="hero-title">Categorias</h1>
        <p className="hero-subtitle">Encontre ofertas por categoria</p>
      </div>

      <div className="categories-grid">
        {categorias.map(categoria => (
          <button
            key={categoria.id}
            onClick={() => handleCategoryClick(categoria)}
            className="category-card"
          >
            <Tag size={32} />
            <h3>{categoria.nome}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

// Groups Page
const GroupsPage = () => {
  const [socialLinks, setSocialLinks] = useState({ whatsapp: '', telegram: '' });

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    try {
      const response = await axios.get('/config/links');
      setSocialLinks(response.data);
    } catch (error) {
      console.error('Erro ao carregar links sociais:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="hero-section">
        <h1 className="hero-title">Grupo de Ofertas</h1>
        <p className="hero-subtitle">Junte-se à nossa comunidade e não perca nenhuma oferta!</p>
      </div>

      <div className="groups-container">
        <div className="group-card whatsapp">
          <div className="group-icon">
            <Users size={48} />
          </div>
          <h3>WhatsApp</h3>
          <p>Receba as melhores ofertas diretamente no seu WhatsApp</p>
          <a 
            href={socialLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="group-button whatsapp-btn"
          >
            Entrar no Grupo
          </a>
        </div>

        <div className="group-card telegram">
          <div className="group-icon">
            <Users size={48} />
          </div>
          <h3>Telegram</h3>
          <p>Acompanhe nossas ofertas em tempo real no Telegram</p>
          <a 
            href={socialLinks.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="group-button telegram-btn"
          >
            Entrar no Canal
          </a>
        </div>
      </div>
    </div>
  );
};

// Login Page
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, senha);
    
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img 
            src="https://customer-assets.emergentagent.com/job_a8138b1b-edf9-4291-92c9-8cdaa90d4465/artifacts/p6ezu0s0_image.png" 
            alt="Ofertas do PIT"
            className="login-logo"
          />
          <h2>Acesso Admin</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha:</label>
            <input
              type="password"
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard - Simplified for now
const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [promocoes, setPromocoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      const [promocoesRes, categoriasRes] = await Promise.all([
        axios.get('/promocoes', { params: { ativo: null } }),
        axios.get('/categorias')
      ]);
      
      setPromocoes(promocoesRes.data);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (window.confirm('Tem certeza que deseja excluir esta oferta?')) {
      try {
        await axios.delete(`/promocoes/${offerId}`);
        fetchData();
        alert('Oferta excluída com sucesso!');
      } catch (error) {
        alert('Erro ao excluir oferta: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Painel Administrativo</h1>
        <p>Bem-vindo, {user.email}</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Total de Ofertas</h3>
          <p className="stat-number">{promocoes.length}</p>
        </div>
        <div className="stat-card">
          <h3>Ofertas Ativas</h3>
          <p className="stat-number">{promocoes.filter(p => p.ativo).length}</p>
        </div>
        <div className="stat-card">
          <h3>Categorias</h3>
          <p className="stat-number">{categorias.length}</p>
        </div>
      </div>

      <div className="admin-actions">
        <button className="admin-action-btn primary">
          <Plus size={20} />
          Nova Oferta
        </button>
        <button className="admin-action-btn secondary">
          <Tag size={20} />
          Gerenciar Categorias
        </button>
      </div>

      <div className="admin-table-container">
        <h2>Ofertas Recentes</h2>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Desconto</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {promocoes.slice(0, 10).map(promocao => {
                const categoria = categorias.find(c => c.id === promocao.categoria_id);
                return (
                  <tr key={promocao.id}>
                    <td className="title-cell">{promocao.titulo}</td>
                    <td>{categoria?.nome || 'N/A'}</td>
                    <td>R$ {(promocao.precoOferta || promocao.preco_oferta)?.toFixed(2)}</td>
                    <td className="discount-cell">
                      {promocao.percentualDesconto || promocao.percentual_desconto}%
                    </td>
                    <td>
                      <span className={`status-badge ${promocao.ativo ? 'active' : 'inactive'}`}>
                        {promocao.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn edit">
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteOffer(promocao.id)}
                        className="action-btn delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/categorias" element={<CategoriesPage />} />
                <Route path="/grupos" element={<GroupsPage />} />
                <Route path="/produto/:id" element={<ProductDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;