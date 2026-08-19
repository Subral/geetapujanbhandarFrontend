import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import AdminLayout from '../../components/AdminLayout';
import StatusPill from '../../components/admin/StatusPill';
import OrderDetailDrawer from '../../components/admin/OrderDetailDrawer';
import { Download } from 'lucide-react';
import { Button } from '../../components/ui/button';

// Ported from order_management_geeta_pujan_bhandar (Stitch canvas).
//
// The source design is a compact table + slide-in drawer, which scales to
// the "1,284 orders" the mock implies far better than the previous
// implementation's one-expanded-card-per-order layout (which had no
// pagination at all — every filtered order rendered inline, unbounded).
// All existing functionality is preserved, just relocated:
//   - status update dropdown  -> now inside the drawer
//   - WhatsApp / print invoice -> now drawer action buttons
//   - cancellation reason      -> now the drawer's status banner
//   - CSV export, status tabs+counts -> kept as-is, both are real
//     working features the mockup didn't know about and shouldn't lose
// Added on top of the design: the status-tabs-with-counts UI (real data,
// more informative than a plain dropdown) sits alongside the new
// date-range chips, and real client-side pagination (design shows page
// controls but the source app never paginated).

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const DATE_RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

const shortId = (id = '') => `#${id.slice(-8).toUpperCase()}`;
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const AdminOrders = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { setPage(1); }, [activeTab, dateRange]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/admin/orders`, authHeaders());
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status?order_status=${status}`, {}, authHeaders());
      toast.success('Order status updated');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: status } : o)));
      setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, order_status: status } : prev));
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const exportCSV = async () => {
    try {
      const res = await axios.get(`${API}/admin/orders/export`, { ...authHeaders(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const whatsappCustomer = (order) => {
    const phone = order.address?.phone?.replace(/\D/g, '');
    if (!phone) { toast.error('No phone number on this order'); return; }
    const msg = encodeURIComponent(
      `Namaste ${order.address?.name || ''} 🙏\n\nYour order ${order.invoice_no || shortId(order.id)} from Geeta Pujan Bhandar is *${order.order_status}*.\nTotal: ₹${order.total.toLocaleString('en-IN')}\n\nThank you for shopping with us!`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  const printInvoice = (order) => {
    const rows = order.items.map((i) =>
      `<tr><td style="padding:6px;border-bottom:1px solid #eee;">${i.name}</td><td style="padding:6px;text-align:center;border-bottom:1px solid #eee;">${i.quantity}</td><td style="padding:6px;text-align:right;border-bottom:1px solid #eee;">₹${i.price.toLocaleString()}</td><td style="padding:6px;text-align:right;border-bottom:1px solid #eee;">₹${(i.price * i.quantity).toLocaleString()}</td></tr>`
    ).join('');
    const subtotal = order.subtotal ?? order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const w = window.open('', '_blank', 'width=800,height=900');
    w.document.write(`<html><head><title>Invoice ${order.invoice_no || ''}</title></head>
      <body style="font-family:Arial,sans-serif;padding:32px;color:#2D2420;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <h1 style="color:#E53935;margin:0;">Geeta Pujan Bhandar</h1>
            <p style="font-size:12px;color:#666;margin:4px 0;">Latouche Road Plaza, First Floor, 92/77, Latouche Rd, Lucknow - 226018<br/>Phone: +91 9506711777</p>
          </div>
          <div style="text-align:right;">
            <h2 style="margin:0;">INVOICE</h2>
            <p style="font-size:12px;margin:4px 0;">${order.invoice_no || shortId(order.id)}<br/>${new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <hr style="border:none;border-top:2px solid #E53935;margin:16px 0;"/>
        <p style="font-size:13px;"><strong>Bill To:</strong><br/>${order.address?.name || ''}<br/>${order.address?.address_line || ''}, ${order.address?.area || ''}<br/>${order.address?.city || 'Lucknow'} - ${order.address?.pincode || ''}<br/>Phone: ${order.address?.phone || ''}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
          <thead><tr style="background:#FFF5F5;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;">Qty</th><th style="padding:8px;text-align:right;">Price</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:16px;text-align:right;font-size:13px;">
          <p>Subtotal: ₹${subtotal.toLocaleString()}</p>
          ${order.discount ? `<p>Discount${order.promo_code ? ` (${order.promo_code})` : ''}: -₹${order.discount.toLocaleString()}</p>` : ''}
          ${order.delivery_fee ? `<p>Delivery: ₹${order.delivery_fee.toLocaleString()}</p>` : '<p>Delivery: FREE</p>'}
          <h3 style="color:#E53935;">Total: ₹${order.total.toLocaleString()}</h3>
          <p style="font-size:11px;color:#666;">Payment: ${order.payment_method?.toUpperCase()} (${order.payment_status})</p>
        </div>
        <p style="text-align:center;font-size:11px;color:#999;margin-top:32px;">Thank you for shopping with Geeta Pujan Bhandar 🙏</p>
        <script>window.onload = () => window.print();</script>
      </body></html>`);
    w.document.close();
  };

  const openOrder = (order) => { setSelectedOrder(order); setDrawerOpen(true); };

  const inDateRange = (order) => {
    if (dateRange === 'all') return true;
    const created = new Date(order.created_at);
    const now = new Date();
    const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return created >= cutoff;
  };

  const filtered = useMemo(() => {
    return orders
      .filter((o) => activeTab === 'all' || o.order_status === activeTab)
      .filter(inDateRange)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, activeTab, dateRange]);

  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key === 'all' ? orders.length : orders.filter((o) => o.order_status === tab.key).length;
    return acc;
  }, {});

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statCards = [
    { label: 'Total Orders', value: orders.length, icon: 'receipt_long', bg: 'bg-adm-primary-container/10', color: 'text-adm-primary' },
    { label: 'Processing', value: counts.pending + counts.confirmed, icon: 'pending', bg: 'bg-adm-secondary-container/40', color: 'text-adm-secondary' },
    { label: 'Shipped', value: counts.shipped, icon: 'local_shipping', bg: 'bg-blue-100', color: 'text-blue-700' },
    {
      label: 'Delivered Today',
      value: orders.filter((o) => o.order_status === 'delivered' && new Date(o.created_at).toDateString() === new Date().toDateString()).length,
      icon: 'check_circle', bg: 'bg-green-100', color: 'text-green-700',
    },
  ];

  return (
    <AdminLayout user={user} onLogout={onLogout} searchPlaceholder="Search orders, customers...">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl text-adm-on-surface">Order Management</h1>
          <p className="text-sm text-adm-on-surface-variant mt-1">Console / <span className="text-adm-primary font-medium">Orders</span></p>
        </div>
        <Button variant="outline" onClick={exportCSV} data-testid="export-orders-csv" className="border-adm-outline-variant">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-adm-surface-container-lowest rounded-xl warm-shadow border border-adm-outline-variant/30 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-adm-on-surface-variant">{s.label}</p>
              <p className="text-2xl font-bold text-adm-on-surface mt-1">{loading ? '…' : s.value}</p>
            </div>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${s.bg}`}>
              <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Status tabs (real counts, kept from the working app) */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              activeTab === tab.key
                ? 'bg-adm-primary text-adm-on-primary border-adm-primary'
                : 'bg-adm-surface-container-lowest border-adm-outline-variant text-adm-on-surface-variant hover:border-adm-primary/40'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === tab.key ? 'bg-white/25' : 'bg-adm-surface-container text-adm-primary'}`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Date range chips */}
      <div className="flex gap-1">
        {DATE_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            className={`px-3 py-1.5 rounded-md font-label-md text-xs border transition-colors ${
              dateRange === r.key
                ? 'bg-adm-primary-container/10 text-adm-primary border-adm-primary/20'
                : 'text-adm-on-surface-variant border-transparent hover:bg-adm-surface-container'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-adm-surface-container-lowest rounded-xl warm-shadow border border-adm-outline-variant/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-adm-outline-variant/20">
          <p className="text-sm text-adm-on-surface-variant">
            Showing <span className="font-bold">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}</span> of {filtered.length} orders
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-adm-surface-container-low">
              <tr>
                <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant border-b border-adm-outline-variant/20">Order ID</th>
                <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant border-b border-adm-outline-variant/20">Customer</th>
                <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant border-b border-adm-outline-variant/20">Items</th>
                <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant border-b border-adm-outline-variant/20">Total Amount</th>
                <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant border-b border-adm-outline-variant/20">Status</th>
                <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant border-b border-adm-outline-variant/20">Date</th>
                <th className="px-6 py-4 font-label-md text-xs text-adm-on-surface-variant border-b border-adm-outline-variant/20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-outline-variant/10">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-adm-on-surface-variant">Loading orders…</td></tr>
              ) : pageOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-adm-on-surface-variant">
                  {activeTab === 'cancelled' ? 'No cancelled orders' : 'No orders found'}
                </td></tr>
              ) : (
                pageOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-adm-surface-container-low/50 transition-colors row-interactive">
                    <td className="px-6 py-4 font-bold text-adm-primary text-sm">{shortId(order.id)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-adm-secondary-container flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {initials(order.address?.name)}
                        </div>
                        <div>
                          <p className="text-sm">{order.address?.name || 'Guest'}</p>
                          <p className="text-xs text-adm-on-surface-variant">{order.address?.city}, {order.address?.pincode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{order.items?.length} item{order.items?.length === 1 ? '' : 's'}</td>
                    <td className="px-6 py-4 font-bold text-sm">₹{order.total?.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4"><StatusPill status={order.order_status} size="sm" /></td>
                    <td className="px-6 py-4 text-sm text-adm-on-surface-variant">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openOrder(order)}
                        className="p-1.5 rounded-full hover:bg-adm-surface-container text-adm-primary transition-colors"
                        aria-label="View order"
                        data-testid={`view-order-${order.id}`}
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-adm-outline-variant/20">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-adm-on-surface-variant hover:bg-adm-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span> Previous
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-adm-on-surface-variant">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${
                        p === page ? 'bg-adm-primary text-adm-on-primary font-bold' : 'hover:bg-adm-surface-container text-adm-on-surface-variant'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-adm-on-surface-variant hover:bg-adm-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={updateOrderStatus}
        onWhatsApp={whatsappCustomer}
        onPrint={printInvoice}
      />
    </AdminLayout>
  );
};

export default AdminOrders;
