import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { ShoppingCart, Package, Shield, ChevronLeft, ChevronRight, Check, Star } from 'lucide-react';
import { toast } from 'sonner';
import AuthDialog from '../components/AuthDialog';
import SimilarProducts from '../components/SimilarProducts';
import { useProductTracking } from '../hooks/useProductTracking';
import useEmblaCarousel from 'embla-carousel-react';
import WishlistButton from '../components/WishlistButton';
import PincodeChecker from '../components/PincodeChecker';
import ProductReviews from '../components/ProductReviews';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from 03_product_detail (finalized Stitch canvas). All existing
// logic preserved: embla carousels, offers fetch, sibling-variant fetch
// (variant_group), tracking, reviews, similar products.
//
// TWO REAL FIXES, NOT JUST A RESTYLE:
//
// 1. The inline `sizes[]` selector was completely unreachable. This
//    product's own data model supports two parallel variant systems —
//    `sizes[]` (an array of {label, price, mrp} on one product doc) and
//    `variant_group`/`size_label` (separate sibling product documents).
//    Admin already writes to both. This page only ever read the sibling
//    system and never sent a `variant` on add-to-cart, so any product
//    using `sizes[]` had chips with no effect and Cart.js/Checkout.js's
//    variant-aware pricing logic could never actually receive a variant.
//    Consolidating the two systems into one is a separate, larger
//    decision (flagged, deferred) — but making the existing `sizes[]`
//    path actually work when it's the one in use is squarely this
//    page's job. Selecting a size now updates displayed price/MRP/stock
//    in place and is sent as `variant` on add-to-cart, exactly matching
//    what Cart.js and Checkout.js already expect. The sibling
//    (`variant_group`) navigation UI is unchanged — a product uses one
//    system or the other, not both.
//
// 2. Added a real "Buy Now" button — flagged in the very first audit
//    ("PDP only offers Add to Cart, forcing PDP → Cart → Checkout") and
//    never implemented. Adds to cart, then goes straight to checkout.
//
// Fly-to-cart animation: uses the `.animate-fly-to-cart` keyframe already
// defined in storefront-theme.css (built for this page, unused until
// now). Clones the product image and animates it toward the header's
// cart icon position, computed via getBoundingClientRect — not a fixed
// guess, and not requiring a cross-component ref into Navbar.

const ProductDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'cart' | 'buy'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [variants, setVariants] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const imageRef = useRef(null);
  const addToCartBtnRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/offers?active=true`).then((r) => setOffers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!product?.variant_group) {
      setVariants([]);
      return;
    }
    axios.get(`${API}/products`, { params: { variant_group: product.variant_group, limit: 30 } })
      .then((r) => setVariants(Array.isArray(r.data) ? r.data : []))
      .catch(() => setVariants([]));
  }, [product]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'center' });
  const [thumbEmblaRef, thumbEmblaApi] = useEmblaCarousel({ containScroll: 'keepSnaps', dragFree: true });

  const { trackView, trackAddToCart } = useProductTracking();

  const onThumbClick = useCallback((index) => {
    if (!emblaApi || !thumbEmblaApi) return;
    emblaApi.scrollTo(index);
  }, [emblaApi, thumbEmblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi || !thumbEmblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    thumbEmblaApi.scrollTo(emblaApi.selectedScrollSnap());
  }, [emblaApi, thumbEmblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    fetchProduct();
    setSelectedIndex(0);
    setQuantity(1);
    setAddedToCart(false);
    setSelectedSize(null);
    setActiveTab('description');
    window.scrollTo({ top: 0 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (product && user) {
      trackView(product.id);
    }
  }, [product, user, trackView]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
      setSelectedIndex(0);
      setAddedToCart(false);
      // Default to the first in-stock size if this product uses sizes[]
      if (response.data.sizes?.length > 0) {
        const firstAvailable = response.data.sizes.find((s) => s.stock !== 0) || response.data.sizes[0];
        setSelectedSize(firstAvailable.label);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  // Resolves price/mrp/stock for the currently selected size, falling
  // back to the base product when this product doesn't use sizes[].
  const activeSizeData = product?.sizes?.length > 0
    ? product.sizes.find((s) => s.label === selectedSize) || product.sizes[0]
    : null;
  const effectivePrice = activeSizeData?.price ?? product?.price;
  const effectiveMrp = activeSizeData?.mrp ?? product?.mrp;
  const effectiveStock = activeSizeData ? (activeSizeData.stock ?? product?.stock) : product?.stock;
  const discountPct = effectiveMrp && effectiveMrp > effectivePrice
    ? Math.round((1 - effectivePrice / effectiveMrp) * 100) : 0;

  // Switching sizes can lower the available stock below the quantity
  // already selected (e.g. qty=5 on a 10-in-stock size, then switch to a
  // 2-in-stock size). The + button correctly disables at the new limit,
  // but without this, the already-selected quantity itself was never
  // pulled back down — Add to Cart would silently submit quantity=5 for
  // 2 in stock, only caught later at checkout's real stock validation.
  useEffect(() => {
    if (effectiveStock != null && quantity > effectiveStock) {
      setQuantity(Math.max(1, effectiveStock));
    }
  }, [effectiveStock, quantity]);

  const sizeVariants = variants.filter((v) => v.size_label);
  const colorVariants = variants.filter((v) => v.color_label);

  const flyToCart = () => {
    const btn = addToCartBtnRef.current;
    const img = imageRef.current;
    if (!btn || !img) return;
    const startRect = img.getBoundingClientRect();
    // No direct ref into Navbar's cart icon (different component tree) —
    // animate toward its real on-screen position via a data attribute
    // instead of a fixed guess.
    const cartIcon = document.querySelector('[data-testid="cart-icon"], [data-testid="cart-icon-guest"]');
    const endRect = cartIcon ? cartIcon.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20 };

    const clone = img.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = `${startRect.left}px`;
    clone.style.top = `${startRect.top}px`;
    clone.style.width = `${startRect.width}px`;
    clone.style.height = `${startRect.height}px`;
    clone.style.borderRadius = '12px';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    clone.style.setProperty('--fly-x', `${endRect.left - startRect.left}px`);
    clone.style.setProperty('--fly-y', `${endRect.top - startRect.top}px`);
    clone.classList.add('animate-fly-to-cart');
    // .animate-fly-to-cart is scoped under .storefront-shell in
    // storefront-theme.css (same technique as every other custom class
    // in this theme). Appending to document.body directly would put the
    // clone outside that scope and the animation would silently never
    // apply. Appending inside the page's own .storefront-shell wrapper
    // instead — position: fixed still positions relative to the
    // viewport regardless of DOM nesting, so this doesn't change where
    // it renders on screen.
    const shell = document.querySelector('.storefront-shell') || document.body;
    shell.appendChild(clone);
    setTimeout(() => clone.remove(), 750);
  };

  const addToCartRequest = async (activeUser) => {
    const token = localStorage.getItem('token');
    await axios.post(`${API}/cart`,
      { product_id: product.id, quantity, variant: activeSizeData ? selectedSize : null },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    trackAddToCart(product.id);
  };

  const handleAddToCart = async (activeUser = user) => {
    if (!activeUser) { setPendingAction('cart'); setShowAuth(true); return; }
    try {
      flyToCart();
      await addToCartRequest(activeUser);
      setAddedToCart(true);
      toast.success('Added to cart!', {
        action: { label: 'View Cart', onClick: () => navigate('/cart') },
      });
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = async (activeUser = user) => {
    if (!activeUser) { setPendingAction('buy'); setShowAuth(true); return; }
    try {
      await addToCartRequest(activeUser);
      navigate('/checkout');
    } catch (error) {
      toast.error('Could not start checkout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-sf-primary">progress_activity</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center text-sf-on-surface-variant">
        Product not found
      </div>
    );
  }

  const allImages = [product.image, ...(product.images || [])];
  const TABS = [
    { key: 'description', label: 'Description' },
    { key: 'specifications', label: 'Specifications' },
    { key: 'care', label: 'Care Instructions' },
  ];

  return (
    <>
      <div className="storefront-shell min-h-screen bg-sf-background py-6 md:py-12 px-4 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-sf-on-surface-variant mb-4 flex items-center gap-1">
            <Link to="/" className="hover:text-sf-primary">Home</Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <Link to="/products" className="hover:text-sf-primary">Products</Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-sf-primary font-medium">{product.category || product.material}</span>
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">

            {/* Image Gallery */}
            <div className="space-y-3 md:space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-sf-outline-variant">
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="flex">
                    {allImages.map((img, idx) => (
                      <div key={idx} className="flex-[0_0_100%] min-w-0">
                        <div className="aspect-square">
                          <img loading="lazy"
                            ref={idx === selectedIndex ? imageRef : null}
                            src={img}
                            alt={`${product.name} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {effectiveStock > 0 && effectiveStock < 10 && (
                  <span className="absolute top-3 left-3 bg-sf-primary text-sf-on-primary text-[11px] font-bold px-2.5 py-1 rounded-full animate-low-stock-pulse z-10">
                    Only {effectiveStock} left in stock — order soon
                  </span>
                )}

                {allImages.length > 1 && (
                  <>
                    <button onClick={scrollPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow transition-all z-10">
                      <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    <button onClick={scrollNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow transition-all z-10">
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, idx) => (
                        <button key={idx} onClick={() => onThumbClick(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === selectedIndex ? 'bg-sf-primary w-4' : 'bg-white/70'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="overflow-hidden" ref={thumbEmblaRef}>
                  <div className="flex gap-2">
                    {allImages.map((img, idx) => (
                      <button key={idx} onClick={() => onThumbClick(idx)}
                        className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${idx === selectedIndex ? 'border-sf-primary' : 'border-sf-outline-variant hover:border-sf-primary/50'}`}>
                        <img loading="lazy" src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4 md:space-y-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="font-headline-lg text-xl md:text-4xl text-sf-on-surface mb-2 md:mb-4">
                    {product.name}
                  </h1>
                  <WishlistButton
                    productId={product.id}
                    user={user}
                    onRequireAuth={() => setShowAuth(true)}
                    size="h-6 w-6 md:h-7 md:w-7"
                    className="flex-shrink-0 mt-1"
                  />
                </div>
                {product.review_count > 0 && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="h-4 w-4 fill-sf-gold text-sf-gold" />
                    <span className="text-sm font-medium text-sf-on-surface">{product.avg_rating}</span>
                    <span className="text-sm text-sf-on-surface-variant">({product.review_count} verified review{product.review_count !== 1 ? 's' : ''})</span>
                  </div>
                )}
                <div>
                  <p className="text-2xl md:text-4xl font-bold text-sf-on-surface">
                    <sup className="text-sm md:text-lg">₹</sup>{effectivePrice?.toLocaleString('en-IN')}
                    {discountPct > 0 && (
                      <>
                        {' '}<span className="text-sm md:text-lg font-normal text-sf-on-surface-variant line-through">₹{effectiveMrp?.toLocaleString('en-IN')}</span>
                        {' '}<span className="text-sm md:text-lg font-bold text-green-700">{discountPct}% OFF</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs md:text-sm text-sf-on-surface-variant">Inclusive of all taxes</p>
                </div>

                {offers.length > 0 && (
                  <div className="mt-3 md:mt-4">
                    <h3 className="text-sm md:text-base font-bold mb-2 flex items-center gap-1 text-sf-on-surface">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sf-primary text-sf-on-primary text-xs">%</span>
                      Offers
                    </h3>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                      {offers.map((offer) => (
                        <div key={offer.id} className="flex-shrink-0 w-44 md:w-52 border border-sf-outline-variant rounded-lg p-2.5 bg-white" data-testid={`offer-card-${offer.code}`}>
                          <p className="text-xs md:text-sm font-bold mb-0.5 text-sf-on-surface">{offer.title}</p>
                          <p className="text-[10px] md:text-xs text-sf-on-surface-variant line-clamp-2">{offer.description}</p>
                          <p className="text-[10px] md:text-xs font-semibold mt-1 text-sf-primary">Code: {offer.code}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline sizes[] selector — now genuinely wired to add-to-cart */}
                {product.sizes?.length > 0 && (
                  <div className="mt-3 md:mt-4">
                    <p className="text-sm md:text-base mb-2 text-sf-on-surface">Size: <span className="font-bold">{selectedSize}</span></p>
                    <div className="flex gap-2 flex-wrap">
                      {product.sizes.map((sz) => (
                        <button
                          key={sz.label}
                          onClick={() => setSelectedSize(sz.label)}
                          disabled={sz.stock === 0}
                          className={`border-2 rounded-lg px-3 py-2 text-center transition-colors disabled:opacity-40 ${selectedSize === sz.label ? 'border-sf-primary bg-sf-primary-container/5' : 'border-sf-outline-variant hover:border-sf-gold'}`}
                          data-testid={`size-chip-${sz.label}`}
                        >
                          <p className="text-xs md:text-sm font-semibold text-sf-on-surface">{sz.label}</p>
                          {sz.stock === 0 && <p className="text-[9px] font-semibold text-sf-primary">Out of stock</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sibling variant navigation — separate product documents */}
                {colorVariants.length > 1 && (
                  <div className="mt-3 md:mt-4">
                    <p className="text-sm md:text-base mb-2 text-sf-on-surface">Colour: <span className="font-bold">{product.color_label || 'Select'}</span></p>
                    <div className="flex gap-2 flex-wrap">
                      {colorVariants.map((v) => (
                        <Link key={v.id} to={`/products/${v.id}`}
                          className={`border-2 rounded-lg p-1 transition-colors ${v.id === product.id ? 'border-sf-primary' : 'border-sf-outline-variant hover:border-sf-gold'}`}
                          data-testid={`color-variant-${v.id}`}>
                          <img src={v.image} alt={v.color_label} className="w-14 h-14 md:w-16 md:h-16 object-cover rounded" />
                          <p className="text-[10px] md:text-xs mt-1 text-center font-medium text-sf-on-surface">{v.color_label}</p>
                          <p className="text-[10px] md:text-xs text-center font-bold text-sf-primary">₹{v.price?.toLocaleString('en-IN')}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {sizeVariants.length > 1 && (
                  <div className="mt-3 md:mt-4">
                    <p className="text-sm md:text-base mb-2 text-sf-on-surface">Size: <span className="font-bold">{product.size_label || 'Select'}</span></p>
                    <div className="flex gap-2 flex-wrap">
                      {sizeVariants.map((v) => (
                        <Link key={v.id} to={`/products/${v.id}`}
                          className={`border-2 rounded-lg px-3 py-2 text-center transition-colors ${v.id === product.id ? 'border-sf-primary bg-sf-primary-container/5' : 'border-sf-outline-variant hover:border-sf-gold'}`}
                          data-testid={`size-variant-${v.id}`}>
                          <p className="text-xs md:text-sm font-semibold text-sf-on-surface">{v.size_label}</p>
                          <p className="text-xs md:text-sm font-bold text-sf-primary">₹{v.price?.toLocaleString('en-IN')}</p>
                          {v.mrp && v.mrp > v.price && (
                            <p className="text-[10px] text-sf-on-surface-variant line-through">₹{v.mrp.toLocaleString('en-IN')}</p>
                          )}
                          {v.stock === 0 && <p className="text-[9px] font-semibold text-sf-primary">Out of stock</p>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 md:gap-4 py-3 md:py-4 border-y border-sf-outline-variant">
                <span className="px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium bg-sf-secondary-container/30 text-sf-secondary">
                  {product.deity} Ji
                </span>
                <span className="px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium border border-sf-gold text-sf-gold">
                  {product.material}
                </span>
              </div>

              {/* Tabs — Description / Specifications / Care Instructions */}
              <div>
                <div className="flex gap-4 border-b border-sf-outline-variant mb-3">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`pb-2 text-sm md:text-base font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.key ? 'border-sf-primary text-sf-primary' : 'border-transparent text-sf-on-surface-variant hover:text-sf-on-surface'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {activeTab === 'description' && (
                  <p className="text-xs md:text-base text-sf-on-surface-variant leading-relaxed animate-page-enter">{product.description}</p>
                )}
                {activeTab === 'specifications' && (
                  <div className="text-xs md:text-base text-sf-on-surface-variant space-y-1 animate-page-enter">
                    {product.dimensions && <p><span className="font-medium text-sf-on-surface">Dimensions:</span> {product.dimensions}</p>}
                    {product.weight && <p><span className="font-medium text-sf-on-surface">Weight:</span> {product.weight}</p>}
                    <p><span className="font-medium text-sf-on-surface">Material:</span> {product.material}</p>
                  </div>
                )}
                {activeTab === 'care' && (
                  <p className="text-xs md:text-base text-sf-on-surface-variant leading-relaxed animate-page-enter">
                    Wipe gently with a soft, dry cloth. Avoid harsh chemicals or abrasive cleaners on brass and marble
                    finishes. Keep away from direct moisture to preserve the antique finish.
                  </p>
                )}
              </div>

              {/* Sacred Notes */}
              <div className="flex gap-3 items-start p-4 rounded-xl bg-sf-surface-container-low">
                <span className="material-symbols-outlined text-sf-gold text-2xl">auto_awesome</span>
                <div>
                  <h4 className="font-bold text-sm text-sf-on-surface mb-1">Sacred Notes</h4>
                  <p className="text-xs text-sf-on-surface-variant leading-relaxed">
                    Best placed facing the north-east (Ishan Kon) direction, believed to channel positive energy
                    throughout your living space.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-4 py-4 md:py-6">
                <div className="text-center space-y-1 md:space-y-2">
                  <Shield className="h-5 w-5 md:h-8 md:w-8 mx-auto text-sf-primary" />
                  <p className="text-xs md:text-sm text-sf-on-surface-variant">Vedic Certified</p>
                </div>
                <div className="text-center space-y-1 md:space-y-2">
                  <Package className="h-5 w-5 md:h-8 md:w-8 mx-auto text-sf-gold" />
                  <p className="text-xs md:text-sm text-sf-on-surface-variant">Secure Packing</p>
                </div>
                <div className="text-center space-y-1 md:space-y-2">
                  <ShoppingCart className="h-5 w-5 md:h-8 md:w-8 mx-auto text-sf-primary" />
                  <p className="text-xs md:text-sm text-sf-on-surface-variant">Fast Delivery</p>
                </div>
              </div>

              <PincodeChecker />

              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-8 w-8 md:h-10 md:w-10 p-0"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} data-testid="decrease-quantity">
                    -
                  </Button>
                  <span className="text-base md:text-xl font-bold w-8 md:w-12 text-center text-sf-on-surface">{quantity}</span>
                  <Button variant="outline" className="h-8 w-8 md:h-10 md:w-10 p-0"
                    onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                    disabled={quantity >= effectiveStock} data-testid="increase-quantity">
                    +
                  </Button>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <Button
                    ref={addToCartBtnRef}
                    className={`w-full rounded py-4 md:py-6 font-semibold text-sm md:text-lg transition-all ${addedToCart ? 'bg-green-600 hover:bg-green-600' : 'bg-sf-primary hover:opacity-90'} text-sf-on-primary`}
                    onClick={handleAddToCart}
                    disabled={effectiveStock === 0}
                    data-testid="add-to-cart-button"
                  >
                    {addedToCart ? (
                      <><Check className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Added to Cart!</>
                    ) : (
                      <><ShoppingCart className="mr-2 h-4 w-4 md:h-5 md:w-5" /> {effectiveStock === 0 ? 'Out of Stock' : 'Add to Cart'}</>
                    )}
                  </Button>

                  {!addedToCart && effectiveStock > 0 && (
                    <Button
                      variant="outline"
                      className="w-full rounded py-4 md:py-6 font-semibold text-sm md:text-lg border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-on-primary"
                      onClick={handleBuyNow}
                      data-testid="buy-now-button"
                    >
                      Buy It Now
                    </Button>
                  )}

                  {addedToCart && (
                    <Button
                      variant="outline"
                      className="w-full rounded py-4 md:py-6 font-semibold text-sm md:text-lg border-sf-primary text-sf-primary"
                      onClick={() => navigate('/cart')}
                    >
                      View Cart
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <SimilarProducts productId={product.id} currentCategory={product.category} />

          <ProductReviews productId={product.id} user={user} />
        </div>
      </div>
      {showAuth && (
        <AuthDialog
          open={showAuth}
          onClose={() => setShowAuth(false)}
          onSuccess={(freshUser) => {
            if (pendingAction === 'cart') handleAddToCart(freshUser);
            else if (pendingAction === 'buy') handleBuyNow(freshUser);
            setPendingAction(null);
          }}
        />
      )}
    </>
  );
};

export default ProductDetail;
