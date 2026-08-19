import { Link, useLocation } from 'react-router-dom';
import {
  Grid3x3, Tag, Image, LogOut, Search,
} from 'lucide-react';
import '../styles/admin-theme.css';

// Ported from the four Stitch canvases (admin_dashboard, order_management,
// inventory_management, analytics_reports_animated_dashboard) — all four
// used an identical sidebar (Dashboard / Inventory / Orders / Analytics)
// and a near-identical header. Standardized on the richer header pattern
// from analytics_reports_animated_dashboard (search + notification +
// settings + profile) since the other three screens' headers were subsets
// of it, not different designs.
//
// SCOPE NOTE: the four Stitch screens don't cover Categories, Offers, or
// Banners. Those pages still exist and are still linked below (so nothing
// in the working app becomes unreachable) but keep their current visual
// treatment until a design exists for them — flagged, not silently patched.

const PRIMARY_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', materialIcon: 'dashboard' },
  { path: '/admin/products', label: 'Inventory', materialIcon: 'inventory_2' },
  { path: '/admin/orders', label: 'Orders', materialIcon: 'shopping_cart' },
  { path: '/admin/analytics', label: 'Analytics', materialIcon: 'analytics' },
];

// No corresponding Stitch design yet — kept reachable, unstyled by this round.
const SECONDARY_NAV = [
  { path: '/admin/categories', label: 'Categories', icon: Grid3x3 },
  { path: '/admin/offers', label: 'Offers', icon: Tag },
  { path: '/admin/banners', label: 'Banners', icon: Image },
];

const AdminLayout = ({ children, user, onLogout, searchPlaceholder = 'Search devotees or orders...' }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="admin-shell min-h-screen">
      {/* ---------------------------------------------------------- */}
      {/* Sidebar                                                     */}
      {/* ---------------------------------------------------------- */}
      <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-adm-surface-container-low border-r border-adm-outline-variant z-50">
        <div className="p-6">
          <h1 className="font-headline-md text-xl text-adm-primary font-bold leading-tight">
            Geeta Pujan Bhandar
          </h1>
          <p className="font-label-md text-xs text-adm-on-surface-variant mt-1">Admin Console</p>
        </div>

        <nav className="flex-1 mt-4 overflow-y-auto custom-scrollbar">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-6 py-3 transition-colors duration-200 ${
                  active
                    ? 'text-adm-primary font-bold border-r-4 border-adm-primary bg-adm-primary-container/10'
                    : 'text-adm-on-surface-variant hover:bg-adm-surface-container-highest'
                }`}
              >
                <span className="material-symbols-outlined">{item.materialIcon}</span>
                <span className="font-label-md text-sm">{item.label}</span>
              </Link>
            );
          })}

          <div className="mx-6 my-3 h-px bg-adm-outline-variant/40" />

          {SECONDARY_NAV.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-6 py-3 transition-colors duration-200 ${
                  active
                    ? 'text-adm-primary font-bold border-r-4 border-adm-primary bg-adm-primary-container/10'
                    : 'text-adm-on-surface-variant hover:bg-adm-surface-container-highest'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-label-md text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-adm-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-adm-primary-container/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-adm-primary">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-sm font-bold truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-adm-on-surface-variant">Store Owner</p>
          </div>
          <button
            onClick={onLogout}
            data-testid="admin-logout-button"
            aria-label="Log out"
            className="p-2 rounded-full hover:bg-adm-surface-container-highest transition-colors text-adm-on-surface-variant"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------------- */}
      {/* Header                                                      */}
      {/* ---------------------------------------------------------- */}
      <header className="fixed top-0 left-64 right-0 flex justify-between items-center px-6 h-16 bg-adm-surface shadow-sm z-40">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-adm-on-surface-variant" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full bg-adm-surface-container border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-adm-primary/20 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-adm-surface-variant/50 rounded-full transition-all active:scale-90 duration-150 hover-pulse text-adm-on-surface-variant"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined block">notifications</span>
          </button>
          <button
            className="p-2 hover:bg-adm-surface-variant/50 rounded-full transition-all active:scale-90 duration-150 hover-spin text-adm-on-surface-variant"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined block">settings</span>
          </button>
          <div className="w-px h-8 bg-adm-outline-variant/30 mx-2" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-label-md text-sm font-bold">{user?.name || 'Admin'}</p>
              <p className="text-xs text-adm-on-surface-variant">Store Owner</p>
            </div>
            <div className="w-9 h-9 rounded-full border-2 border-adm-primary/20 bg-adm-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-adm-primary text-lg">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Content                                                     */}
      {/* ---------------------------------------------------------- */}
      <main className="ml-64 pt-16 min-h-screen bg-adm-background">
        <div className="max-w-[1200px] mx-auto p-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
