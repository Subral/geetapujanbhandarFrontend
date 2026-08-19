import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { Download } from 'lucide-react';
import { Button } from '../../components/ui/button';

// Ported from analytics_reports_animated_dashboard (Stitch canvas) — the
// richest animation system of the four screens: staggered fade-up entrance,
// kpi-card hover lift, animated progress-bar fills, bar-chart hover
// tooltips, donut-segment hover, and insight-card hover-slide. All of it
// is preserved via admin-theme.css; nothing here re-implements the motion
// with a different technique.
//
// DATA FIDELITY — every number below is real. The source mockup invented
// several metrics with no backend equivalent; rather than port fake data
// into a real admin console, each was mapped to something the API
// genuinely computes, or dropped:
//   - "New Customers" / "Customer Rating" KPIs -> no such metrics exist
//     (no signups-this-period counter, no order/product rating system).
//     Replaced with Avg Order Value and Units Sold, both real fields
//     already returned by /admin/analytics.
//   - "Sales Trends Over Time" bar chart -> wired to `monthly` (last 6
//     months revenue), which the endpoint already returns. Real.
//   - "Popular Categories" -> the mockup showed % of sales by category;
//     no such breakdown exists. Relabeled "Inventory by Category" and
//     wired to `product_report.by_category`, which is real (stock value
//     per category) — a different but genuine metric in the same slot.
//   - "Customer Demographics" donut (age brackets) -> no age data is ever
//     collected anywhere in this system. Replaced with `status_breakdown`
//     (order status mix), which is real and fits the same donut+legend
//     layout.
//   - "Performance Insights" -> the mockup's three cards were invented
//     recommendations ("Facebook ads for brass decor"). Replaced with
//     insights actually derived from `top_products` and `product_report`.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const DONUT_COLORS = ['#e53935', '#735c00', '#655a4c', '#906f6c', '#5b403d'];

const AdminAnalytics = ({ user, onLogout }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/admin/analytics`, {
        params: { days, gst_rate: 0.18 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', data.summary.total_revenue],
      ['Total Orders', data.summary.total_orders],
      ['Avg Order Value', data.summary.avg_order_value],
      ['Units Sold', data.summary.units_sold],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return (
      <AdminLayout user={user} onLogout={onLogout} searchPlaceholder="Search analytics...">
        <p className="text-adm-on-surface-variant">Loading analytics…</p>
      </AdminLayout>
    );
  }

  const { summary, monthly, status_breakdown, top_products, product_report } = data;

  const kpis = [
    { label: 'Total Revenue', value: fmtINR(summary.total_revenue), icon: 'payments', iconBg: 'bg-adm-primary-container/20', iconColor: 'text-adm-primary', delay: 'delay-100' },
    { label: 'Orders Processed', value: summary.total_orders, icon: 'shopping_basket', iconBg: 'bg-adm-secondary-container/20', iconColor: 'text-adm-secondary', delay: 'delay-200' },
    { label: 'Avg Order Value', value: fmtINR(summary.avg_order_value), icon: 'group', iconBg: 'bg-adm-tertiary-fixed/20', iconColor: 'text-adm-tertiary', delay: 'delay-300' },
    { label: 'Units Sold', value: summary.units_sold, icon: 'inventory_2', iconBg: 'bg-adm-secondary-container/20', iconColor: 'text-adm-secondary', delay: 'delay-400', border: true },
  ];

  const maxMonthly = Math.max(...monthly.map((m) => m.revenue), 1);
  const categories = (product_report?.by_category || []).slice(0, 4);
  const maxCatValue = Math.max(...categories.map((c) => c.stock_value), 1);

  // Donut chart: real order-status mix. stroke-dasharray/offset computed
  // as running percentages, same technique as the source SVG.
  const totalStatusOrders = status_breakdown.reduce((s, x) => s + x.count, 0) || 1;
  let cumulative = 0;
  const donutSegments = status_breakdown.map((s, i) => {
    const pct = (s.count / totalStatusOrders) * 100;
    const seg = { ...s, pct, offset: -cumulative, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    cumulative += pct;
    return seg;
  });

  // Derived insights — computed from real data, not invented copy.
  const insights = [];
  if (top_products?.[0]) {
    insights.push({
      icon: 'trending_up', bg: 'bg-adm-secondary-container/10', color: 'text-adm-secondary',
      title: 'Top Performer',
      body: `'${top_products[0].name}' is your top earner this period: ${top_products[0].units} units, ${fmtINR(top_products[0].revenue)}.`,
    });
  }
  const lowStockTopSeller = (top_products || []).find((p) => p.stock < 5);
  if (lowStockTopSeller) {
    insights.push({
      icon: 'inventory', bg: 'bg-adm-primary-container/5', color: 'text-adm-primary',
      title: 'Restock Priority',
      body: `'${lowStockTopSeller.name}' is selling well but only has ${lowStockTopSeller.stock} units left.`,
    });
  }
  if (categories[0]) {
    insights.push({
      icon: 'category', bg: 'bg-adm-tertiary-container/10', color: 'text-adm-tertiary',
      title: 'Largest Inventory Investment',
      body: `${categories[0].category} holds ${fmtINR(categories[0].stock_value)} in stock value across ${categories[0].products} products.`,
    });
  }
  if (product_report?.out_of_stock > 0) {
    insights.push({
      icon: 'error', bg: 'bg-adm-error-container/40', color: 'text-adm-error',
      title: 'Out of Stock',
      body: `${product_report.out_of_stock} product${product_report.out_of_stock === 1 ? '' : 's'} currently unavailable to customers.`,
    });
  }

  return (
    <AdminLayout user={user} onLogout={onLogout} searchPlaceholder="Search analytics...">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl text-adm-on-surface">Store Performance &amp; Insights</h1>
          <p className="text-adm-on-surface-variant mt-1">Holistic view of your sacred business metrics</p>
        </div>
        <Button onClick={exportReport} className="bg-adm-primary text-adm-on-primary hover:opacity-90 warm-shadow">
          <Download className="h-4 w-4 mr-2" /> Download Report
        </Button>
      </div>

      {/* KPI row — staggered fade-up entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`glass-card kpi-card p-6 rounded-xl space-y-2 animate-fade-up ${kpi.delay} ${kpi.border ? 'border-t-4 border-adm-secondary' : ''}`}
          >
            <div className="flex justify-between">
              <span className={`material-symbols-outlined ${kpi.iconColor} ${kpi.iconBg} p-2 rounded-lg`}>{kpi.icon}</span>
            </div>
            <p className="text-adm-on-surface-variant font-label-md text-sm">{kpi.label}</p>
            <h3 className="font-headline-md text-2xl">{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Sales trend + category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-8 overflow-hidden relative animate-fade-up delay-500">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className="font-headline-sm text-lg">Sales Trends Over Time</h4>
              <p className="text-adm-on-surface-variant text-sm">Monthly revenue, last 6 months</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-end justify-between gap-4 px-2">
            {monthly.map((m, i) => {
              const isLast = i === monthly.length - 1;
              const heightPct = Math.max(8, (m.revenue / maxMonthly) * 100);
              return (
                <div className="flex flex-col items-center gap-2 flex-1 group" key={m.month}>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 relative bar-segment ${
                      isLast ? 'bg-adm-primary shadow-md hover:brightness-110' : 'bg-adm-primary-container/20 hover:bg-adm-primary-container'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  >
                    <div
                      className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-adm-inverse-surface text-adm-inverse-on-surface text-[10px] px-2 py-1 rounded transition-opacity ${
                        isLast ? 'opacity-100 shadow-sm' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {fmtINR(m.revenue)}
                    </div>
                  </div>
                  <span className={`font-label-md text-[10px] ${isLast ? 'text-adm-primary font-bold' : 'text-adm-on-surface-variant'}`}>
                    {m.month.split(' ')[0].toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-xl p-8 animate-fade-up delay-500">
          <h4 className="font-headline-sm text-lg mb-6">Inventory by Category</h4>
          <div className="space-y-6">
            {categories.map((c) => (
              <div className="space-y-2" key={c.category}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-adm-on-surface-variant">{fmtINR(c.stock_value)}</span>
                </div>
                <div className="w-full h-2 bg-adm-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-adm-primary rounded-full animate-progress"
                    style={{ width: `${(c.stock_value / maxCatValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-adm-on-surface-variant">No category data yet.</p>}
          </div>
        </div>
      </div>

      {/* Order status donut + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-8 animate-fade-up">
          <h4 className="font-headline-sm text-lg mb-6">Order Status Breakdown</h4>
          <div className="flex items-center gap-8 flex-wrap">
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle className="opacity-20" cx="18" cy="18" fill="transparent" r="16" stroke="#f0dfd9" strokeWidth="4" />
                {donutSegments.map((s) => (
                  <circle
                    key={s.status}
                    className="donut-segment"
                    cx="18" cy="18" fill="transparent" r="16"
                    stroke={s.color}
                    strokeWidth="4"
                    strokeDasharray={`${s.pct} 100`}
                    strokeDashoffset={s.offset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold">{totalStatusOrders}</span>
                <span className="text-[10px] uppercase text-adm-on-surface-variant tracking-wider">Orders</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2 min-w-[160px]">
              {donutSegments.map((s) => (
                <div key={s.status} className="flex items-center gap-3 p-2 rounded-lg hover:bg-adm-surface-container-low transition-colors cursor-default">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm flex-1 capitalize">{s.status}</span>
                  <span className="font-bold text-sm">{Math.round(s.pct)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-8 animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-headline-sm text-lg">Performance Insights</h4>
            <span className="material-symbols-outlined text-adm-secondary hover-pulse">tips_and_updates</span>
          </div>
          <div className="space-y-4">
            {insights.length === 0 ? (
              <p className="text-sm text-adm-on-surface-variant">Not enough data yet to generate insights.</p>
            ) : (
              insights.map((ins) => (
                <div key={ins.title} className={`p-4 ${ins.bg} rounded-lg flex gap-4 insight-card ${ins.color}`}>
                  <span className="material-symbols-outlined shrink-0">{ins.icon}</span>
                  <div>
                    <p className="text-sm font-bold">{ins.title}</p>
                    <p className="text-xs text-adm-on-surface-variant">{ins.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Range control — kept from the working app; not in the mockup */}
      <div className="flex justify-center gap-2">
        {['7', '30', '90'].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              days === d ? 'bg-adm-primary text-adm-on-primary border-adm-primary' : 'border-adm-outline-variant text-adm-on-surface-variant hover:bg-adm-surface-container'
            }`}
          >
            Last {d} days
          </button>
        ))}
      </div>

      <footer className="pt-4 pb-12 flex justify-center items-center opacity-50">
        <div className="flex items-center gap-4 text-adm-outline">
          <div className="h-px w-24 bg-adm-outline-variant" />
          <span className="material-symbols-outlined hover-spin cursor-help">settings_suggest</span>
          <span className="font-label-md text-[10px] uppercase tracking-[0.2em]">End of Analytics Stream</span>
          <span className="material-symbols-outlined hover-spin cursor-help">settings_suggest</span>
          <div className="h-px w-24 bg-adm-outline-variant" />
        </div>
      </footer>

      {/* Ambient background decoration */}
      <div
        className="fixed top-16 right-0 -z-10 w-[600px] h-[600px] opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #e53935 0%, transparent 70%)' }}
      />
      <div
        className="fixed bottom-0 left-64 -z-10 w-[400px] h-[400px] opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #735c00 0%, transparent 70%)' }}
      />
    </AdminLayout>
  );
};

export default AdminAnalytics;
