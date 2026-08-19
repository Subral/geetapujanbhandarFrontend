import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, Clock, CheckCircle, Truck, MapPin, Store, Download, XCircle, MessageCircle, RotateCcw, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CANCEL_REASONS = [
  'Changed my mind',
  'Found a better price elsewhere',
  'Ordered by mistake',
  'Delivery time is too long',
  'Want to change the delivery address',
  'Want to change/modify the order',
  'Payment issue',
  'Other',
];

// Ported from 07_order_detail (finalized Stitch canvas). All real logic
// (fetchOrder, fetchInvoice, handleCancelOrder, CancelModal) unchanged.
//
// Real additions beyond the restyle:
//  - Price breakdown (Subtotal / Discount / Delivery / Total) — the
//    order already stores `discount` and `delivery_fee` separately, but
//    this page only ever showed a flat Total with no way to see what a
//    promo code or delivery fee actually was.
//  - Transaction ID for online-paid orders — `razorpay_payment_id` is
//    already stored on the order (see the payment-verification fix
//    earlier in this project) but was never surfaced anywhere.
//  - Real Reorder — adds every item from this order back to the cart via
//    the existing /cart endpoint, no new backend needed. If an item was
//    removed from the catalog since, that one add fails and is reported
//    without blocking the rest.
//  - "Delivery Address" now correctly reads "Store Pickup" for orders
//    placed as pickup. Previously always labeled "Delivery Address" even
//    when what's actually shown is the *store's* address (Checkout.js
//    substitutes the store's address into `order.address` for pickup
//    orders) — confusing for a pickup customer with no indication this
//    wasn't a delivery at all.
//
// Also fixed on the backend as part of this same pass: the invoice
// endpoint computed GST as an 18% *addition* on top of the subtotal,
// contradicting the inclusive-pricing rule used everywhere else in this
// app, and returned a third wrong store address distinct from every
// other one found and corrected earlier in this project.

const CancelModal = ({ onClose, onConfirm, cancelling }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const finalReason = selectedReason === 'Other' ? otherReason.trim() : selectedReason;
  const canSubmit = finalReason && !cancelling;

  return createPortal(
    <div
      className="storefront-shell fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-sf-outline-variant flex-shrink-0">
          <XCircle className="h-5 w-5 text-red-500" />
          <h2 className="font-headline-sm text-base text-sf-on-surface">Cancel Order</h2>
          <button onClick={onClose} className="ml-auto text-sf-on-surface-variant hover:text-sf-on-surface text-lg leading-none" aria-label="Close">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          <p className="text-xs text-sf-on-surface-variant mb-3">Please tell us why you want to cancel this order.</p>
          <div className="space-y-2">
            {CANCEL_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => { setSelectedReason(reason); setOtherReason(''); }}
                className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border transition-all ${
                  selectedReason === reason
                    ? 'border-sf-primary bg-red-50 text-sf-primary font-medium'
                    : 'border-sf-outline-variant text-sf-on-surface hover:border-sf-primary hover:bg-red-50'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          {selectedReason === 'Other' && (
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Please describe your reason..."
              rows={3}
              autoFocus
              className="w-full text-sm border border-sf-outline-variant rounded-xl px-3 py-2.5 outline-none focus:border-sf-primary resize-none mt-3"
            />
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-sf-outline-variant flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded text-sm" disabled={cancelling}>
            Keep Order
          </Button>
          <Button
            onClick={() => onConfirm(finalReason)}
            disabled={!canSubmit}
            className={`flex-1 rounded text-sm text-white ${canSubmit ? 'bg-sf-primary hover:opacity-90' : 'bg-sf-outline-variant cursor-not-allowed'}`}
          >
            {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const OrderDetail = ({ user }) => {
  const [storeWhatsapp, setStoreWhatsapp] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/config`).then((r) => setStoreWhatsapp(r.data.store_whatsapp || '')).catch(() => {});
  }, []);

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoice = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/orders/${id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoice) {
      toast.error('Invoice not available yet. Please try again.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to download the invoice.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice?.invoice_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E53935; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #E53935; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #333; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-box { width: 48%; }
            .info-box h3 { font-size: 14px; color: #666; margin-bottom: 5px; }
            .info-box p { margin: 2px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #F5E6D3; padding: 12px; text-align: left; font-size: 14px; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            .totals { text-align: right; margin-top: 20px; }
            .totals p { margin: 5px 0; font-size: 14px; }
            .grand-total { font-size: 20px; font-weight: bold; color: #E53935; }
            .footer { margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div>
                <div class="company-name">&#x0917;&#x0940;&#x0924;&#x093E; Geeta Pujan Bhandar</div>
                <p style="font-size: 12px; color: #666;">${invoice?.company?.address || 'Latouche Road Plaza, First Floor, 92/77, Latouche Rd, Hazratganj, Lucknow \u2013 226018'}</p>
                <p style="font-size: 12px; color: #666;">Phone: ${invoice?.company?.phone || '+91 9506711777'} | Email: ${invoice?.company?.email || 'contact@geetapujan.com'}</p>
                <p style="font-size: 12px; color: #666;">GSTIN: ${invoice?.company?.gstin || '{{GSTIN}}'}</p>
              </div>
              <div style="text-align: right;">
                <div class="invoice-title">INVOICE</div>
                <p style="font-size: 14px;"><strong>Invoice No:</strong> ${invoice?.invoice_no}</p>
                <p style="font-size: 14px;"><strong>Date:</strong> ${new Date(invoice?.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div class="info-section">
              <div class="info-box">
                <h3>BILL TO:</h3>
                <p><strong>${invoice?.customer?.name}</strong></p>
                <p>${invoice?.customer?.address}</p>
                <p>Phone: ${invoice?.customer?.phone}</p>
                <p>Email: ${invoice?.customer?.email}</p>
              </div>
              <div class="info-box">
                <h3>ORDER DETAILS:</h3>
                <p><strong>Order ID:</strong> ${invoice?.order_id?.slice(0, 8)}</p>
                <p><strong>Payment:</strong> ${invoice?.payment_method?.toUpperCase()}</p>
                <p><strong>Status:</strong> ${invoice?.payment_status?.toUpperCase()}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${invoice?.items?.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>&#8377;${Number(item.price).toLocaleString()}</td>
                    <td>&#8377;${(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="totals">
              <p><strong>Subtotal:</strong> &#8377;${Number(invoice?.subtotal).toLocaleString()}</p>
              ${invoice?.discount > 0 ? `<p><strong>Discount:</strong> -&#8377;${Number(invoice.discount).toLocaleString()}</p>` : ''}
              <p><strong>Delivery:</strong> ${invoice?.delivery_fee > 0 ? '&#8377;' + Number(invoice.delivery_fee).toLocaleString() : 'FREE'}</p>
              <p style="font-size: 12px; color: #999;">GST (${Number(invoice?.tax).toLocaleString()}) included in item prices — not added to the total.</p>
              <p class="grand-total"><strong>Grand Total:</strong> &#8377;${Number(invoice?.total).toLocaleString()}</p>
            </div>
            <div class="footer">
              <p>Thank you for shopping with Geeta Pujan Bhandar!</p>
              <p>For any queries, contact us at contact@geetapujan.com or call +91 9506711777</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCancelOrder = async (reason) => {
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/orders/${id}/cancel`, { reason }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order cancelled successfully.');
      setShowCancelModal(false);
      fetchOrder();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to cancel order. Please try again.';
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    setReordering(true);
    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;
    for (const item of order.items) {
      try {
        await axios.post(`${API}/cart`,
          { product_id: item.product_id, quantity: item.quantity, variant: item.variant || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch {
        failCount++;
      }
    }
    setReordering(false);
    if (successCount > 0) {
      toast.success(
        failCount > 0
          ? `${successCount} item${successCount !== 1 ? 's' : ''} added to cart — ${failCount} could not be added (likely no longer available).`
          : 'All items added to cart!'
      );
      navigate('/cart');
    } else {
      toast.error('None of these items could be added to cart. They may no longer be available.');
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Placed', icon: Clock },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { key: 'shipped', label: 'Shipped', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: Package }
    ];
    const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(order?.order_status);
    return steps.map((step, idx) => ({ ...step, completed: idx <= currentIndex }));
  };

  const canCancel = order && ['pending', 'confirmed'].includes(order.order_status);
  const isCancelled = order?.order_status === 'cancelled';
  const isPickup = order?.order_type === 'pickup';

  if (loading) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-sf-primary">progress_activity</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center text-sm text-sf-on-surface-variant">
        Order not found
      </div>
    );
  }

  const steps = getStatusSteps();

  return (
    <div className="storefront-shell min-h-screen bg-sf-background py-4 md:py-8 px-4 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="sacred-card rounded-xl p-4 md:p-6 mb-4 animate-page-enter">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-headline-lg text-xl md:text-2xl text-sf-primary mb-1">Order Details</h1>
              <p className="text-xs md:text-sm text-sf-on-surface-variant">Order #{(order.invoice_no || order.id.slice(0, 8)).toUpperCase()}</p>
              <p className="text-xs md:text-sm text-sf-on-surface-variant">
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {storeWhatsapp && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `Namaste 🙏 I'd like updates on my order ${order?.invoice_no || order?.id?.slice(0, 8)} from Geeta Pujan Bhandar.`
                    );
                    window.open(`https://wa.me/${storeWhatsapp}?text=${msg}`, '_blank');
                  }}
                  className="flex items-center gap-1.5 text-xs md:text-sm rounded border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white"
                  data-testid="whatsapp-updates-button"
                >
                  <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Need Help on</span> WhatsApp
                </Button>
              )}
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="flex items-center gap-1.5 text-xs md:text-sm rounded px-3 md:px-4 py-2 border-sf-primary text-sf-primary"
                data-testid="download-invoice-button"
              >
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">Download</span> Invoice
              </Button>
              <Button
                onClick={handleReorder}
                disabled={reordering}
                className="flex items-center gap-1.5 text-xs md:text-sm rounded px-3 md:px-4 py-2 bg-sf-primary text-sf-on-primary hover:opacity-90"
                data-testid="reorder-button"
              >
                <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {reordering ? 'Adding...' : 'Reorder Items'}
              </Button>
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div className="sacred-card rounded-xl p-4 md:p-6 mb-4">
          <h2 className="font-headline-sm text-base md:text-lg text-sf-on-surface mb-4">Order Status</h2>

          {isCancelled ? (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-600">Order Cancelled</p>
                {order.cancel_reason && <p className="text-xs text-red-400 mt-0.5">Reason: {order.cancel_reason}</p>}
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex justify-between">
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mb-1 ${step.completed ? 'bg-sf-primary' : 'bg-sf-secondary-container/30'}`}>
                        <Icon className={`h-4 w-4 md:h-5 md:w-5 ${step.completed ? 'text-sf-on-primary' : 'text-sf-on-surface-variant'}`} />
                      </div>
                      <p className={`text-[10px] md:text-xs text-center ${step.completed ? 'font-bold text-sf-on-surface' : 'text-sf-on-surface-variant'}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-4 md:top-5 left-0 right-0 h-0.5 bg-sf-outline-variant" style={{ zIndex: 0 }}>
                <div
                  className="h-full bg-sf-primary transition-all"
                  style={{ width: `${(steps.filter(s => s.completed).length - 1) / (steps.length - 1) * 100}%` }}
                />
              </div>
            </div>
          )}

          {canCancel && (
            <div className="mt-5 pt-4 border-t border-sf-outline-variant">
              <Button onClick={() => setShowCancelModal(true)} variant="outline" className="flex items-center gap-2 text-xs md:text-sm rounded px-4 py-2 border-red-300 text-red-500 hover:bg-red-50">
                <XCircle className="w-4 h-4" /> Cancel Order
              </Button>
              <p className="text-[10px] text-sf-on-surface-variant mt-1.5 ml-1">You can cancel before the order is shipped.</p>
            </div>
          )}
        </div>

        {/* Fulfilment & Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="sacred-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              {isPickup ? <Store className="h-4 w-4 text-sf-primary" /> : <MapPin className="h-4 w-4 text-sf-primary" />}
              <h3 className="font-headline-sm text-sm md:text-base text-sf-on-surface">
                {isPickup ? 'Store Pickup' : 'Delivery Address'}
              </h3>
            </div>
            {isPickup && (
              <p className="text-xs text-sf-on-surface-variant mb-2">
                Collected in-store — this is our address, not a delivery destination.
                {order.pickup_time && <span className="block font-medium text-sf-primary mt-1">Slot: {order.pickup_time}</span>}
              </p>
            )}
            <p className="text-sm font-medium text-sf-on-surface">{order.address.name}</p>
            <p className="text-xs text-sf-on-surface-variant">{order.address.phone}</p>
            <p className="text-xs text-sf-on-surface-variant mt-1">
              {order.address.address_line}, {order.address.area}, {order.address.pincode}
            </p>
          </div>

          <div className="sacred-card rounded-xl p-4">
            <h3 className="font-headline-sm text-sm md:text-base text-sf-on-surface mb-3">Payment &amp; Summary</h3>
            <div className="space-y-2 text-xs md:text-sm">
              <div className="flex justify-between">
                <span className="text-sf-on-surface-variant">Method</span>
                <span className="font-medium capitalize text-sf-on-surface">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sf-on-surface-variant">Status</span>
                <span className="font-medium capitalize text-sf-on-surface">{order.payment_status}</span>
              </div>
              {order.razorpay_payment_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sf-on-surface-variant flex items-center gap-1"><CreditCard className="w-3 h-3" /> Transaction ID</span>
                  <span className="font-medium text-sf-on-surface text-[11px]">{order.razorpay_payment_id}</span>
                </div>
              )}
              <div className="pt-2 border-t border-sf-outline-variant space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-sf-on-surface-variant">Subtotal</span>
                  <span className="text-sf-on-surface">₹{order.items.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString('en-IN')}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount{order.promo_code ? ` (${order.promo_code.toUpperCase()})` : ''}</span>
                    <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sf-on-surface-variant">Delivery</span>
                  <span className="text-sf-on-surface">{order.delivery_fee > 0 ? `₹${order.delivery_fee.toLocaleString('en-IN')}` : 'FREE'}</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-sf-outline-variant">
                <span className="font-bold text-sf-on-surface">Total</span>
                <span className="text-base md:text-lg font-bold text-sf-primary">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="sacred-card rounded-xl p-4 md:p-6">
          <h3 className="font-headline-sm text-base md:text-lg text-sf-on-surface mb-4">Items Ordered</h3>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-3 md:gap-4 pb-3 border-b border-sf-outline-variant last:border-0 last:pb-0">
                <img loading="lazy" src={item.image} alt={item.name} className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm md:text-base font-bold line-clamp-2 text-sf-on-surface">{item.name}</h4>
                  {item.variant && <p className="text-xs text-sf-on-surface-variant">Size: {item.variant}</p>}
                  <p className="text-xs text-sf-on-surface-variant">Qty: {item.quantity}</p>
                  <p className="text-sm font-bold mt-1 text-sf-primary">₹{item.price.toLocaleString('en-IN')} × {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm md:text-base font-bold text-sf-primary">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <CancelModal onClose={() => setShowCancelModal(false)} onConfirm={handleCancelOrder} cancelling={cancelling} />
      )}
    </div>
  );
};

export default OrderDetail;
