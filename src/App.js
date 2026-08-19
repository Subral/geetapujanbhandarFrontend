import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingScreen from './components/LoadingScreen';
import Home from './pages/Home';
import Heritage from './pages/Heritage';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Wishlist from './pages/Wishlist';
import NotFound from './pages/NotFound';
import LoginGate from './pages/LoginGate';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOffers from './pages/admin/AdminOffers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import ReturnPolicy from './pages/ReturnPolicy';
import AdminBanners from './pages/admin/AdminBanners';
import Profile from './pages/Profile';

import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Branded placeholder for any product image that fails to load — keeps card
// layouts intact instead of showing the browser's broken-image icon.
const IMG_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#FFF5F5"/>
    <text x="200" y="185" font-size="72" text-anchor="middle">\u{1FAB7}</text>
    <text x="200" y="245" font-size="18" text-anchor="middle" fill="#8C7E76" font-family="sans-serif">Image coming soon</text>
  </svg>`
);

function App() {
  // Catch failed <img> loads site-wide (capture phase) and swap in the placeholder
  useEffect(() => {
    const onImgError = (e) => {
      const t = e.target;
      if (t && t.tagName === 'IMG' && t.src !== IMG_PLACEHOLDER) {
        t.src = IMG_PLACEHOLDER;
      }
    };
    window.addEventListener('error', onImgError, true);
    return () => window.removeEventListener('error', onImgError, true);
  }, []);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoading');
    if (hasSeenLoading) {
      setShowLoading(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasSeenLoading', 'true');
    setShowLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  // AuthDialog (rendered from five different, unrelated components — see
  // its own header comment) can't reach setUser directly, and used to
  // call window.location.reload() instead, destroying whatever the page
  // was doing. It now dispatches this event after writing localStorage;
  // this is the one place that turns that into a real state update.
  useEffect(() => {
    const handler = (e) => setUser(e.detail);
    window.addEventListener('gpb:auth-changed', handler);
    return () => window.removeEventListener('gpb:auth-changed', handler);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading || showLoading) {
    return showLoading ? <LoadingScreen onLoadingComplete={handleLoadingComplete} /> : null;
  }

  return (
    <div className="App min-h-screen flex flex-col" style={{ background: '#FFFCF8' }}>
      <BrowserRouter>
        <AppContent user={user} handleLogin={handleLogin} handleLogout={handleLogout} />
      </BrowserRouter>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function AppContent({ user, handleLogin, handleLogout }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  // Real bug found via an actual browser render check, not caught by
  // static analysis: the Navbar/Footer gating below used to check only
  // `user?.role !== 'admin'`. When nobody is logged in yet, `user` is
  // null, so `null?.role !== 'admin'` is trivially true — meaning the
  // storefront's customer-facing header and footer rendered around the
  // Admin Login page itself (the one admin route reachable with no user
  // at all). Gating on the actual path fixes it regardless of auth state.
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart count whenever user or route changes
  useEffect(() => {
    const fetchCartCount = async () => {
      if (!user) {
        setCartCount(0);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const count = (response.data.items || []).reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
      } catch (error) {
        setCartCount(0);
      }
    };
    fetchCartCount();
  }, [user, location.pathname]);

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute && !isHomePage && <Navbar user={user} onLogout={handleLogout} cartCount={cartCount} />}
      {!isAdminRoute && isHomePage && (
        <div className="hidden md:block">
          <Navbar user={user} onLogout={handleLogout} cartCount={cartCount} />
        </div>
      )}
      <Toaster position="top-center" richColors />
      <div className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/heritage" element={<Heritage />} />
          <Route path="/products" element={<Products user={user} />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/products/:id" element={<ProductDetail user={user} />} />
          <Route path="/cart" element={user ? <Cart user={user} /> : <LoginGate />} />
          <Route path="/checkout" element={user ? <Checkout user={user} /> : <LoginGate />} />
          <Route path="/orders" element={user ? <Orders user={user} /> : <LoginGate />} />
          <Route path="/orders/:id" element={user ? <OrderDetail user={user} /> : <LoginGate />} />
          <Route path="/wishlist" element={user ? <Wishlist user={user} /> : <LoginGate />} />
          <Route path="/profile" element={user ? <Profile user={user} onLogout={handleLogout} /> : <LoginGate />} />

          <Route path="/admin/login" element={<AdminLogin onLogin={handleLogin} />} />
          <Route path="/admin/dashboard" element={user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/admin/login" />} />
          <Route path="/admin/products" element={user?.role === 'admin' ? <AdminProducts user={user} onLogout={handleLogout} /> : <Navigate to="/admin/login" />} />
          <Route path="/admin/categories" element={user?.role === 'admin' ? <AdminCategories user={user} onLogout={handleLogout} /> : <Navigate to="/admin/login" />} />
          <Route path="/admin/offers" element={user?.role === 'admin' ? <AdminOffers user={user} onLogout={handleLogout} /> : <Navigate to="/admin/login" />} />
          <Route path="/admin/banners" element={user?.role === 'admin' ? <AdminBanners user={user} onLogout={handleLogout} /> : <Navigate to="/admin/login" />} />
          <Route path="/admin/analytics" element={user?.role === 'admin' ? <AdminAnalytics user={user} onLogout={handleLogout} /> : <Navigate to="/admin/login" />} />
          <Route path="/admin/orders" element={user?.role === 'admin' ? <AdminOrders user={user} onLogout={handleLogout} /> : <Navigate to="/admin/login" />} />

          {/* Catch-all — must stay last. No route previously existed for
              this at all; any unmatched URL rendered nothing. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!isAdminRoute && (
        <>
          <Footer />
          <BottomNav user={user} cartCount={cartCount} />
        </>
      )}
    </>
  );
}

export default App;