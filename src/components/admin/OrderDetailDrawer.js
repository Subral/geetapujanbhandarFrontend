import { useEffect, useState } from 'react';
import StatusPill from './StatusPill';

// Ported from order_management_geeta_pujan_bhandar's togglePanel().
// Original vanilla JS:
//   open:  panel.classList.remove('translate-x-full')
//          overlay.classList.remove('hidden')
//          setTimeout(() => overlay.classList.add('opacity-100'), 10)
//   close: panel.classList.add('translate-x-full')
//          overlay.classList.remove('opacity-100')
//          setTimeout(() => overlay.classList.add('hidden'), 300)
//
// Reimplemented with the same two-phase timing (10ms open delay so the
// browser has a frame to apply the transition; 300ms close delay so the
// overlay stays interactive/painted for the full fade-out) rather than
// swapping in a generic modal transition.

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

const STATUS_COPY = {
  pending: 'Order placed, awaiting confirmation',
  confirmed: 'Order confirmed and being prepared',
  shipped: 'Order is on its way',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
};

const OrderDetailDrawer = ({
  order, open, onClose,
  onStatusChange, // optional: (orderId, newStatus) => void — omit for read-only usage
  onWhatsApp,      // optional: (order) => void
  onPrint,         // optional: (order) => void
}) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let t;
    if (open) {
      setMounted(true);
      t = setTimeout(() => setVisible(true), 10);
    } else if (mounted) {
      setVisible(false);
      t = setTimeout(() => setMounted(false), 300);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted || !order) return null;

  const stepIndex = Math.max(STATUS_STEPS.indexOf(order.order_status), 0);
  const progressPct = order.order_status === 'cancelled'
    ? 100
    : ((stepIndex + 1) / STATUS_STEPS.length) * 100;

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '';

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-20 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[var(--adm-surface-container-lowest)] shadow-2xl transform transition-transform duration-300 z-30 p-6 custom-scrollbar overflow-y-auto ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline-sm text-lg">Order Details</h3>
          <button
            className="p-2 hover:bg-[var(--adm-surface-container)] rounded-full transition-colors"
            onClick={onClose}
            aria-label="Close order details"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          {/* Status banner + progress */}
          <div className="p-4 bg-[var(--adm-primary)]/5 rounded-xl border border-[var(--adm-primary)]/10">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-[10px] uppercase tracking-widest text-[var(--adm-primary)] font-bold">
                Status: {order.order_status}
              </p>
              {onStatusChange && order.order_status !== 'cancelled' && (
                <select
                  value={order.order_status}
                  onChange={(e) => onStatusChange(order.id, e.target.value)}
                  className="text-xs border border-[var(--adm-outline-variant)] rounded-lg px-2 py-1 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              )}
            </div>
            <div className="h-2 w-full bg-[var(--adm-outline-variant)]/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--adm-primary)] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] mt-2 text-[var(--adm-on-surface-variant)]">
              {STATUS_COPY[order.order_status] || ''}
              {orderDate ? ` · ${orderDate}` : ''}
            </p>
            {order.order_status === 'cancelled' && order.cancel_reason && (
              <p className="text-[11px] mt-1 text-[var(--adm-error)]">Reason: {order.cancel_reason}</p>
            )}
          </div>

          {/* Delivery information */}
          <div>
            <h4 className="font-label-md text-sm mb-3 border-b border-[var(--adm-outline-variant)]/30 pb-1">
              Delivery Information
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--adm-on-surface-variant)]">Recipient:</span>
                <span className="font-bold">{order.address?.name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--adm-on-surface-variant)]">Phone:</span>
                <span className="font-bold">{order.address?.phone || '—'}</span>
              </div>
              <div className="flex flex-col text-sm mt-2">
                <span className="text-[var(--adm-on-surface-variant)]">Address:</span>
                <span className="font-bold">
                  {order.address
                    ? `${order.address.address_line}, ${order.address.area}, ${order.address.city} - ${order.address.pincode}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-label-md text-sm mb-3 border-b border-[var(--adm-outline-variant)]/30 pb-1">
              Items List
            </h4>
            <div className="space-y-4">
              {(order.items || []).map((item, i) => (
                <div className="flex gap-3" key={i}>
                  <div className="w-12 h-12 rounded bg-[var(--adm-surface)] border border-[var(--adm-outline-variant)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[var(--adm-primary)]">temple_hindu</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-[11px] text-[var(--adm-on-surface-variant)]">
                      Qty: {item.quantity} × ₹{item.price?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-[var(--adm-outline-variant)]/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--adm-on-surface-variant)]">Payment method</span>
              <span className="font-bold capitalize">{order.payment_method?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--adm-on-surface-variant)]">Payment status</span>
              <span className="font-bold capitalize">{order.payment_status}</span>
            </div>
            <div className="flex justify-between text-base pt-2">
              <span className="font-bold">Total</span>
              <span className="font-bold text-[var(--adm-primary)]">
                ₹{order.total?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <StatusPill status={order.order_status} />
            {(onWhatsApp || onPrint) && (
              <div className="flex gap-2">
                {onWhatsApp && (
                  <button
                    onClick={() => onWhatsApp(order)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                    title="Send status update on WhatsApp"
                  >
                    WhatsApp
                  </button>
                )}
                {onPrint && (
                  <button
                    onClick={() => onPrint(order)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-[var(--adm-outline-variant)] text-[var(--adm-on-surface-variant)] hover:bg-[var(--adm-surface-container)] transition-colors"
                    title="Print invoice"
                  >
                    Invoice
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetailDrawer;
