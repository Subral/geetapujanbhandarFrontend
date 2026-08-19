import { Link, useLocation } from 'react-router-dom';
import { Home, User, ShoppingCart, HeadphonesIcon, Package } from 'lucide-react';
import { useState } from 'react';
import SupportDialog from './SupportDialog';
import AuthDialog from './AuthDialog';

const BottomNav = ({ user, cartCount }) => {
  const location = useLocation();
  const [showSupport, setShowSupport] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleNavClick = (e, requiresAuth, action) => {
    if (requiresAuth && !user) {
      e.preventDefault();
      setShowAuth(true);
      return;
    }
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const navItems = [
    { 
      name: 'Home', 
      path: '/', 
      icon: Home,
      testId: 'bottom-nav-home'
    },
    { 
      name: 'You', 
      path: '/profile', 
      icon: User,
      testId: 'bottom-nav-you',
      requiresAuth: true
    },
    { 
      name: 'Cart', 
      path: '/cart', 
      icon: ShoppingCart,
      badge: cartCount,
      testId: 'bottom-nav-cart',
      requiresAuth: true
    },
    { 
      name: 'Support', 
      path: '#', 
      icon: HeadphonesIcon,
      testId: 'bottom-nav-support',
      action: () => setShowSupport(true)
    },
    { 
      name: 'Orders', 
      path: '/orders', 
      icon: Package,
      testId: 'bottom-nav-orders',
      requiresAuth: true
    }
  ];

  return (
    <>
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E6D5C3] shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={(e) => handleNavClick(e, item.requiresAuth, item.action)}
                className="flex flex-col items-center justify-center gap-1 relative"
                data-testid={item.testId}
              >
                <div className="relative">
                  <Icon 
                    className="h-5 w-5" 
                    style={{ color: isActive ? '#E53935' : '#8C7E76' }}
                  />
                  {item.badge > 0 && (
                    <span 
                      className="absolute -top-2 -right-2 bg-[#E53935] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center"
                      style={{ fontSize: '10px' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span 
                  className="text-xs font-medium"
                  style={{ color: isActive ? '#E53935' : '#8C7E76' }}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      {showSupport && <SupportDialog open={showSupport} onClose={() => setShowSupport(false)} />}
      {showAuth && <AuthDialog open={showAuth} onClose={() => setShowAuth(false)} />}
    </>
  );
};

export default BottomNav;
