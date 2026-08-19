import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Heart, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WishlistButton from '../components/WishlistButton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from 09_wishlist (finalized Stitch canvas). All real logic
// (fetchWishlist, moveToCart) unchanged.
//
// "Move all to cart" is a real addition, not decoration — the design
// calls for it explicitly. Implemented the same way Reorder was on
// OrderDetail.js: loop the existing per-item add/remove calls across
// every wishlist item, report how many succeeded vs failed (an
// out-of-stock item won't block the rest), rather than requiring new
// backend infrastructure. A "price dropped" badge was considered and
// deliberately left out — there's no price-history data anywhere in
// this app to base it on, and a fabricated "was ₹X" figure would be
// worse than no badge at all.

const Wishlist = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movingAll, setMovingAll] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/wishlist`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveToCart = async (productId) => {
    setMovingId(productId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/cart`, { product_id: productId, quantity: 1 }, { headers: { Authorization: `Bearer ${token}` } });
      await axios.delete(`${API}/wishlist/${productId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Moved to cart!', { action: { label: 'View Cart', onClick: () => navigate('/cart') } });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (error) {
      toast.error('Failed to move to cart');
    } finally {
      setMovingId(null);
    }
  };

  const moveAllToCart = async () => {
    setMovingAll(true);
    const token = localStorage.getItem('token');
    const inStock = products.filter((p) => p.stock > 0);
    let successCount = 0;
    let failCount = 0;
    for (const product of inStock) {
      try {
        await axios.post(`${API}/cart`, { product_id: product.id, quantity: 1 }, { headers: { Authorization: `Bearer ${token}` } });
        await axios.delete(`${API}/wishlist/${product.id}`, { headers: { Authorization: `Bearer ${token}` } });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setMovingAll(false);
    const skipped = products.length - inStock.length;
    if (successCount > 0) {
      setProducts((prev) => prev.filter((p) => p.stock === 0));
      toast.success(
        failCount > 0 || skipped > 0
          ? `${successCount} item${successCount !== 1 ? 's' : ''} moved to cart. ${failCount + skipped} could not be moved.`
          : 'All items moved to cart!',
        { action: { label: 'View Cart', onClick: () => navigate('/cart') } }
      );
    } else {
      toast.error('Nothing could be moved — all remaining items may be out of stock.');
    }
  };

  if (loading) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-sf-primary">progress_activity</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex flex-col items-center justify-center py-12 px-4 text-center animate-page-enter">
        <Heart className="w-12 h-12 mb-4 text-sf-outline-variant" />
        <h2 className="font-headline-lg text-xl md:text-3xl text-sf-primary mb-2">Your wishlist is empty</h2>
        <p className="text-sm text-sf-on-surface-variant mb-6">Tap the heart on any product to save it here for later.</p>
        <Link to="/products">
          <Button className="rounded px-6 py-4 md:px-8 md:py-6 text-sm md:text-base bg-sf-primary text-sf-on-primary hover:opacity-90">
            Browse Products
          </Button>
        </Link>
      </div>
    );
  }

  const hasInStock = products.some((p) => p.stock > 0);

  return (
    <div className="storefront-shell min-h-screen bg-sf-background py-6 md:py-12 px-4 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4 md:mb-8 animate-page-enter">
          <div>
            <h1 className="font-headline-lg text-2xl md:text-4xl text-sf-primary">Your Divine Wishlist</h1>
            <p className="text-sm text-sf-on-surface-variant mt-1">Curated items waiting to bless your spiritual space.</p>
          </div>
          {hasInStock && (
            <Button
              onClick={moveAllToCart}
              disabled={movingAll}
              variant="outline"
              className="flex items-center gap-2 rounded border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-on-primary"
              data-testid="move-all-to-cart-button"
            >
              {movingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {movingAll ? 'Moving...' : 'Move all to cart'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {products.map((product) => (
            <div key={product.id} className="sacred-card card-hover rounded-xl overflow-hidden group relative" data-testid={`wishlist-item-${product.id}`}>
              <Link to={`/products/${product.id}`}>
                <div className="aspect-square overflow-hidden relative bg-sf-surface-container-low">
                  <img loading="lazy" src={product.image} alt={product.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${product.stock === 0 ? 'opacity-50 grayscale' : ''}`} />
                </div>
              </Link>
              <WishlistButton
                productId={product.id}
                user={user}
                size="h-4 w-4 md:h-5 md:w-5"
                className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 md:p-2 shadow"
              />
              <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                <Link to={`/products/${product.id}`}>
                  <h3 className="font-headline-sm text-sm md:text-lg text-sf-on-surface line-clamp-2">{product.name}</h3>
                </Link>
                <p className="text-base md:text-xl font-bold text-sf-primary">
                  ₹{product.price.toLocaleString('en-IN')}
                  {product.mrp && product.mrp > product.price && (
                    <span className="text-xs md:text-sm font-normal text-sf-on-surface-variant line-through ml-1.5">₹{product.mrp.toLocaleString('en-IN')}</span>
                  )}
                </p>
                <Button
                  onClick={() => moveToCart(product.id)}
                  disabled={product.stock === 0 || movingId === product.id || movingAll}
                  className="w-full rounded text-xs md:text-sm py-1.5 md:py-2 bg-sf-primary text-sf-on-primary hover:opacity-90"
                  data-testid={`move-to-cart-${product.id}`}
                >
                  <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                  {product.stock === 0 ? 'Out of Stock' : movingId === product.id ? 'Moving...' : 'Move to Cart'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
