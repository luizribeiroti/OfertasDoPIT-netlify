import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { Sun, Moon, Menu, X, ShoppingBag, Tag, Users, LogOut, Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import './App.css';

// API Configuration
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8787/api';

// Configure axios
axios.defaults.baseURL = API_BASE_URL;

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

  return (
    <div className="deal-card" onClick={handleCardClick}>
      <div className="deal-image-container">
        <img 
          src={promocao.imagemProduto} 
          alt={promocao.titulo}
          className="deal-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200/1a1d29/FFD700?text=Imagem+Indisponível';
          }}
        />
        <div className="deal-discount">
          -{promocao.percentualDesconto}%
        </div>
      </div>
      
      <div className="deal-content">
        <h3 className="deal-title">{promocao.titulo}</h3>
        
        {categoria && (
          <span className="deal-category">{categoria.nome || categoria}</span>
        )}
        
        <div className="deal-prices">
          <span className="deal-price-original">{formatPrice(promocao.precoOriginal)}</span>
          <span className="deal-price-offer">{formatPrice(promocao.precoOferta)}</span>
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
                src={produto.imagemProduto} 
                alt={produto.titulo}
                className="product-detail-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600x400/1a1d29/FFD700?text=Imagem+Indisponível';
                }}
              />
              <div className="product-discount-badge">
                -{produto.percentualDesconto}%
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
                <span className="price-value">{formatPrice(produto.precoOriginal)}</span>
              </div>
              <div className="price-offer">
                <span className="price-label">Por apenas:</span>
                <span className="price-value">{formatPrice(produto.precoOferta)}</span>
              </div>
              <div className="price-savings">
                Você economiza: <strong>{formatPrice(produto.precoOriginal - produto.precoOferta)}</strong>
              </div>
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span className="meta-label">Publicado em:</span>
                <span className="meta-value">{formatDate(produto.dataPostagem)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Desconto:</span>
                <span className="meta-value discount-highlight">{produto.percentualDesconto}% OFF</span>
              </div>
            </div>

            <div className="product-actions">
              <a 
                href={produto.linkOferta}
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
                categoria={categoria?.nome}
              />
            ))}
          </div>
        </div>
      )}
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