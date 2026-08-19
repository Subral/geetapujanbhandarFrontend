import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import BannerCarousel from '../components/BannerCarousel';
import RecommendedForYou from '../components/RecommendedForYou';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from the finalized 22-screen Stitch canvas set (01_home).
//
// FIXED WHILE POROTING (both real bugs, not design changes):
//  - getCurrentLocation() used to fire unconditionally on mount, hitting
//    every first-time visitor with a browser geolocation permission
//    prompt before they'd seen a single product. It's still available —
//    the mobile "Deliver to" button already called it correctly, on
//    click — but the auto-fire on mount is removed.
//  - The old "Deals for You" section showed a FAKE discount badge via
//    Math.random() on every product, regardless of whether that product
//    actually had a discount. Removed. The one consolidated product
//    section below only ever shows a real percentage, computed from
//    product.mrp vs product.price — same pattern the file already used
//    correctly elsewhere.
//
// CONSOLIDATED PER THE ROUND 2 DESIGN BRIEF: the previous version had
// three separate, largely redundant product-grid sections (a carousel,
// "Suggestions for You", "Deals for You") all slicing the same fetched
// `products` array. Merged into one "Featured This Week" carousel,
// reusing the existing embla logic — this was flagged explicitly during
// the design correction rounds ("cut length by roughly half... merge
// into a single product carousel") and never implemented in code until
// now.
//
// The mobile-only header block below is untouched — mobile is out of
// scope for this redesign.

const defaultCategories = [
  { name: 'Statues', icon: '🪷', filter: 'material=Marble' },
  { name: 'Brass Items', icon: '🔔', filter: 'material=Brass' },
  { name: 'Copper', icon: '🏺', filter: 'material=Copper' },
  { name: 'Pooja Thali', icon: '🍽️', filter: 'category=Pooja Thali' },
  { name: 'Diyas', icon: '🪔', filter: 'category=Diyas' },
  { name: 'Incense', icon: '🌸', filter: 'category=Incense' },
  { name: 'Garlands', icon: '💐', filter: 'category=Garlands' },
];

const allItemsEntry = { name: 'All Items', icon: '🛒', filter: '' };

const categoryToNavItem = (cat) => {
  let filter;
  if (cat.type === 'deity') filter = `deity=${encodeURIComponent(cat.name)}`;
  else if (cat.type === 'material') filter = `material=${encodeURIComponent(cat.name)}`;
  else filter = `category=${encodeURIComponent(cat.name)}`;
  return { name: cat.name, icon: '🪷', image: cat.image, filter };
};

const TRUST_POINTS = [
  { icon: 'verified', label: 'Trusted Lucknow store since 2000' },
  { icon: 'local_shipping', label: 'Fast Lucknow delivery — most orders in 2–3 days' },
  { icon: 'storefront', label: 'Visit us at our Hazratganj showroom' },
];

const Home = ({ user, authReady }) => {
  const navigate = useNavigate();
  const [location, setLocation] = useState({ pincode: '', area: 'Lucknow' });
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([...defaultCategories, allItemsEntry]);
  const catRowRef = useRef(null);
  const [catOverflow, setCatOverflow] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const el = catRowRef.current;
      if (el) setCatOverflow(el.scrollWidth > el.clientWidth + 4);
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [categories]);

  const scrollCategories = (dir) => {
    catRowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 4000 })]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // getCurrentLocation() intentionally NOT called here — see header note.
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      if (Array.isArray(response.data) && response.data.length > 0) {
        setCategories([...response.data.map(categoryToNavItem), allItemsEntry]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products?limit=20`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const pincode = data.address?.postcode || '';
            const area = data.address?.suburb || data.address?.city || 'Lucknow';
            setLocation({ pincode, area });
          } catch (error) {
            console.error('Error getting location:', error);
          }
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <div className="storefront-shell min-h-screen bg-sf-background">
      {/* Mobile header — unchanged, out of scope for this redesign */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-sf-primary to-sf-primary-container px-3 py-2 md:hidden">
        <form onSubmit={handleSearch} className="mb-2">
          <div className="flex items-center bg-white rounded-lg overflow-hidden">
            <div className="pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search for pooja items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              data-testid="home-search-input"
            />
          </div>
        </form>
        <button onClick={getCurrentLocation} className="flex items-center gap-1 text-white text-xs" data-testid="location-button">
          <MapPin className="h-4 w-4" />
          <span>Deliver to</span>
          <span className="font-bold">{location.pincode ? `${location.pincode} - ${location.area}` : 'Lucknow'}</span>
        </button>
      </div>

      {/* ===================== HERO ===================== */}
      <section className="hidden md:block relative h-[70vh] max-h-[640px] overflow-hidden">
        <div className="absolute inset-0 animate-ken-burns">
          <img
            src="https://images.unsplash.com/photo-1604423043492-3f688c0b0f22?q=80&w=1920"
            alt="Diyas and pooja items arranged for worship"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-sf-on-background/80 via-sf-on-background/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-start justify-end px-16 pb-20 max-w-2xl animate-page-enter">
          <p className="heritage-badge text-lg mb-2">Trusted Lucknow store since 2000</p>
          <h1 className="font-headline-lg text-5xl text-white font-bold mb-4 leading-tight">
            Divine Offerings for Your Sacred Space
          </h1>
          <p className="text-white/85 text-lg mb-8 max-w-lg">
            Authentic religious items and handcrafted statues, from our Hazratganj showroom to your home.
          </p>
          <div className="flex gap-4">
            <Link
              to="/products"
              className="px-8 py-3 rounded font-bold bg-sf-primary text-sf-on-primary hover:opacity-90 transition-opacity bg-[length:200%_auto] animate-gold-shimmer"
              style={{ backgroundImage: 'linear-gradient(110deg, rgb(var(--sf-primary)) 40%, rgb(var(--sf-gold)) 50%, rgb(var(--sf-primary)) 60%)' }}
            >
              Shop Collection
            </Link>
            <Link
              to="/heritage"
              className="px-8 py-3 rounded font-bold border-2 border-white text-white hover:bg-white/10 transition-colors"
            >
              Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== SHOP BY DEITY ===================== */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-3 py-3 md:py-4">
          {/* Mobile row — unchanged */}
          <div className="flex md:hidden gap-4 overflow-x-auto scrollbar-hide pb-1 justify-start">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/products?${cat.filter}`}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 min-w-[60px] group"
                data-testid={`category-${cat.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sf-surface-container-low to-sf-primary-container/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-all duration-200 shadow-sm overflow-hidden">
                  {cat.image ? <img loading="lazy" src={cat.image} alt={cat.name} className="w-full h-full object-cover" /> : cat.icon}
                </div>
                <span className="text-[10px] text-sf-on-surface-variant text-center font-medium leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>

          {/* Desktop row */}
          <div className="hidden md:flex items-center gap-2">
            {catOverflow && (
              <button
                onClick={() => scrollCategories(-1)}
                className="flex-shrink-0 p-2 rounded-full border border-sf-outline-variant bg-white hover:bg-sf-surface-container-low transition-colors shadow-sm"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="h-4 w-4 text-sf-primary" />
              </button>
            )}
            <div ref={catRowRef} className="flex-1 flex gap-6 lg:gap-8 overflow-x-auto scrollbar-hide scroll-smooth">
              <div className={`flex gap-6 lg:gap-8 ${catOverflow ? '' : 'mx-auto'}`}>
                {categories.map((cat) => (
                  <Link
                    key={cat.name}
                    to={`/products?${cat.filter}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group"
                    data-testid={`category-${cat.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-sf-gold/30 bg-gradient-to-br from-sf-surface-container-low to-sf-primary-container/10 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:border-sf-gold transition-all duration-200 shadow-sm overflow-hidden">
                      {cat.image ? <img loading="lazy" src={cat.image} alt={cat.name} className="w-full h-full object-cover" /> : cat.icon}
                    </div>
                    <span className="text-sm text-sf-on-surface-variant text-center font-medium whitespace-nowrap">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
            {catOverflow && (
              <button
                onClick={() => scrollCategories(1)}
                className="flex-shrink-0 p-2 rounded-full border border-sf-outline-variant bg-white hover:bg-sf-surface-container-low transition-colors shadow-sm"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="h-4 w-4 text-sf-primary" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real, working, backend-wired — unchanged */}
      <BannerCarousel />
      <RecommendedForYou user={user} authReady={authReady} />

      {/* ===================== FEATURED THIS WEEK ===================== */}
      {/* Consolidates the three previous product-grid sections into one. */}
      <div className="px-4 md:px-16 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline-md text-2xl text-sf-on-surface">Featured This Week</h3>
            <div className="hidden md:flex gap-2">
              <button onClick={scrollPrev} className="p-2 bg-white rounded-full border border-sf-outline-variant hover:border-sf-primary transition-colors" aria-label="Previous">
                <ChevronLeft className="h-4 w-4 text-sf-on-surface-variant" />
              </button>
              <button onClick={scrollNext} className="p-2 bg-white rounded-full border border-sf-outline-variant hover:border-sf-primary transition-colors" aria-label="Next">
                <ChevronRight className="h-4 w-4 text-sf-on-surface-variant" />
              </button>
            </div>
          </div>
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-[0_0_45%] md:flex-[0_0_19%] min-w-0">
                    <div className="aspect-square rounded animate-skeleton mb-2" />
                    <div className="h-3 w-3/4 rounded animate-skeleton" />
                  </div>
                ))
              ) : (
                products.slice(0, 10).map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="flex-[0_0_45%] md:flex-[0_0_19%] min-w-0 sacred-card card-hover rounded overflow-hidden"
                  >
                    <div className="aspect-square overflow-hidden relative bg-sf-surface-container-low">
                      <img src={product.image} alt={product.name} className={`w-full h-full object-cover ${product.stock === 0 ? 'opacity-50 grayscale' : ''}`} />
                      {product.stock === 0 && (
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[10px] font-semibold text-center py-1">Out of Stock</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-sf-on-surface line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-sm font-bold text-sf-primary">₹{product.price?.toLocaleString('en-IN')}</span>
                        {product.mrp && product.mrp > product.price && (
                          <>
                            <span className="text-xs text-sf-on-surface-variant line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                            <span className="bg-sf-primary text-sf-on-primary text-[10px] px-1.5 py-0.5 rounded">
                              {Math.round((1 - product.price / product.mrp) * 100)}% off
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== TRUST BAR + WHATSAPP ===================== */}
      <div className="bg-sf-surface-container-low px-4 md:px-16 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            {TRUST_POINTS.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-sf-primary">{t.icon}</span>
                <span className="text-sm font-medium text-sf-on-surface">{t.label}</span>
              </div>
            ))}
          </div>
          <a
            href="https://wa.me/919506711777"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-white font-bold hover:opacity-90 transition-opacity flex-shrink-0"
            data-testid="whatsapp-cta"
          >
            <span className="material-symbols-outlined">chat</span>
            Chat with us on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default Home;
