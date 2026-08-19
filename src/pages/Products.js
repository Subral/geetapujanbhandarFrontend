import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { SlidersHorizontal, X, Star } from 'lucide-react';
import { deities, materials } from '../utils/constants';
import WishlistButton from '../components/WishlistButton';
import AuthDialog from '../components/AuthDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PAGE_SIZE = 12;

const Products = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [filters, setFilters] = useState({
    deity: searchParams.get('deity') || '',
    material: searchParams.get('material') || '',
    category: searchParams.get('category') || ''
  });
  const [adminCategories, setAdminCategories] = useState([]);
  const [sort, setSort] = useState('newest');
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    // Load categories created in the admin panel to power the filters
    const loadCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setAdminCategories(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Merge built-in options with admin-created ones (deduped, case-insensitive)
  const mergeOptions = (base, extra) => {
    const seen = new Set();
    return [...base, ...extra].filter((name) => {
      if (!name || seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase());
      return true;
    });
  };
  const deityOptions = mergeOptions(
    deities.map((d) => d.name),
    adminCategories.filter((c) => c.type === 'deity').map((c) => c.name)
  );
  const materialOptions = mergeOptions(
    materials.map((m) => m.value),
    adminCategories.filter((c) => c.type === 'material').map((c) => c.name)
  );
  const categoryOptions = mergeOptions(
    [],
    adminCategories.filter((c) => !['deity', 'material'].includes(c.type)).map((c) => c.name)
  );

  useEffect(() => {
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchQuery, sort]);

  const fetchProducts = async (append = false) => {
    try {
      if (append) setLoadingMore(true); else setLoading(true);
      const params = new URLSearchParams();
      if (filters.deity && filters.deity !== 'all') params.append('deity', filters.deity);
      if (filters.material && filters.material !== 'all') params.append('material', filters.material);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (searchQuery) params.append('search', searchQuery);
      if (sort) params.append('sort', sort);
      params.append('limit', PAGE_SIZE);
      params.append('skip', append ? products.length : 0);

      const response = await axios.get(`${API}/products?${params.toString()}`);
      setHasMore(response.data.length === PAGE_SIZE);
      setProducts(append ? [...products, ...response.data] : response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value === 'all' ? '' : value };
    setFilters(newFilters);
    
    const params = new URLSearchParams(searchParams);
    if (newFilters.deity) {
      params.set('deity', newFilters.deity);
    } else {
      params.delete('deity');
    }
    if (newFilters.material) {
      params.set('material', newFilters.material);
    } else {
      params.delete('material');
    }
    if (newFilters.category) {
      params.set('category', newFilters.category);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({ deity: '', material: '', category: '' });
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    setSearchParams(params);
    setShowFilters(false);
  };

  const activeFilterCount = (filters.deity ? 1 : 0) + (filters.material ? 1 : 0) + (filters.category ? 1 : 0);

  return (
    <div className="storefront-shell min-h-screen bg-sf-background py-6 md:py-12 px-4 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6 md:mb-8 animate-page-enter">
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl text-sf-on-surface">
              {searchQuery ? `Results for "${searchQuery}"` : 'Sacred Collections'}
            </h1>
            <p className="text-sf-on-surface-variant text-sm md:text-base mt-1 max-w-xl">
              {searchQuery
                ? `${products.length} product${products.length !== 1 ? 's' : ''} found`
                : 'Discover premium artifacts, hand-crafted murtis, and traditional puja essentials curated for your spiritual journey.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort — real, backend-driven (newest / price asc / price desc).
                "Popularity" is intentionally not offered: there's no
                per-product popularity figure stored on the product record
                itself to sort by correctly and efficiently at the DB level. */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-white border border-sf-outline-variant rounded-lg pl-4 pr-9 py-2 text-sm font-medium text-sf-on-surface focus:ring-2 focus:ring-sf-primary/20 outline-none cursor-pointer"
                data-testid="sort-select"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-sf-on-surface-variant text-lg">
                expand_more
              </span>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-sf-outline-variant rounded-lg text-sm font-medium hover:border-sf-primary transition-colors"
              data-testid="filter-toggle-button"
            >
              <SlidersHorizontal className="h-4 w-4 text-sf-primary" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-sf-primary text-sf-on-primary text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="bg-white border border-sf-outline-variant rounded-xl p-4 mb-4 md:mb-6 animate-slide-down">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-sf-on-surface">Filter Products</span>
              <button onClick={() => setShowFilters(false)} className="p-1">
                <X className="h-4 w-4 text-sf-on-surface-variant" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <Select value={filters.deity || 'all'} onValueChange={(value) => handleFilterChange('deity', value)}>
                <SelectTrigger className="w-[130px] md:w-[160px] text-xs md:text-sm h-9" data-testid="deity-filter">
                  <SelectValue placeholder="Deity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deities</SelectItem>
                  {deityOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name} Ji</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.material || 'all'} onValueChange={(value) => handleFilterChange('material', value)}>
                <SelectTrigger className="w-[130px] md:w-[160px] text-xs md:text-sm h-9" data-testid="material-filter">
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {materialOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {categoryOptions.length > 0 && (
                <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger className="w-[130px] md:w-[160px] text-xs md:text-sm h-9" data-testid="category-filter">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="text-xs md:text-sm h-9 px-3"
                  data-testid="clear-filters-button"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active filter tags */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.deity && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-sf-surface-container-low rounded-full text-xs md:text-sm text-sf-on-surface">
                {filters.deity} Ji
                <button onClick={() => handleFilterChange('deity', 'all')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.material && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-sf-surface-container-low rounded-full text-xs md:text-sm text-sf-on-surface">
                {filters.material}
                <button onClick={() => handleFilterChange('material', 'all')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-sf-surface-container-low rounded-full text-xs md:text-sm text-sf-on-surface">
                {filters.category}
                <button onClick={() => handleFilterChange('category', 'all')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="sacred-card rounded-xl overflow-hidden">
                <div className="aspect-square animate-skeleton" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-3/4 rounded animate-skeleton" />
                  <div className="h-3 w-1/2 rounded animate-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-sf-outline-variant mb-3 block">search_off</span>
            <p className="text-base md:text-xl text-sf-on-surface-variant">No products found</p>
            {(searchQuery || activeFilterCount > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  clearFilters();
                  setSearchParams({});
                }}
                className="mt-4"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="sacred-card card-hover rounded-xl overflow-hidden relative"
                data-testid={`product-card-${product.id}`}
              >
                <Link to={`/products/${product.id}`}>
                  <div className="aspect-square overflow-hidden relative bg-sf-surface-container-low">
                    <img loading="lazy"
                      src={product.image}
                      alt={product.name}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${product.stock === 0 ? 'opacity-50 grayscale' : ''}`}
                    />
                    {product.stock === 0 && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[10px] md:text-xs font-semibold text-center py-1">
                        Out of Stock
                      </span>
                    )}
                    {product.stock > 0 && product.stock < 5 && (
                      <span className="absolute top-2 left-2 bg-sf-primary text-sf-on-primary text-[9px] md:text-[10px] font-semibold px-2 py-0.5 rounded-full animate-low-stock-pulse">
                        Only {product.stock} left
                      </span>
                    )}
                  </div>
                </Link>
                <WishlistButton
                  productId={product.id}
                  user={user}
                  onRequireAuth={() => setShowAuth(true)}
                  size="h-4 w-4 md:h-5 md:w-5"
                  className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 md:p-2 shadow z-10"
                />
                <Link to={`/products/${product.id}`}>
                  <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                    <h3 className="font-headline-md text-sm md:text-lg text-sf-on-surface line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs md:text-sm text-sf-on-surface-variant">{product.material}</p>

                    {/* Size chips — only shown when the product actually has
                        size variants, matching the same chips shown on the
                        Product Detail selector. */}
                    {product.sizes?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {product.sizes.slice(0, 3).map((sz) => (
                          <span key={sz.label} className="text-[10px] px-1.5 py-0.5 rounded border border-sf-outline-variant text-sf-on-surface-variant">
                            {sz.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {product.review_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-sf-gold text-sf-gold" />
                        <span className="text-xs text-sf-on-surface-variant">
                          {product.avg_rating} ({product.review_count})
                        </span>
                      </div>
                    )}
                    <p className="text-base md:text-xl font-bold text-sf-primary">
                      ₹{product.price.toLocaleString('en-IN')}
                      {product.mrp && product.mrp > product.price && (
                        <>
                          {' '}<span className="text-xs md:text-sm font-normal text-sf-on-surface-variant line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                          {' '}<span className="text-[10px] md:text-xs font-semibold text-green-700">{Math.round((1 - product.price / product.mrp) * 100)}% off</span>
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8 md:mt-12">
              <Button
                variant="outline"
                className="rounded-full px-8 border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-on-primary transition-colors"
                onClick={() => fetchProducts(true)}
                disabled={loadingMore}
                data-testid="load-more-button"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    Revealing more treasures...
                  </span>
                ) : (
                  'Load More Treasures'
                )}
              </Button>
            </div>
          )}
          </>
        )}
      </div>
      {showAuth && <AuthDialog open={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default Products;
