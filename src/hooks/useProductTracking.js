import { useCallback, useRef, useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Hook for tracking user interactions with products.
 * Tracks views, add-to-cart events, and purchases.
 * 
 * Features:
 * - Debounced view tracking (avoids duplicate views)
 * - Batch tracking support for efficiency
 * - Automatic retry on failure
 * - Queue system for offline support
 */
export const useProductTracking = () => {
  const viewedProducts = useRef(new Set());
  const trackingQueue = useRef([]);
  const isProcessingQueue = useRef(false);

  // Process queued interactions
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || trackingQueue.current.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) {
      // No backend support for anonymous tracking exists yet
      // (/tracking/interaction requires an authenticated user). Previously
      // this returned before the queue was cleared below, so every view/
      // add-to-cart from an anonymous visitor accumulated in memory for the
      // rest of the session with no upper bound. Cleared explicitly here so
      // anonymous events are dropped cleanly instead of leaking.
      trackingQueue.current = [];
      return;
    }

    isProcessingQueue.current = true;
    const interactions = [...trackingQueue.current];
    trackingQueue.current = [];

    try {
      if (interactions.length === 1) {
        await axios.post(`${API}/tracking/interaction`, interactions[0], {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (interactions.length > 1) {
        await axios.post(`${API}/tracking/batch`, interactions, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // Re-queue failed interactions
      trackingQueue.current = [...interactions, ...trackingQueue.current];
      console.error('Failed to track interactions:', error);
    } finally {
      isProcessingQueue.current = false;
    }
  }, []);

  // Track a product view
  const trackView = useCallback((productId) => {
    if (!productId) return;
    
    // Debounce: Don't track the same product view within a session
    const viewKey = `${productId}-${Date.now().toString().slice(0, -5)}`; // 100 second window
    if (viewedProducts.current.has(viewKey)) return;
    viewedProducts.current.add(viewKey);

    trackingQueue.current.push({
      product_id: productId,
      interaction_type: 'view'
    });

    // Debounce queue processing
    setTimeout(processQueue, 500);
  }, [processQueue]);

  // Track add to cart
  const trackAddToCart = useCallback((productId) => {
    if (!productId) return;

    trackingQueue.current.push({
      product_id: productId,
      interaction_type: 'add_to_cart'
    });

    // Process immediately for important actions
    processQueue();
  }, [processQueue]);

  // Track purchase (called when order is completed)
  const trackPurchase = useCallback((productIds) => {
    if (!productIds || productIds.length === 0) return;

    productIds.forEach(productId => {
      trackingQueue.current.push({
        product_id: productId,
        interaction_type: 'purchase'
      });
    });

    processQueue();
  }, [processQueue]);

  // Process queue on unmount
  useEffect(() => {
    return () => {
      if (trackingQueue.current.length > 0) {
        processQueue();
      }
    };
  }, [processQueue]);

  return {
    trackView,
    trackAddToCart,
    trackPurchase
  };
};

/**
 * Hook for fetching personalized recommendations.
 */
export const useRecommendations = (limit = 10) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [recommendationType, setRecommendationType] = useState('');

  useEffect(() => {
    const fetchRecommendations = async () => {
      const token = localStorage.getItem('token');
      
      try {
        if (token) {
          // Authenticated user - get personalized recommendations
          const response = await axios.get(`${API}/recommendations?limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRecommendations(response.data.recommendations);
          setIsPersonalized(response.data.is_personalized);
          setRecommendationType(response.data.recommendation_type);
        } else {
          // Anonymous user - get trending products
          const response = await axios.get(`${API}/recommendations/trending?limit=${limit}`);
          setRecommendations(response.data.products);
          setIsPersonalized(false);
          setRecommendationType('trending');
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        // Fallback to trending on error
        try {
          const response = await axios.get(`${API}/recommendations/trending?limit=${limit}`);
          setRecommendations(response.data.products);
          setRecommendationType('trending');
        } catch {
          setRecommendations([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [limit]);

  return { recommendations, loading, isPersonalized, recommendationType };
};

export default useProductTracking;
