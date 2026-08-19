import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Heart, HeadphonesIcon, Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AuthDialog from './AuthDialog';
import SupportDialog from './SupportDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Unified header — ported from the finalized 22-screen Stitch canvas set.
// Every screen used this exact same nav: Collections · Deities · Puja Kits
// · Incense · Books · Heritage. All real logic below (cart count fetch,
// search-and-navigate, AuthDialog/SupportDialog) is unchanged from before —
// only the visual layer and the nav item list were rebuilt. The mobile
// branch (search toggle) is untouched: mobile is out of scope for this
// redesign, and mobile navigation is handled by the separate BottomNav
// component, not by this file's mobile fallback.

const NAV_LINKS = [
  { label: 'Collections', to: '/products' },
  { label: 'Deities', to: '/products?deity=all' },
  { label: 'Puja Kits', to: '/products?category=Pooja%20Kits' },
  { label: 'Incense', to: '/products?category=Incense' },
  { label: 'Books', to: '/products?category=Books' },
  { label: 'Heritage', to: '/heritage' },
];

const Navbar = ({ user, onLogout }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCartCount();
    }
  }, [user]);

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const count = response.data.items.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchExpanded(false);
      setSearchQuery('');
    }
  };

  const toggleSearch = () => {
    setSearchExpanded(!searchExpanded);
    if (searchExpanded) {
      setSearchQuery('');
    }
  };

  return (
    <div className="storefront-shell">
      <header className="bg-sf-surface/80 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-all duration-300 px-4 md:px-16 py-4 flex justify-between items-center w-full max-w-[1280px] mx-auto">
        <Link to="/" className={`flex items-center gap-3 ${searchExpanded ? 'hidden md:flex' : 'flex'}`}>
          <img
            src="https://customer-assets.emergentagent.com/job_2b9c1f6e-f9fc-4bc2-ad8d-3f79bfc7556c/artifacts/y7vt3g8x_logo.jpeg"
            alt="Geeta Pujan Bhandar"
            className="h-10 w-10 md:h-11 md:w-11 rounded-full"
          />
          <span className="font-headline-md text-lg md:text-xl font-bold text-sf-primary">
            Geeta Pujan Bhandar
          </span>
        </Link>

        {/* Mobile: expandable search — unchanged from before, out of scope */}
        <div className="md:hidden flex items-center gap-2 flex-1 justify-end">
          {searchExpanded ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 ml-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-sf-outline-variant rounded-full focus:outline-none focus:ring-2 focus:ring-sf-primary focus:border-transparent"
                  data-testid="mobile-search-input"
                />
              </div>
              <button type="button" onClick={toggleSearch} className="p-2" data-testid="close-search-button">
                <X className="h-5 w-5 text-sf-on-surface-variant" />
              </button>
            </form>
          ) : (
            <button onClick={toggleSearch} className="p-2" data-testid="mobile-search-button">
              <Search className="h-6 w-6 text-sf-primary" />
            </button>
          )}
        </div>

        {/* Desktop: unified nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-sf-on-surface-variant hover:text-sf-primary transition-colors font-body-md text-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex items-center bg-sf-surface-container-low px-4 py-2 rounded-full">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 outline-none text-sm w-32 lg:w-48 text-sf-on-surface placeholder:text-sf-on-surface-variant"
              data-testid="desktop-search-input"
            />
            <button type="submit" aria-label="Search">
              <Search className="h-4 w-4 text-sf-on-surface-variant hover:text-sf-primary transition-colors" />
            </button>
          </form>

          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-2 text-sf-on-surface-variant hover:text-sf-primary font-body-md text-sm transition-colors"
            data-testid="support-button"
          >
            <HeadphonesIcon className="h-4 w-4" />
            Support
          </button>

          {user ? (
            <Link to="/wishlist" data-testid="wishlist-icon">
              <Heart className="h-5 w-5 text-sf-on-surface-variant hover:text-sf-primary transition-colors" />
            </Link>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              aria-label="Sign in to view wishlist"
              data-testid="wishlist-icon-guest"
            >
              <Heart className="h-5 w-5 text-sf-on-surface-variant hover:text-sf-primary transition-colors" />
            </button>
          )}

          {/* Cart icon is always visible, even to guests — clicking it as
              a guest opens sign-in rather than hiding the icon entirely,
              matching how the Login Gate screen expects to be reached. */}
          {user ? (
            <Link to="/cart" className="relative" data-testid="cart-icon">
              <ShoppingCart className="h-5 w-5 text-sf-on-surface-variant hover:text-sf-primary transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-sf-primary text-sf-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="relative"
              aria-label="Sign in to view cart"
              data-testid="cart-icon-guest"
            >
              <ShoppingCart className="h-5 w-5 text-sf-on-surface-variant hover:text-sf-primary transition-colors" />
            </button>
          )}

          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-sf-primary/20 bg-sf-surface-container-low flex items-center justify-center"
              data-testid="profile-avatar-button"
            >
              {user?.picture ? (
                <img src={user.picture} alt={user.name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-sf-primary" />
              )}
            </button>
          ) : (
            <Button
              onClick={() => setShowAuth(true)}
              className="rounded-full px-6 bg-sf-primary text-sf-on-primary hover:opacity-90"
              data-testid="login-button"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      {showAuth && <AuthDialog open={showAuth} onClose={() => setShowAuth(false)} />}
      {showSupport && <SupportDialog open={showSupport} onClose={() => setShowSupport(false)} />}
    </div>
  );
};

export default Navbar;
