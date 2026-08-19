import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { lucknowAreas } from '../utils/constants';
import { useProductTracking } from '../hooks/useProductTracking';
import { MapPin, Navigation, Plus, Check, Search, X, ExternalLink, Store, Truck, Clock, ShoppingBag, CreditCard } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STORE_ADDRESS = {
  name: 'Geeta Pujan Bhandar',
  line: 'Latouche Road Plaza, First Floor, 92/77, Latouche Rd',
  area: 'Hazratganj',
  city: 'Lucknow',
  pincode: '226018',
  phone: '+91 9506711777',
  mapsLink: 'https://maps.google.com/?q=Latouche+Road+Plaza+Lucknow',
  hours: 'Mon–Sat: 9 AM – 8 PM  |  Sun: 10 AM – 6 PM',
};

// Resolves the correct unit price for a cart item, respecting size/variant
// pricing. Module-level (not defined inside Checkout) because
// ConfirmOrderModal is a separate component below that also needs it —
// it previously had no access to Checkout's local copy and fell back to
// item.product.price (the base price), which silently ignored variant
// pricing and made the modal's line items not sum to the real total.
const itemPrice = (item) => {
  if (item.variant && item.product?.sizes) {
    const size = item.product.sizes.find((sz) => sz.label === item.variant);
    if (size?.price != null) return size.price;
  }
  return item.product?.price || 0;
};

const generatePickupSlots = () => {
  const slots = [];
  const now = new Date();
  const days = ['Today', 'Tomorrow'];
  const times = ['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM'];
  days.forEach((day, di) => {
    times.forEach((time) => {
      if (di === 0) {
        const h = parseInt(time);
        const period = time.includes('PM');
        const slotHour = period && h !== 12 ? h + 12 : h;
        if (slotHour <= now.getHours() + 1) return;
      }
      slots.push(`${day}, ${time}`);
    });
  });
  return slots;
};

const EMPTY_ADDRESS = { name: '', phone: '', address_line: '', area: '', pincode: '', city: 'Lucknow' };

/* ── Location search dropdown (Nominatim) ── */
const LocationSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&countrycodes=in`);
      setResults(await res.json());
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handlePick = (place) => {
    const a = place.address || {};
    const addressLine = [a.house_number, a.road || a.street || a.pedestrian, a.neighbourhood || a.suburb].filter(Boolean).join(', ');
    const detectedArea = a.suburb || a.neighbourhood || a.city_district || '';
    const matchedArea = lucknowAreas.find(area => detectedArea.toLowerCase().includes(area.toLowerCase())) || '';
    onSelect({ address_line: addressLine || place.display_name.split(',')[0], pincode: a.postcode || '', area: matchedArea, lat: place.lat, lon: place.lon });
    setQuery(place.display_name);
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sf-on-surface-variant" />
        <Input value={query} onChange={handleChange} placeholder="Search locality, street or landmark..." className="pl-9 pr-8 text-sm" />
        {query && <button type="button" onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-sf-on-surface-variant" /></button>}
      </div>
      {searching && <div className="absolute z-20 w-full bg-white border border-sf-outline-variant rounded-xl mt-1 p-3 text-sm text-sf-on-surface-variant">Searching...</div>}
      {results.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border border-sf-outline-variant rounded-xl mt-1 shadow-lg overflow-hidden">
          {results.map((r) => (
            <li key={r.place_id}>
              <button type="button" onClick={() => handlePick(r)} className="w-full text-left px-4 py-3 text-xs md:text-sm hover:bg-sf-surface-container-low border-b border-sf-outline-variant last:border-0 flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-sf-primary" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ── Map embed preview ── */
const MapPreview = ({ lat, lon, onOpenMaps }) => {
  if (!lat || !lon) return null;
  return (
    <div className="relative rounded-xl overflow-hidden border border-sf-outline-variant">
      <iframe title="location-preview" width="100%" height="160" style={{ border: 0 }} loading="lazy"
        src={`https://maps.google.com/maps?q=${lat},${lon}&z=16&output=embed`} />
      <button type="button" onClick={onOpenMaps}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white shadow border border-sf-outline-variant text-sf-primary">
        <ExternalLink className="h-3 w-3" /> Open in Maps
      </button>
    </div>
  );
};

/* ── Confirm Order Modal ── */
const ConfirmOrderModal = ({ cart, address, paymentMethod, orderType, pickupTime, discount, promoCode, total, onClose, onConfirm, submitting }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, submitting]);

  return createPortal(
    <div
      className="storefront-shell fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div
        className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-sf-outline-variant flex-shrink-0">
          <ShoppingBag className="h-5 w-5 text-sf-primary" />
          <h2 className="font-headline-sm text-base text-sf-on-surface">Confirm Your Order</h2>
          {!submitting && (
            <button onClick={onClose} className="ml-auto text-sf-on-surface-variant hover:text-sf-on-surface text-lg leading-none" aria-label="Close">×</button>
          )}
        </div>

        {/* Summary */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-sf-on-surface-variant uppercase tracking-wide mb-2">Items</p>
            <div className="space-y-2">
              {cart.items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <img src={item.product.image} alt={item.product.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sf-on-surface line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-sf-on-surface-variant">₹{itemPrice(item).toLocaleString('en-IN')} × {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0 text-sf-primary">
                    ₹{(itemPrice(item) * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Fulfilment */}
          <div className="bg-sf-surface-container-low rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              {orderType === 'pickup' ? <Store className="h-3.5 w-3.5 text-sf-primary" /> : <MapPin className="h-3.5 w-3.5 text-sf-primary" />}
              <p className="text-xs font-semibold text-sf-on-surface-variant uppercase tracking-wide">
                {orderType === 'pickup' ? 'Store Pickup' : 'Delivering to'}
              </p>
            </div>
            {orderType === 'pickup' ? (
              <>
                <p className="text-sm font-medium text-sf-on-surface">{STORE_ADDRESS.name}</p>
                <p className="text-xs text-sf-on-surface-variant">{STORE_ADDRESS.line}, {STORE_ADDRESS.area}</p>
                {pickupTime && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-sf-primary">
                    <Clock className="h-3 w-3" /> {pickupTime}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-sf-on-surface">{address.name} · {address.phone}</p>
                <p className="text-xs text-sf-on-surface-variant">{address.address_line}, {address.area}, {address.city} – {address.pincode}</p>
              </>
            )}
          </div>

          {/* Payment */}
          <div className="bg-sf-surface-container-low rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CreditCard className="h-3.5 w-3.5 text-sf-primary" />
              <p className="text-xs font-semibold text-sf-on-surface-variant uppercase tracking-wide">Payment</p>
            </div>
            <p className="text-sm font-medium text-sf-on-surface">
              {paymentMethod === 'cod'
                ? orderType === 'pickup' ? 'Pay at Store' : 'Cash on Delivery'
                : 'Online Payment'}
            </p>
          </div>

          {/* Total breakdown */}
          <div className="space-y-1.5 pt-1 border-t border-sf-outline-variant">
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-sf-on-surface-variant">Discount{promoCode ? ` (${promoCode.toUpperCase()})` : ''}</span>
                <span className="font-medium text-green-700">-₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-sf-on-surface">Total Amount</span>
              <span className="text-lg font-bold text-sf-primary">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-sf-outline-variant flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded text-sm" disabled={submitting}>
            Go Back
          </Button>
          <Button onClick={onConfirm} disabled={submitting} className="flex-1 rounded text-sm text-sf-on-primary bg-sf-primary hover:opacity-90">
            {submitting ? 'Placing Order…' : orderType === 'pickup' ? 'Confirm Pickup' : 'Place Order'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ── Order Success Overlay ── */
const OrderSuccessOverlay = ({ orderType, pickupTime }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <div className="storefront-shell fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(6px)' }}>
      <div className={`flex flex-col items-center gap-5 px-8 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        {/* Animated tick circle */}
        <div className="relative">
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full animate-ping bg-sf-primary/15" />
          <div className="absolute -inset-3 rounded-full animate-pulse bg-sf-primary/[0.08]" />
          {/* Circle */}
          <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-sf-primary to-orange-400">
            <svg viewBox="0 0 52 52" className="w-12 h-12">
              <circle cx="26" cy="26" r="25" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <path fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                d="M14 27 l8 8 l16-16"
                style={{
                  strokeDasharray: 40,
                  strokeDashoffset: visible ? 0 : 40,
                  transition: 'stroke-dashoffset 0.5s ease 0.3s'
                }}
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className={`transition-all duration-500 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="font-headline-lg text-2xl md:text-3xl text-sf-primary mb-2">
            {orderType === 'pickup' ? 'Pickup Confirmed!' : 'Order Placed!'}
          </h2>
          <p className="text-sm md:text-base text-sf-on-surface-variant max-w-xs">
            {orderType === 'pickup'
              ? `Your order is ready. Please pick it up at ${pickupTime}.`
              : 'Your order has been placed successfully. Taking you to your order…'}
          </p>
        </div>

        {/* Decorative dots */}
        <div className={`flex gap-2 transition-all duration-500 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce bg-sf-primary" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ══════════════════════════════════════════════════════════════ */

const Checkout = ({ user }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderType, setOrderType] = useState('delivery');
  const [pickupTime, setPickupTime] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS, name: user?.name || '', phone: user?.phone || '' });
  const location = useLocation();
  const promoCode = location.state?.promoCode || null;
  const [config, setConfig] = useState({ delivery_fee: 0, free_delivery_threshold: 0 });
  const [discount, setDiscount] = useState(0);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(null);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [pincodeAreas, setPincodeAreas] = useState([]);
  const navigate = useNavigate();
  const { trackPurchase } = useProductTracking();
  const placingRef = useRef(false);
  const pickupSlots = generatePickupSlots();

  useEffect(() => {
    fetchCart();
    fetchSavedAddresses();
    axios.get(`${API}/config`).then((r) => setConfig(r.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.items.length === 0) { navigate('/cart'); return; }
      setCart(response.data);
    } catch (error) { console.error('Error fetching cart:', error); }
    finally { setLoading(false); }
  };

  const fetchSavedAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const addresses = response.data.addresses || [];
      setSavedAddresses(addresses);
      const defaultIdx = addresses.findIndex(a => a.is_default);
      if (defaultIdx !== -1) { setSelectedAddressIndex(defaultIdx); setShowNewAddressForm(false); }
      else if (addresses.length > 0) { setSelectedAddressIndex(0); setShowNewAddressForm(false); }
      else { setShowNewAddressForm(true); }
    } catch { setShowNewAddressForm(true); }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported by your browser'); return; }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        setDetectedCoords({ lat, lon });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
          const data = await res.json();
          const a = data.address || {};
          const addressLine = [a.house_number, a.road || a.street || a.pedestrian, a.neighbourhood || a.suburb].filter(Boolean).join(', ');
          const detectedArea = a.suburb || a.neighbourhood || a.city_district || '';
          const matchedArea = lucknowAreas.find(area => detectedArea.toLowerCase().includes(area.toLowerCase())) || '';
          setAddress(prev => ({ ...prev, address_line: addressLine || prev.address_line, pincode: a.postcode || prev.pincode, area: matchedArea || prev.area }));
          toast.success('Location detected — verify and adjust if needed');
        } catch { toast.error('Could not get address. Please enter manually.'); }
        setDetectingLocation(false);
        setSelectedAddressIndex(null);
        setShowNewAddressForm(true);
      },
      (error) => {
        setDetectingLocation(false);
        if (error.code === 1) {
          toast('Location permission denied', { description: 'Opening Google Maps so you can find your address.', action: { label: 'Open Maps', onClick: () => window.open('https://maps.google.com', '_blank') } });
        } else {
          toast.error('Could not detect location. Please enter manually.');
        }
      },
      { timeout: 10000 }
    );
  };

  const handleLocationSearchSelect = ({ address_line, pincode, area, lat, lon }) => {
    setAddress(prev => ({ ...prev, address_line: address_line || prev.address_line, pincode: pincode || prev.pincode, area: area || prev.area }));
    if (lat && lon) setDetectedCoords({ lat, lon });
    setSelectedAddressIndex(null);
    setShowNewAddressForm(true);
  };

  const handlePincodeChange = async (raw) => {
    const pin = raw.replace(/\D/g, '').slice(0, 6);
    setAddress(prev => ({ ...prev, pincode: pin }));
    setPincodeAreas([]);
    if (pin.length === 6) {
      try {
        const res = await axios.get(`${API}/pincode-lookup/${pin}`);
        const { areas = [], serviceable } = res.data;
        setPincodeAreas(areas);
        if (areas.length === 1) {
          setAddress(prev => ({ ...prev, pincode: pin, area: areas[0] }));
        }
        if (!serviceable) {
          toast('This pincode is outside our delivery zone', { description: 'We currently deliver only within Lucknow.' });
        }
      } catch (err) {
        // silent — user can still pick area manually
      }
    }
  };

  const getDeliveryAddress = () => {
    if (orderType === 'pickup') {
      return { name: user?.name || '', phone: user?.phone || '', address_line: STORE_ADDRESS.line, area: STORE_ADDRESS.area, pincode: STORE_ADDRESS.pincode, city: 'Lucknow' };
    }
    if (selectedAddressIndex !== null && savedAddresses[selectedAddressIndex]) {
      const a = savedAddresses[selectedAddressIndex];
      return { name: a.name, phone: a.phone, address_line: a.address_line, area: a.area, pincode: a.pincode, city: 'Lucknow' };
    }
    return address;
  };

  const calculateTotal = () => cart.items.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0);

  useEffect(() => {
    // Mirror the server's pricing: validate the promo against the live subtotal
    const subtotal = calculateTotal();
    if (!promoCode || subtotal <= 0) {
      setDiscount(0);
      return;
    }
    axios.post(`${API}/validate-promo?code=${promoCode.toUpperCase()}&total=${subtotal}`)
      .then((r) => setDiscount(r.data.discount || 0))
      .catch(() => setDiscount(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, promoCode]);

  // Same rules as the backend: pickup is always free; delivery is free above the threshold
  const deliveryFee = orderType === 'pickup' ? 0 : (
    (config.delivery_fee > 0 && !(config.free_delivery_threshold > 0 && (calculateTotal() - discount) >= config.free_delivery_threshold))
      ? config.delivery_fee : 0
  );
  const grandTotal = Math.max(calculateTotal() - discount + deliveryFee, 0);

  const loadRazorpayScript = () => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true); script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  // Returns a Promise — resolves on success, rejects on cancel/fail
  const openRazorpay = (orderId, razorpayOrder, token) =>
    new Promise((resolve, reject) => {
      const rp = new window.Razorpay({
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_dummy',
        amount: razorpayOrder.amount, currency: razorpayOrder.currency, order_id: razorpayOrder.id,
        name: 'Geeta Pujan Bhandar', description: 'Purchase of religious items',
        handler: async (response) => {
          try {
            await axios.post(`${API}/payment/verify`,
              { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: orderId },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            resolve();
          } catch { reject(new Error('Payment verification failed. Please contact support.')); }
        },
        modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
        prefill: { name: address.name, contact: address.phone },
        theme: { color: '#E53935' }
      });
      rp.on('payment.failed', (resp) => reject(new Error(resp.error?.description || 'Payment failed.')));
      rp.open();
    });

  // Validates form, then opens confirmation modal
  const handleSubmit = (e) => {
    e.preventDefault();
    if (orderType === 'pickup' && !pickupTime) { toast.error('Please select a pickup time slot'); return; }
    const deliveryAddress = getDeliveryAddress();
    if (!/^\d{10}$/.test((deliveryAddress.phone || '').trim())) {
      toast.error('A valid 10-digit mobile number is required to place the order'); return;
    }
    if (orderType === 'delivery' && (!deliveryAddress.address_line || !deliveryAddress.area || !deliveryAddress.pincode)) {
      toast.error('Please fill in all address fields'); return;
    }
    setShowConfirmModal(true);
  };

  // Shows the success overlay for 2.5s then navigates to the order
  const showOrderSuccess = (orderId, message) => {
    toast.success(message);
    setShowConfirmModal(false);
    setSuccessOrderId(orderId);
    setShowSuccess(true);
    setTimeout(() => {
      navigate(`/orders/${orderId}`);
    }, 2500);
  };

  // Actual order placement — called from inside the confirmation modal
  const placeOrder = async () => {
    if (placingRef.current) return;
    placingRef.current = true;
    setSubmitting(true);

    const deliveryAddress = getDeliveryAddress();
    const token = localStorage.getItem('token');

    try {
      // Step 1 — create order record
      const { data: newOrder } = await axios.post(`${API}/orders`,
        {
          items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, variant: i.variant || null })),
          total: grandTotal,
          promo_code: promoCode,
          address: deliveryAddress,
          payment_method: paymentMethod,
          order_type: orderType,
          pickup_time: orderType === 'pickup' ? pickupTime : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save the new address to the user's profile if they opted in.
      if (
        orderType === 'delivery' &&
        selectedAddressIndex === null &&
        saveNewAddress &&
        deliveryAddress.address_line && deliveryAddress.area && deliveryAddress.pincode
      ) {
        try {
          await axios.post(
            `${API}/users/me/addresses`,
            {
              name: deliveryAddress.name,
              phone: deliveryAddress.phone,
              address_line: deliveryAddress.address_line,
              area: deliveryAddress.area,
              pincode: deliveryAddress.pincode,
              is_default: savedAddresses.length === 0,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (saveErr) {
          console.error('Could not save address to profile:', saveErr);
        }
      }

      if (paymentMethod === 'online') {
        // Step 2a — setup Razorpay
        let razorpayOrder;
        try {
          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) throw new Error('Razorpay SDK failed to load. Please try again.');
          const { data } = await axios.post(`${API}/payment/create-order`,
            { order_id: newOrder.id, currency: 'INR' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          razorpayOrder = data;
        } catch (err) {
          // Order created but payment setup failed — don't show generic error
          toast.error(err.message || 'Could not start payment. Go to My Orders to retry.');
          setShowConfirmModal(false);
          navigate(`/orders/${newOrder.id}`);
          return;
        }

        // Step 2b — open Razorpay modal
        try {
          await openRazorpay(newOrder.id, razorpayOrder, token);
        } catch (err) {
          // Payment cancelled/failed — order exists, redirect to it
          toast.error(err.message || 'Payment not completed. You can retry from My Orders.');
          setShowConfirmModal(false);
          navigate(`/orders/${newOrder.id}`);
          return;
        }

        // Step 2c — payment success
        trackPurchase(cart.items.map(i => i.product_id));
        showOrderSuccess(newOrder.id, 'Payment successful! Order placed.');
      } else {
        // COD / pay-at-store
        trackPurchase(cart.items.map(i => i.product_id));
        showOrderSuccess(newOrder.id, orderType === 'pickup' ? `Order confirmed! Pick up at ${pickupTime}` : 'Order placed successfully!');
      }
    } catch (error) {
      // Only fires if the very first POST /orders failed — no order was created, safe to retry
      toast.error(error.response?.data?.detail || 'Failed to place order. Please try again.');
    } finally {
      placingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-sf-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="storefront-shell min-h-screen bg-sf-background py-6 md:py-12 px-4 pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs text-sf-on-surface-variant mb-2">
          <span className="hover:text-sf-primary cursor-pointer" onClick={() => navigate('/cart')}>Cart</span>
          <span className="mx-1.5">›</span>
          <span className="text-sf-primary font-bold">Checkout</span>
        </p>
        <h1 className="font-headline-lg text-2xl md:text-4xl text-sf-on-surface mb-4 md:mb-8">Review &amp; Payment</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">

              {/* ── Step 1: Delivery Mode ── */}
              <div className="sacred-card rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-sf-primary text-sf-on-primary text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <h2 className="font-headline-md text-lg md:text-2xl text-sf-on-surface">Delivery Mode</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setOrderType('delivery')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${orderType === 'delivery' ? 'border-sf-primary bg-sf-primary-container/5' : 'border-sf-outline-variant hover:border-sf-primary/40'}`}>
                    <Truck className={`h-6 w-6 ${orderType === 'delivery' ? 'text-sf-primary' : 'text-sf-on-surface-variant'}`} />
                    <span className={`font-semibold text-sm md:text-base ${orderType === 'delivery' ? 'text-sf-primary' : 'text-sf-on-surface'}`}>Home Delivery</span>
                    <span className="text-xs text-sf-on-surface-variant text-center">Delivered to your door</span>
                  </button>
                  <button type="button" onClick={() => setOrderType('pickup')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${orderType === 'pickup' ? 'border-sf-primary bg-sf-primary-container/5' : 'border-sf-outline-variant hover:border-sf-primary/40'}`}>
                    <Store className={`h-6 w-6 ${orderType === 'pickup' ? 'text-sf-primary' : 'text-sf-on-surface-variant'}`} />
                    <span className={`font-semibold text-sm md:text-base ${orderType === 'pickup' ? 'text-sf-primary' : 'text-sf-on-surface'}`}>Store Pickup</span>
                    <span className="text-xs text-sf-on-surface-variant text-center">Collect from our store</span>
                  </button>
                </div>
              </div>

              {/* ── Store Pickup Details ── */}
              {orderType === 'pickup' && (
                <div className="sacred-card rounded-xl p-4 md:p-6 space-y-4">
                  <h2 className="font-headline-md text-lg md:text-2xl text-sf-on-surface">Store Details</h2>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-sf-primary-container/5 border border-sf-primary/20">
                    <Store className="h-5 w-5 mt-0.5 flex-shrink-0 text-sf-primary" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm md:text-base text-sf-primary">{STORE_ADDRESS.name}</p>
                      <p className="text-xs md:text-sm text-sf-on-surface">{STORE_ADDRESS.line}</p>
                      <p className="text-xs md:text-sm text-sf-on-surface">{STORE_ADDRESS.area}, {STORE_ADDRESS.city} – {STORE_ADDRESS.pincode}</p>
                      <p className="text-xs text-sf-on-surface-variant">{STORE_ADDRESS.phone}</p>
                      <div className="flex items-center gap-1 text-xs text-sf-on-surface-variant"><Clock className="h-3 w-3" />{STORE_ADDRESS.hours}</div>
                      <a href={STORE_ADDRESS.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium mt-1 text-sf-primary">
                        <ExternalLink className="h-3 w-3" /> View on Google Maps
                      </a>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-sf-outline-variant">
                    <iframe title="store-location" width="100%" height="200" style={{ border: 0 }} loading="lazy"
                      src="https://maps.google.com/maps?q=Latouche+Road+Plaza+92+77+Lucknow&z=16&output=embed" />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm font-semibold mb-2 block text-sf-on-surface">Select Pickup Time Slot <span className="text-sf-primary">*</span></Label>
                    {pickupSlots.length === 0 ? (
                      <p className="text-sm text-sf-on-surface-variant">No slots available today. Please check back tomorrow.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {pickupSlots.map((slot) => (
                          <button key={slot} type="button" onClick={() => setPickupTime(slot)}
                            className={`text-xs md:text-sm px-3 py-2.5 rounded-xl border-2 font-medium transition-all text-left ${pickupTime === slot ? 'border-sf-primary bg-sf-primary-container/5 text-sf-primary' : 'border-sf-outline-variant text-sf-on-surface hover:border-sf-primary/40'}`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Delivery Address ── */}
              {orderType === 'delivery' && (
                <div className="sacred-card rounded-xl p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-headline-md text-lg md:text-2xl text-sf-on-surface">Delivery Address</h2>
                    <Button type="button" variant="outline"
                      className="flex items-center gap-2 text-xs md:text-sm border-sf-primary rounded-full px-3 py-2 text-sf-primary"
                      onClick={handleDetectLocation} disabled={detectingLocation}>
                      <Navigation className={`h-3.5 w-3.5 ${detectingLocation ? 'animate-pulse' : ''}`} />
                      {detectingLocation ? 'Detecting...' : 'Auto-detect Location'}
                    </Button>
                  </div>

                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs md:text-sm font-medium text-sf-on-surface-variant">Saved Addresses</p>
                      {savedAddresses.map((addr, idx) => (
                        <div key={idx} onClick={() => { setSelectedAddressIndex(idx); setShowNewAddressForm(false); setDetectedCoords(null); }}
                          className={`flex items-start gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressIndex === idx ? 'border-sf-primary bg-sf-primary-container/5' : 'border-sf-outline-variant hover:border-sf-primary/40'}`}>
                          <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedAddressIndex === idx ? 'border-sf-primary bg-sf-primary' : 'border-sf-outline-variant'}`}>
                            {selectedAddressIndex === idx && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm md:text-base text-sf-on-surface">{addr.name}</p>
                              {addr.is_default && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sf-secondary-container/40 text-sf-secondary">Default</span>}
                            </div>
                            <p className="text-xs md:text-sm text-sf-on-surface-variant mt-0.5">{addr.phone}</p>
                            <p className="text-xs md:text-sm text-sf-on-surface mt-1">{addr.address_line}, {addr.area}, Lucknow – {addr.pincode}</p>
                          </div>
                          <MapPin className="flex-shrink-0 h-4 w-4 mt-1 text-sf-primary" />
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => { setSelectedAddressIndex(null); setShowNewAddressForm(true); setDetectedCoords(null); setAddress({ ...EMPTY_ADDRESS, name: user?.name || '', phone: user?.phone || '' }); }}
                        className={`w-full flex items-center gap-2 p-3 rounded-xl border-2 border-dashed transition-all text-sm font-medium ${showNewAddressForm ? 'border-sf-primary text-sf-primary bg-sf-primary-container/5' : 'border-sf-outline-variant text-sf-on-surface-variant hover:border-sf-primary/40'}`}>
                        <Plus className="h-4 w-4" /> Add a new address
                      </button>
                    </div>
                  )}

                  {(showNewAddressForm || savedAddresses.length === 0) && (
                    <div className="space-y-3 md:space-y-4 pt-2">
                      {savedAddresses.length > 0 && <p className="text-xs md:text-sm font-semibold text-sf-on-surface">New Address</p>}
                      <div className="flex flex-col gap-2">
                        <Button type="button" variant="outline"
                          className="w-full flex items-center justify-center gap-2 text-sm border-dashed border-sf-primary rounded-xl py-3 text-sf-primary"
                          onClick={handleDetectLocation} disabled={detectingLocation}>
                          <Navigation className={`h-4 w-4 ${detectingLocation ? 'animate-pulse' : ''}`} />
                          {detectingLocation ? 'Detecting your location...' : 'Use my current location'}
                        </Button>
                        <div className="flex items-center gap-2"><div className="flex-1 h-px bg-sf-outline-variant" /><span className="text-xs text-sf-on-surface-variant">or search</span><div className="flex-1 h-px bg-sf-outline-variant" /></div>
                        <LocationSearch onSelect={handleLocationSearchSelect} />
                      </div>
                      {detectedCoords && <MapPreview lat={detectedCoords.lat} lon={detectedCoords.lon} onOpenMaps={() => window.open(`https://www.google.com/maps?q=${detectedCoords.lat},${detectedCoords.lon}&z=17`, '_blank')} />}
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div><Label className="text-xs md:text-sm">Full Name</Label><Input value={address.name} onChange={(e) => setAddress({...address, name: e.target.value})} required={showNewAddressForm || savedAddresses.length === 0} className="text-sm md:text-base" data-testid="address-name-input" /></div>
                        <div><Label className="text-xs md:text-sm">Phone <span className="text-sf-primary">*</span></Label><Input value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" required={showNewAddressForm || savedAddresses.length === 0} className="text-sm md:text-base" data-testid="address-phone-input" /></div>
                      </div>
                      <div><Label className="text-xs md:text-sm">Address Line</Label><Input value={address.address_line} onChange={(e) => setAddress({...address, address_line: e.target.value})} placeholder="House no., Street name" required={showNewAddressForm || savedAddresses.length === 0} className="text-sm md:text-base" data-testid="address-line-input" /></div>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <Label className="text-xs md:text-sm">Area</Label>
                          <Select value={address.area} onValueChange={(value) => setAddress({...address, area: value})} required={showNewAddressForm || savedAddresses.length === 0}>
                            <SelectTrigger className="text-sm md:text-base" data-testid="area-select"><SelectValue placeholder="Select Area" /></SelectTrigger>
                            <SelectContent>{(pincodeAreas.length > 0 ? pincodeAreas : lucknowAreas).map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label className="text-xs md:text-sm">Pincode</Label><Input value={address.pincode} onChange={(e) => handlePincodeChange(e.target.value)} inputMode="numeric" maxLength={6} placeholder="Enter to auto-fill area" required={showNewAddressForm || savedAddresses.length === 0} className="text-sm md:text-base" data-testid="pincode-input" /></div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="save-new-address"
                          checked={saveNewAddress}
                          onChange={(e) => setSaveNewAddress(e.target.checked)}
                          className="rounded"
                          data-testid="save-to-profile-checkbox"
                        />
                        <Label htmlFor="save-new-address" className="text-xs md:text-sm flex items-center gap-1 cursor-pointer">
                          <MapPin className="h-3 w-3" /> Save this address to my profile for next time
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Payment Method ── */}
              <div className="sacred-card rounded-xl p-4 md:p-6 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sf-primary text-sf-on-primary text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <h2 className="font-headline-md text-lg md:text-2xl text-sf-on-surface">Payment Method</h2>
                </div>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 md:p-4 border border-sf-outline-variant rounded-lg">
                    <RadioGroupItem value="cod" id="cod" data-testid="payment-cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      <span className="font-bold text-sm md:text-base text-sf-on-surface">{orderType === 'pickup' ? 'Pay at Store' : 'Cash on Delivery'}</span>
                      <p className="text-xs md:text-sm text-sf-on-surface-variant">{orderType === 'pickup' ? 'Pay by cash or UPI when you collect your order.' : 'Pay via cash or UPI when your items arrive.'}</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 md:p-4 border border-sf-outline-variant rounded-lg">
                    <RadioGroupItem value="online" id="online" data-testid="payment-online" />
                    <Label htmlFor="online" className="flex-1 cursor-pointer">
                      <span className="font-bold text-sm md:text-base text-sf-on-surface">Online Payment</span>
                      <p className="text-xs md:text-sm text-sf-on-surface-variant">Secure online payment via UPI, Cards or NetBanking.</p>
                    </Label>
                  </div>
                </RadioGroup>
                <div className="flex items-center gap-2 text-xs text-sf-on-surface-variant pt-1">
                  <span className="material-symbols-outlined text-sm text-green-700">shield</span>
                  Your transaction is secured with 256-bit SSL encryption. We respect your privacy.
                </div>
              </div>
            </div>

            {/* ── Order Summary ── */}
            <div className="lg:col-span-1">
              <div className="sacred-card rounded-xl p-4 md:p-6 space-y-3 md:space-y-4 sticky top-24">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-md text-lg md:text-2xl text-sf-on-surface">Order Summary</h3>
                  <span className="text-xs text-sf-on-surface-variant">({cart.items.length} Item{cart.items.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="space-y-2">
                  {cart.items.map((item) => (
                    <div key={item.product_id} className="flex justify-between text-xs md:text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-sf-on-surface line-clamp-1">{item.product.name}</p>
                        <p className="text-sf-on-surface-variant">₹{itemPrice(item).toLocaleString('en-IN')} × {item.quantity}</p>
                      </div>
                      <span className="font-medium ml-2 text-sf-on-surface flex-shrink-0">₹{(itemPrice(item) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 py-3 md:py-4 border-y border-sf-outline-variant text-sm md:text-base">
                  <div className="flex justify-between"><span className="text-sf-on-surface-variant">Subtotal</span><span className="font-bold text-sf-on-surface">₹{calculateTotal().toLocaleString('en-IN')}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sf-on-surface-variant">Discount{promoCode ? ` (${promoCode.toUpperCase()})` : ''}</span>
                      <span className="font-bold text-green-700">-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sf-on-surface-variant">{orderType === 'pickup' ? 'Pickup' : 'Delivery'}</span>
                    {deliveryFee > 0 ? (
                      <span className="font-bold text-sf-on-surface">₹{deliveryFee.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="font-bold text-sf-gold">FREE</span>
                    )}
                  </div>
                </div>
                {orderType === 'pickup' && pickupTime && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-sf-primary-container/5 text-xs text-sf-primary">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" /> Pickup: {pickupTime}
                  </div>
                )}
                <div className="flex justify-between text-base md:text-xl">
                  <span className="font-bold text-sf-on-surface">Total Amount</span>
                  <span className="font-bold text-sf-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <Button type="submit" className="w-full rounded py-4 md:py-6 font-semibold text-sm md:text-lg bg-sf-primary text-sf-on-primary hover:opacity-90" disabled={submitting} data-testid="place-order-button">
                  {submitting ? 'Placing your order…' : orderType === 'pickup' ? 'Review Pickup Order' : 'Place Order'}
                </Button>
                <div className="flex items-center justify-center gap-4 pt-1 text-sf-on-surface-variant">
                  <span className="material-symbols-outlined text-lg" title="Secure checkout">verified_user</span>
                  <span className="material-symbols-outlined text-lg" title="Encrypted">lock</span>
                  <span className="material-symbols-outlined text-lg" title="Multiple payment options">payments</span>
                </div>
              </div>

              <div className="sacred-card rounded-xl p-4 mt-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-sf-primary">support_agent</span>
                <div>
                  <p className="text-sm font-bold text-sf-on-surface">Need help with your order?</p>
                  <a href="tel:+919506711777" className="text-xs text-sf-on-surface-variant hover:text-sf-primary">Call us at +91 9506711777</a>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation modal — portal, outside scroll container */}
      {showConfirmModal && (
        <ConfirmOrderModal
          cart={cart}
          address={getDeliveryAddress()}
          paymentMethod={paymentMethod}
          orderType={orderType}
          pickupTime={pickupTime}
          discount={discount}
          promoCode={promoCode}
          total={grandTotal}
          onClose={() => { if (!submitting) setShowConfirmModal(false); }}
          onConfirm={placeOrder}
          submitting={submitting}
        />
      )}

      {/* Full-screen success overlay */}
      {showSuccess && (
        <OrderSuccessOverlay orderType={orderType} pickupTime={pickupTime} />
      )}
    </div>
  );
};

export default Checkout;