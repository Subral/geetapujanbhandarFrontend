import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * AI-Powered Recommendations Component
 * 
 * Features:
 * - Personalized recommendations for logged-in users
 * - Trending products fallback for cold start (new/anonymous users)
 * - Smooth carousel with navigation
 * - Visual indicator of recommendation type
 */
const RecommendedForYou = ({ user, authReady = true, title = "Recommended for You" }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [recommendationType, setRecommendationType] = useState('');

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps'
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!authReady) return;   // ← add this line
    const fetchRecommendations = async () => {
      const token = localStorage.getItem('token');
      
      try {
        if (token && user) {
          // Authenticated user - get personalized recommendations
          const response = await axios.get(`${API}/recommendations?limit=12`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRecommendations(response.data.recommendations || []);
          setIsPersonalized(response.data.is_personalized);
          setRecommendationType(response.data.recommendation_type);
        } else {
          // Anonymous/new user - get trending products
          const response = await axios.get(`${API}/recommendations/trending?limit=12`);
          setRecommendations(response.data.products || []);
          setIsPersonalized(false);
          setRecommendationType('trending');
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);

        // If token is invalid/expired, clear it so user is treated as anonymous
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }

        // Fallback to trending on error
        try {
          const response = await axios.get(`${API}/recommendations/trending?limit=12`);
          setRecommendations(response.data.products || []);
          setRecommendationType('trending');
        } catch {
          setRecommendations([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user, authReady]);

  if (loading) {
    return (
      <div className="px-3 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-36 md:w-44">
                <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 bg-gray-200 rounded mt-2 animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded mt-1 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If personalized recommendations are empty but user is logged in,
  // show trending products as a fallback (they've explored everything!)
  if (recommendations.length === 0 && user && recommendationType === 'personalized') {
    // Fetch trending as fallback
    const fetchTrending = async () => {
      try {
        const response = await axios.get(`${API}/recommendations/trending?limit=12`);
        setRecommendations(response.data.products || []);
        setRecommendationType('trending_fallback');
      } catch {
        // Still nothing, hide section
      }
    };
    fetchTrending();
    return null; // Will re-render when trending data loads
  }

  if (recommendations.length === 0) {
    return null;
  }

  // Dynamic title based on recommendation type
  const displayTitle = isPersonalized && recommendationType !== 'trending_fallback' ? title : "Trending Now";
  const Icon = isPersonalized && recommendationType !== 'trending_fallback' ? Sparkles : TrendingUp;

  return (
    <div className="px-3 py-3 md:py-4" data-testid="recommendations-section">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-[#E53935]" />
            <h3 className="text-sm md:text-base font-bold text-gray-800">
              {displayTitle}
            </h3>
            {isPersonalized && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-[#E53935]/10 to-[#FF6F61]/10 text-[#E53935] font-medium">
                AI Powered
              </span>
            )}
          </div>
          
          {/* Navigation Arrows */}
          <div className="flex gap-1">
            <button
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className={`p-1.5 rounded-full shadow transition-all ${
                canScrollPrev 
                  ? 'bg-white hover:bg-gray-50 text-gray-700' 
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
              data-testid="recommendations-prev"
            >
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            </button>
            <button
              onClick={scrollNext}
              disabled={!canScrollNext}
              className={`p-1.5 rounded-full shadow transition-all ${
                canScrollNext 
                  ? 'bg-white hover:bg-gray-50 text-gray-700' 
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
              data-testid="recommendations-next"
            >
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-2 md:gap-3">
            {recommendations.map((product, index) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="flex-[0_0_42%] md:flex-[0_0_20%] lg:flex-[0_0_16%] min-w-0 group"
                data-testid={`recommendation-${index}`}
              >
                <div className="bg-white rounded-lg md:rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-[#E53935]/30">
                  {/* Product Image */}
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Recommendation score badge (subtle) */}
                    {product.recommendation_score && product.recommendation_score > 0.5 && (
                      <div className="absolute top-1.5 right-1.5 bg-[#E53935] text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                        <Sparkles className="h-2 w-2 md:h-2.5 md:w-2.5" />
                        <span className="hidden md:inline">Top Pick</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-2 md:p-3">
                    <p className="text-[10px] md:text-xs font-medium text-gray-800 line-clamp-2 min-h-[2.5em]">
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs md:text-sm font-bold text-[#E53935]">
                        ₹{product.price?.toLocaleString()}
                      </p>
                      {product.material && (
                        <span className="text-[8px] md:text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {product.material}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Cold Start Hint for new users */}
        {!isPersonalized && user && (
          <p className="text-[10px] md:text-xs text-gray-500 mt-2 text-center">
            Browse more products to get personalized recommendations
          </p>
        )}
      </div>
    </div>
  );
};

export default RecommendedForYou;
