import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import PincodeChecker from '../components/PincodeChecker';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from 04_cart (finalized Stitch canvas, post 6 correction rounds).
//
// All real logic is unchanged from before: fetchCart, itemPrice (variant-
// aware pricing), updateQuantity, removeItem, calculateTotal, promo code
// apply/remove, and the config-driven free-delivery threshold (real
// values from /config — not the {{FREE_DELIVERY_THRESHOLD}} token that
// sat in the design through six revision rounds).
//
// ONE REAL ADDITION: "Complete Your Pooja" in the source design shows
// three fixed, fake items (Organic Kumkum ₹45, Bhimseni Camphor ₹120,
// Cotton Wicks ₹35) with no backend behind them. Wired to the real
// catalog instead — the four cheapest available products, using the
// sort=price_asc param added to /products during the Products.js
// rebuild — with a working "Add" button that hits the real /cart
// endpoint, rather than decorative items that don't add anything.

const Cart = ({ user }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [config, setConfig] = useState({ delivery_fee: 0, free_delivery_threshold: 0 });
  const [crossSell, setCrossSell] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
    axios.get(`${API}/config`).then((r) => setConfig(r.data)).catch(() => {});
    fetchCrossSell();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrossSell = async () => {
    try {
      const response = await axios.get(`${API}/products`, {
        params: { sort: 'price_asc', limit: 4 },
      });
      setCrossSell(response.data);
    } catch (error) {
      console.error('Error fetching cross-sell items:', error);
    }
  };

  // Unit price for a cart line: size variant price wins over base price
  const itemPrice = (item) => {
    if (item.variant && item.product?.sizes) {
      const size = item.product.sizes.find((sz) => sz.label === item.variant);
      if (size?.price != null) return size.price;
    }
    return item.product?.price || 0;
  };

  const updateQuantity = async (productId, newQuantity, variant) => {
    try {
      const token = localStorage.getItem('token');
      const variantParam = variant ? `&variant=${encodeURIComponent(variant)}` : '';
      await axios.put(`${API}/cart/${productId}?quantity=${newQuantity}${variantParam}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCart();
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const removeItem = async (productId, variant) => {
    try {
      const token = localStorage.getItem('token');
      const variantParam = variant ? `?variant=${encodeURIComponent(variant)}` : '';
      await axios.delete(`${API}/cart/${productId}${variantParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Item removed from cart');
      fetchCart();
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const addRitualItem = async (product) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/cart`, { product_id: product.id, quantity: 1 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${product.name} added`);
      fetchCart();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const calculateTotal = () => cart.items.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0);

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }
    setPromoLoading(true);
    try {
      const response = await axios.post(`${API}/validate-promo?code=${promoCode.toUpperCase()}&total=${calculateTotal()}`);
      setAppliedPromo(response.data.offer);
      setDiscount(response.data.discount);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setDiscount(0);
    setPromoCode('');
    toast.success('Promo code removed');
  };

  const freeDeliveryUnlocked = config.delivery_fee <= 0 ||
    (config.free_delivery_threshold > 0 && (calculateTotal() - discount) >= config.free_delivery_threshold);
  const grandTotal = calculateTotal() - discount + (freeDeliveryUnlocked ? 0 : config.delivery_fee);

  if (loading) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-sf-primary">progress_activity</span>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex flex-col items-center justify-center py-12 px-4 text-center animate-page-enter">
        <span className="material-symbols-outlined text-6xl text-sf-outline-variant mb-4">shopping_cart</span>
        <h2 className="font-headline-lg text-2xl md:text-3xl text-sf-on-surface mb-2">Your cart is empty</h2>
        <p className="text-sf-on-surface-variant mb-6 max-w-sm">
          Explore our collection and find something for your sacred space.
        </p>
        <Link to="/products">
          <Button className="rounded px-8 py-6 bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="continue-shopping-button">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="storefront-shell min-h-screen bg-sf-background py-6 md:py-12 px-4 pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 md:mb-8 animate-page-enter">
          <h1 className="font-headline-lg text-2xl md:text-4xl text-sf-on-surface">Sacred Basket</h1>
          <p className="text-sf-on-surface-variant text-sm mt-1">Prepare for your spiritual journey with mindful selections.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            {freeDeliveryUnlocked ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm font-medium">
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                Free delivery included on this order
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-sf-secondary-container/20 border border-sf-secondary-container/40">
                <p className="text-sm font-medium text-sf-secondary">
                  Add ₹{(config.free_delivery_threshold - (calculateTotal() - discount)).toLocaleString('en-IN')} more for free delivery! 🚚
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sf-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, ((calculateTotal() - discount) / config.free_delivery_threshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {cart.items.map((item) => (
              <div
                key={item.product_id}
                className="sacred-card rounded-xl p-3 md:p-6 flex gap-3 md:gap-6"
                data-testid={`cart-item-${item.product_id}`}
              >
                <img loading="lazy"
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline-sm text-sm md:text-lg text-sf-on-surface line-clamp-2 mb-1">
                    {item.product.name}
                  </h3>
                  <p className="text-xs md:text-sm text-sf-on-surface-variant mb-1">
                    {item.product.material}{item.variant ? ` • Size: ${item.variant}` : ''}
                  </p>
                  <p className="text-sm md:text-lg font-bold text-sf-primary">
                    ₹{itemPrice(item).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-10 md:w-10"
                    onClick={() => removeItem(item.product_id, item.variant)}
                    data-testid={`remove-item-${item.product_id}`}
                  >
                    <Trash2 className="h-4 w-4 md:h-5 md:w-5 text-sf-primary" />
                  </Button>
                  <div className="flex items-center gap-1 md:gap-2 border border-sf-outline-variant rounded-full px-2 md:px-3 py-1">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.variant)} data-testid={`decrease-${item.product_id}`}>
                      <Minus className="h-3 w-3 md:h-4 md:w-4 text-sf-on-surface-variant" />
                    </button>
                    <span className="font-bold w-5 md:w-8 text-center text-xs md:text-base text-sf-on-surface">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.variant)} data-testid={`increase-${item.product_id}`}>
                      <Plus className="h-3 w-3 md:h-4 md:w-4 text-sf-on-surface-variant" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Complete Your Pooja — real cheapest-items cross-sell, not
                fixed fake products with invented prices. */}
            {crossSell.length > 0 && (
              <div className="sacred-card rounded-xl p-4 md:p-6">
                <h3 className="font-headline-sm text-base md:text-lg text-sf-on-surface mb-3">Complete Your Pooja</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {crossSell.map((product) => (
                    <div key={product.id} className="text-center">
                      <img src={product.image} alt={product.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                      <p className="text-xs font-medium text-sf-on-surface line-clamp-1">{product.name}</p>
                      <p className="text-xs text-sf-primary font-bold mb-1.5">₹{product.price.toLocaleString('en-IN')}</p>
                      <button
                        onClick={() => addRitualItem(product)}
                        className="w-full text-[11px] font-bold border border-sf-primary text-sf-primary rounded-full py-1 hover:bg-sf-primary hover:text-sf-on-primary transition-colors"
                        data-testid={`add-ritual-${product.id}`}
                      >
                        Add Ritual
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ritual Assurance trust block */}
            <div className="flex gap-3 items-start p-4 rounded-xl bg-sf-surface-container-low">
              <span className="material-symbols-outlined text-sf-gold text-2xl">self_care</span>
              <div>
                <h4 className="font-bold text-sm text-sf-on-surface mb-1">Ritual Assurance</h4>
                <p className="text-xs text-sf-on-surface-variant leading-relaxed">
                  Every item in your cart is handled with spiritual sanctity and undergoes a quality
                  check before dispatch. Delivery across Lucknow in 2–3 days.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sacred-card rounded-xl p-4 md:p-6 space-y-3 md:space-y-4 sticky top-24">
              <h3 className="font-headline-md text-lg md:text-2xl text-sf-on-surface">Order Summary</h3>

              <div className="space-y-2 md:space-y-3 pb-3 md:pb-4 border-b border-sf-outline-variant">
                <p className="text-xs md:text-sm text-sf-on-surface-variant mb-2">Have a promo code?</p>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-green-50 border border-green-200">
                    <div>
                      <p className="font-bold text-xs md:text-sm text-green-800">{appliedPromo.code}</p>
                      <p className="text-xs text-green-700">{appliedPromo.title}</p>
                    </div>
                    <button onClick={removePromoCode} className="text-sf-primary text-xs md:text-sm font-medium">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 px-2 md:px-3 py-2 text-xs md:text-sm border border-sf-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-sf-primary/30"
                      data-testid="promo-code-input"
                    />
                    <button
                      onClick={applyPromoCode}
                      disabled={promoLoading}
                      className="px-3 md:px-4 py-2 rounded-lg font-medium text-white text-xs md:text-sm bg-sf-primary hover:opacity-90 disabled:opacity-60"
                      data-testid="apply-promo-button"
                    >
                      {promoLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 py-3 md:py-4 border-y border-sf-outline-variant text-sm md:text-base">
                <div className="flex justify-between">
                  <span className="text-sf-on-surface-variant">Subtotal</span>
                  <span className="font-bold text-sf-on-surface">₹{calculateTotal().toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="text-xs md:text-sm">Discount ({appliedPromo?.code})</span>
                    <span className="font-bold">-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sf-on-surface-variant">Delivery</span>
                  {freeDeliveryUnlocked ? (
                    <span className="font-bold text-sf-gold">FREE</span>
                  ) : (
                    <span className="font-bold text-sf-on-surface">₹{config.delivery_fee.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-base md:text-xl">
                <span className="font-bold text-sf-on-surface">Total Amount</span>
                <span className="font-bold text-sf-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>

              <Button
                className="w-full rounded py-4 md:py-6 font-semibold text-sm md:text-lg bg-sf-primary text-sf-on-primary hover:opacity-90"
                onClick={() => navigate('/checkout', { state: { promoCode: appliedPromo?.code, discount } })}
                data-testid="proceed-to-checkout-button"
              >
                Proceed to Checkout
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-sf-on-surface-variant">
                <span className="material-symbols-outlined text-sm">lock</span>
                Secure checkout · 256-bit SSL encrypted
              </p>

              <PincodeChecker compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
