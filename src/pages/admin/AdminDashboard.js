import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import StatusPill from '../../components/admin/StatusPill';
import OrderDetailDrawer from '../../components/admin/OrderDetailDrawer';
import { MessageCircle } from 'lucide-react';

// Ported from admin_dashboard_geeta_pujan_bhandar (Stitch canvas).
//
// DATA FIDELITY NOTES — read before changing the wiring below:
//  - KPI cards, Recent Orders: wired to real /admin/stats and /admin/orders.
//  - "Top Sacred Items" in the source design is a bestseller list with unit
//    counts (e.g. "124 units sold"). The backend has no bestseller/units-sold
//    aggregation, so rather than inventing numbers, that panel's slot is used
//    for the existing Low Stock alert (real data, already fetched by this
//    page pre-redesign) — same visual treatment, honest content.
//  - Abandoned Carts + WhatsApp nudge is a working feature in the current
//    app with no equivalent anywhere in the four Stitch screens. It is kept
//    below the fold in the new visual language rather than dropped, since
//    the instruction was to port the *design*, not to regress functionality
//    the mockup simply never knew about.
//  - The "Devotee Insights Ready" banner references predictive analytics
//    that don't exist yet. Kept as a visual (zero functional risk) but
//    repointed at the real Analytics page instead of a fictional one.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AVATAR_COLORS = ['bg-adm-secondary-container', 'bg-adm-primary-container/20', 'bg-adm-tertiary-fixed'];

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const shortId = (id = '') => `#${id.slice(-8).toUpperCase()}`;

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState([]);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchAlerts();
    fetchRecentOrders();
    fetchTopProducts();
  }, []);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/stats`, authHeaders());
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const [productsRes, cartsRes] = await Promise.all([
        axios.get(`${API}/products?limit=500`),
        axios.get(`${API}/admin/abandoned-carts`, authHeaders()),
      ]);
      setLowStock(productsRes.data.filter((pr) => pr.stock < 5).sort((a, b) => a.stock - b.stock));
      setAbandonedCarts(cartsRes.data.slice(0, 6));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const res = await axios.get(`${API}/admin/orders`, authHeaders());
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setRecentOrders(sorted.slice(0, 6));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    }
  };

  const fetchTopProducts = async () => {
    try {
      // /admin/analytics also returns real bestsellers (units, revenue,
      // stock) for the last 30 days — used below for "Top Sacred Items"
      // instead of inventing sales figures the backend doesn't track.
      const res = await axios.get(`${API}/admin/analytics`, { ...authHeaders(), params: { days: 30 } });
      setTopProducts((res.data.top_products || []).slice(0, 4));
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  const nudgeCustomer = (cart) => {
    const phone = (cart.phone || '').replace(/\D/g, '');
    if (!phone) return;
    const msg = encodeURIComponent(
      `Namaste ${cart.user_name} 🙏\n\nYou left some divine items waiting in your cart at Geeta Pujan Bhandar (worth ₹${cart.cart_value.toLocaleString()}):\n${cart.items.slice(0, 3).join(', ')}\n\nComplete your order today — we deliver across Lucknow!`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  const openOrder = (order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const kpis = [
    {
      label: 'Total Blessings (Orders)', value: stats?.total_orders ?? '—',
      icon: 'receipt_long', accent: 'border-adm-primary',
      footer: 'Last 30 days', footerIcon: 'schedule',
    },
    {
      label: 'Sacred Revenue', value: stats ? `₹${stats.total_revenue.toLocaleString('en-IN')}` : '—',
      icon: 'currency_rupee', accent: 'border-adm-secondary',
      footer: 'All-time', footerIcon: 'trending_up',
    },
    {
      label: 'Registered Devotees', value: stats?.total_users ?? '—',
      icon: 'group', accent: 'border-adm-primary/40',
      footer: 'All-time', footerIcon: 'person_add',
    },
    {
      label: 'Active Listings', value: stats?.total_products ?? '—',
      icon: 'category', accent: 'border-adm-secondary/40',
      footer: 'Live on storefront', footerIcon: 'list_alt',
    },
  ];

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      {/* Welcome header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl text-adm-on-surface">Blessings &amp; Insights</h1>
          <p className="font-body-md text-adm-on-surface-variant mt-1">
            Welcome back to the Sacred Console. Here is your store's health today.
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-adm-surface-container-lowest p-6 rounded-xl border-t-4 ${kpi.accent} warm-shadow relative overflow-hidden group`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-4xl">{kpi.icon}</span>
            </div>
            <p className="font-label-md text-xs text-adm-on-surface-variant uppercase tracking-wider">
              {kpi.label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-md text-2xl text-adm-on-surface">
                {loading ? '…' : kpi.value}
              </span>
            </div>
            <p className="text-xs text-adm-on-surface-variant mt-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">{kpi.footerIcon}</span> {kpi.footer}
            </p>
          </div>
        ))}
      </div>

      {/* Top Sacred Items — real bestsellers from /admin/analytics, not
          sample data. Design called this panel out specifically; the
          numbers here are genuine (last 30 days), unlike the source
          mockup's invented "124 units sold" style figures. */}
      {topProducts.length > 0 && (
        <div className="bg-adm-surface-container-lowest rounded-xl warm-shadow overflow-hidden border border-adm-outline-variant/30">
          <div className="p-6 border-b border-adm-outline-variant/20 bg-adm-surface-container-low/30">
            <h3 className="font-headline-sm text-lg text-adm-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-adm-secondary">star</span> Top Sacred Items
              <span className="text-xs font-normal text-adm-on-surface-variant">(last 30 days)</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-adm-outline-variant/10">
            {topProducts.map((p) => (
              <div key={p.product_id} className="flex items-center gap-3 p-4 hover:bg-adm-surface-container-low transition-colors group">
                <div className="w-14 h-14 rounded-md overflow-hidden bg-adm-surface-container flex-shrink-0">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-adm-on-surface truncate">{p.name}</h4>
                  <p className="text-xs text-adm-on-surface-variant">{p.units} units sold</p>
                  <p className="font-bold text-adm-primary text-sm">₹{p.revenue.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders + Inventory Watch (low stock — a working feature
          the source mockup had no equivalent for, kept in this slot) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-adm-surface-container-lowest rounded-xl warm-shadow overflow-hidden border border-adm-outline-variant/30">
          <div className="p-6 border-b border-adm-outline-variant/20 flex justify-between items-center bg-adm-surface-container-low/30">
            <h3 className="font-headline-sm text-lg text-adm-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-adm-primary">receipt_long</span> Recent Orders
            </h3>
            <Link to="/admin/orders" className="text-adm-primary font-bold text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-adm-surface-container-high/20 border-b border-adm-outline-variant/10">
                  <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Order ID</th>
                  <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Devotee</th>
                  <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Date</th>
                  <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Amount</th>
                  <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant uppercase text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-outline-variant/10">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-adm-on-surface-variant">
                      {loading ? 'Loading recent orders…' : 'No orders yet.'}
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order, i) => (
                    <tr
                      key={order.id}
                      className="hover:bg-adm-surface-container-low/50 transition-colors row-interactive cursor-pointer"
                      onClick={() => openOrder(order)}
                    >
                      <td className="px-6 py-4 font-medium text-sm">{shortId(order.id)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}>
                            {initials(order.address?.name)}
                          </div>
                          <span className="text-sm">{order.address?.name || 'Guest'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-adm-on-surface-variant">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-sm">₹{order.total?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusPill status={order.order_status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Watch — real low-stock data */}
        <div className="bg-adm-surface-container-lowest rounded-xl warm-shadow overflow-hidden border border-adm-outline-variant/30">
          <div className="p-6 border-b border-adm-outline-variant/20 bg-adm-surface-container-low/30">
            <h3 className="font-headline-sm text-lg text-adm-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-adm-secondary">inventory_2</span> Inventory Watch
            </h3>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {lowStock.length === 0 ? (
              <p className="text-sm text-adm-on-surface-variant p-3">All products are well stocked 🎉</p>
            ) : (
              lowStock.slice(0, 6).map((pr) => (
                <div key={pr.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-adm-surface-container-low transition-colors group">
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-adm-surface-container flex-shrink-0">
                    <img
                      src={pr.image}
                      alt={pr.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-adm-on-surface truncate">{pr.name}</h4>
                    <p className="text-xs text-adm-on-surface-variant">₹{pr.price?.toLocaleString('en-IN')}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                      pr.stock === 0 ? 'bg-adm-error-container text-adm-on-error-container' : 'bg-adm-secondary-container/40 text-adm-secondary'
                    }`}
                  >
                    {pr.stock === 0 ? 'Out of stock' : `${pr.stock} left`}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="p-4 bg-adm-surface-container-low/50">
            <Link
              to="/admin/products"
              className="w-full block text-center py-2 border border-adm-primary/30 text-adm-primary font-bold rounded-lg hover:bg-adm-primary hover:text-adm-on-primary transition-all duration-300"
            >
              Manage Inventory
            </Link>
          </div>
        </div>
      </div>

      {/* Abandoned carts — kept from the working app; no Stitch equivalent */}
      <div className="bg-adm-surface-container-lowest rounded-xl warm-shadow overflow-hidden border border-adm-outline-variant/30">
        <div className="p-6 border-b border-adm-outline-variant/20 bg-adm-surface-container-low/30 flex items-center justify-between">
          <h3 className="font-headline-sm text-lg text-adm-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-adm-primary">shopping_cart</span> Abandoned Carts (24h+)
          </h3>
          <span className="text-xs text-adm-on-surface-variant">Nudge devotees on WhatsApp to recover lost sales</span>
        </div>
        <div className="p-4">
          {abandonedCarts.length === 0 ? (
            <p className="text-sm text-adm-on-surface-variant p-3">No abandoned carts right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {abandonedCarts.map((cart, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-adm-surface-container-low transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cart.user_name || cart.email}</p>
                    <p className="text-xs text-adm-on-surface-variant truncate">
                      {cart.items.slice(0, 2).join(', ')}{cart.items.length > 2 ? '…' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-adm-primary">₹{cart.cart_value.toLocaleString('en-IN')}</span>
                    {cart.phone && (
                      <button
                        onClick={() => nudgeCustomer(cart)}
                        className="p-1.5 rounded-full border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                        title="Send WhatsApp reminder"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Operational insights banner */}
      <div className="bg-gradient-to-r from-adm-primary to-adm-primary-container p-8 rounded-2xl text-adm-on-primary flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        <div className="relative z-10 text-center md:text-left">
          <h3 className="font-headline-md text-xl mb-2">Store Insights</h3>
          <p className="opacity-90 max-w-lg">
            {stats?.pending_orders > 0
              ? `You have ${stats.pending_orders} pending orders to process.`
              : 'Track revenue trends, order status, and category performance in one place.'}
          </p>
        </div>
        <Link
          to="/admin/analytics"
          className="relative z-10 px-6 py-3 bg-adm-on-primary text-adm-primary font-bold rounded-lg hover:opacity-90 transition-all flex-shrink-0"
        >
          View Analytics
        </Link>
      </div>

      <OrderDetailDrawer order={selectedOrder} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </AdminLayout>
  );
};

export default AdminDashboard;
