import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Similar Products Component
 * Shows products similar to the current product using ML similarity.
 * 
 * Used on Product Detail pages for "You might also like" sections.
 */
const SimilarProducts = ({ productId, currentCategory }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      if (!productId) return;
      
      try {
        const response = await axios.get(`${API}/recommendations/similar/${productId}?limit=4`);
        setSimilarProducts(response.data.products || []);
      } catch (error) {
        console.error('Failed to fetch similar products:', error);
        setSimilarProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [productId]);

  if (loading) {
    return (
      <div className="mt-6 md:mt-8">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg animate-pulse">
              <div className="aspect-square" />
              <div className="p-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 w-12 bg-gray-200 rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 md:mt-8" data-testid="similar-products">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-[#E53935]" />
        <h3 className="text-sm md:text-base font-bold text-gray-800">
          You Might Also Like
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {similarProducts.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            data-testid={`similar-product-${product.id}`}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <p className="text-[10px] md:text-xs font-medium text-gray-800 line-clamp-2">
                {product.name}
              </p>
              <p className="text-xs md:text-sm font-bold text-[#E53935] mt-1">
                ₹{product.price?.toLocaleString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarProducts;
