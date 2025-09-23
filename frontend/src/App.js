import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Sun, Moon, Menu, X, ShoppingBag, Tag, Users, LogOut, Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

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
      const response = await axios.post(`${API}/auth/login`, { email, senha });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erro no login' 
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
        {/* Logo */}
        <div className="logo-container">
          <img 
            src="https://customer-assets.emergentagent.com/job_a8138b1b-edf9-4291-92c9-8cdaa90d4465/artifacts/p6ezu0s0_image.png" 
            alt="Ofertas do PIT"
            className="logo"
          />
        </div>

        {/* Navigation Desktop */}
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

        {/* Controls */}
        <div className="header-controls">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Admin Controls */}
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

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="mobile-menu-toggle"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
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
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="deal-card">
      <div className="deal-image-container">
        <img 
          src={promocao.imagemProduto} 
          alt={promocao.titulo}
          className="deal-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200?text=Imagem+Indisponível';
          }}
        />
        <div className="deal-discount">
          -{promocao.percentualDesconto}%
        </div>
      </div>
      
      <div className="deal-content">
        <h3 className="deal-title">{promocao.titulo}</h3>
        
        {categoria && (
          <span className="deal-category">{categoria.nome}</span>
        )}
        
        <div className="deal-prices">
          <span className="deal-price-original">{formatPrice(promocao.precoOriginal)}</span>
          <span className="deal-price-offer">{formatPrice(promocao.precoOferta)}</span>
        </div>
        
        <a 
          href={promocao.linkOferta}
          target="_blank"
          rel="noopener noreferrer"
          className="deal-button"
        >
          Ver Oferta
        </a>
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
        axios.get(`${API}/promocoes`, {
          params: {
            ordenar_por: sortBy,
            categoria_id: categoryFilter || undefined
          }
        }),
        axios.get(`${API}/categorias`)
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
      const response = await axios.get(`${API}/categorias`);
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
            href="https://wa.me/"
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
            href="https://t.me/"
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

// Create/Edit Offer Form Component
const OfferForm = ({ offer, onSave, onCancel, categorias }) => {
  const [formData, setFormData] = useState({
    titulo: offer?.titulo || '',
    imagemProduto: offer?.imagemProduto || '',
    precoOriginal: offer?.precoOriginal || '',
    precoOferta: offer?.precoOferta || '',
    linkOferta: offer?.linkOferta || '',
    categoria_id: offer?.categoria_id || '',
    ativo: offer?.ativo !== undefined ? offer.ativo : true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        ...formData,
        precoOriginal: parseFloat(formData.precoOriginal),
        precoOferta: parseFloat(formData.precoOferta)
      };

      if (offer) {
        // Update existing offer
        await axios.put(`${API}/promocoes/${offer.id}`, data);
      } else {
        // Create new offer
        await axios.post(`${API}/promocoes`, data);
      }

      onSave();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erro ao salvar oferta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offer-form-container">
      <div className="offer-form-card">
        <h2>{offer ? 'Editar Oferta' : 'Nova Oferta'}</h2>
        
        <form onSubmit={handleSubmit} className="offer-form">
          <div className="form-group">
            <label htmlFor="titulo">Título da Oferta:</label>
            <input
              type="text"
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              required
              className="form-input"
              placeholder="Ex: Smart TV 50' 4K Samsung"
            />
          </div>

          <div className="form-group">
            <label htmlFor="imagemProduto">URL da Imagem:</label>
            <input
              type="url"
              id="imagemProduto"
              value={formData.imagemProduto}
              onChange={(e) => setFormData({...formData, imagemProduto: e.target.value})}
              required
              className="form-input"
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precoOriginal">Preço Original (R$):</label>
              <input
                type="number"
                step="0.01"
                id="precoOriginal"
                value={formData.precoOriginal}
                onChange={(e) => setFormData({...formData, precoOriginal: e.target.value})}
                required
                className="form-input"
                placeholder="2499.99"
              />
            </div>

            <div className="form-group">
              <label htmlFor="precoOferta">Preço da Oferta (R$):</label>
              <input
                type="number"
                step="0.01"
                id="precoOferta"
                value={formData.precoOferta}
                onChange={(e) => setFormData({...formData, precoOferta: e.target.value})}
                required
                className="form-input"
                placeholder="1799.99"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="linkOferta">Link da Oferta:</label>
            <input
              type="url"
              id="linkOferta"
              value={formData.linkOferta}
              onChange={(e) => setFormData({...formData, linkOferta: e.target.value})}
              required
              className="form-input"
              placeholder="https://loja.com/produto"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="categoria_id">Categoria:</label>
              <select
                id="categoria_id"
                value={formData.categoria_id}
                onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                required
                className="form-select"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                  className="form-checkbox"
                />
                Oferta ativa
              </label>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onCancel}
              className="cancel-btn"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="save-btn"
            >
              {loading ? 'Salvando...' : (offer ? 'Atualizar' : 'Criar Oferta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [promocoes, setPromocoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
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
        axios.get(`${API}/promocoes`, { params: { ativo: null } }),
        axios.get(`${API}/categorias`)
      ]);
      
      setPromocoes(promocoesRes.data);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewOffer = () => {
    setEditingOffer(null);
    setShowOfferForm(true);
  };

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
    setShowOfferForm(true);
  };

  const handleDeleteOffer = async (offerId) => {
    if (window.confirm('Tem certeza que deseja excluir esta oferta?')) {
      try {
        await axios.delete(`${API}/promocoes/${offerId}`);
        fetchData(); // Refresh data
        alert('Oferta excluída com sucesso!');
      } catch (error) {
        alert('Erro ao excluir oferta: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleOfferSave = () => {
    setShowOfferForm(false);
    setEditingOffer(null);
    fetchData(); // Refresh data
    alert('Oferta salva com sucesso!');
  };

  const handleOfferCancel = () => {
    setShowOfferForm(false);
    setEditingOffer(null);
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
    return null; // Will redirect to login
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (showOfferForm) {
    return (
      <OfferForm
        offer={editingOffer}
        onSave={handleOfferSave}
        onCancel={handleOfferCancel}
        categorias={categorias}
      />
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
        <button 
          onClick={handleNewOffer}
          className="admin-action-btn primary"
        >
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
                    <td>R$ {promocao.precoOferta.toFixed(2)}</td>
                    <td className="discount-cell">{promocao.percentualDesconto}%</td>
                    <td>
                      <span className={`status-badge ${promocao.ativo ? 'active' : 'inactive'}`}>
                        {promocao.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleEditOffer(promocao)}
                        className="action-btn edit"
                      >
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