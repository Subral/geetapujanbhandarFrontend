import { useState, useEffect } from 'react';
import axios from 'axios';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Heart toggle for adding/removing a product from the wishlist.
 * Renders nothing functionally different when logged out — clicking it
 * opens the auth dialog via onRequireAuth.
 */
const WishlistButton = ({ productId, user, onRequireAuth, className = '', size = 'h-5 w-5' }) => {
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && productId) {
      checkStatus();
    } else {
      setInWishlist(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productId]);

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/wishlist/check/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInWishlist(res.data.in_wishlist);
    } catch (error) {
      // silently ignore
    }
  };

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      onRequireAuth?.();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (inWishlist) {
        await axios.delete(`${API}/wishlist/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await axios.post(`${API}/wishlist/${productId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={className}
      data-testid={`wishlist-toggle-${productId}`}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        className={size}
        style={{
          fill: inWishlist ? '#E53935' : 'none',
          color: inWishlist ? '#E53935' : '#8C7E76'
        }}
      />
    </button>
  );
};

export default WishlistButton;
