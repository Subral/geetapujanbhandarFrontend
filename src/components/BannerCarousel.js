import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BannerCarousel = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Embla carousel with autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'center',
      skipSnaps: false 
    }, 
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/banners`);
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
      // Fallback banners if none exist
      setBanners([
        {
          id: 'default-1',
          title: 'Divine Collection',
          image_url: 'https://images.unsplash.com/photo-1609619385002-f40f1df9b7eb?w=1200&q=80',
          target_link: '/products',
          display_order: 1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  if (loading) {
    return (
      <div className="w-full h-32 md:h-48 lg:h-64 bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse rounded-xl mx-3" />
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="relative px-3 py-2 md:py-3">
      <div className="max-w-7xl mx-auto relative">
        {/* Main Carousel */}
        <div className="overflow-hidden rounded-xl md:rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="flex-[0_0_100%] min-w-0"
              >
                <Link
                  to={banner.target_link}
                  className="block relative aspect-[21/9] md:aspect-[3/1] lg:aspect-[4/1] overflow-hidden rounded-xl md:rounded-2xl"
                  data-testid={`banner-${banner.id}`}
                >
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                  
                  {/* Banner Title + Subtitle */}
                  {banner.title && (
                    <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 right-3 md:right-6">
                      <h3 className="text-white text-sm md:text-xl lg:text-2xl font-bold drop-shadow-lg" style={{ fontFamily: 'Playfair Display' }}>
                        {banner.title}
                      </h3>
                      {banner.subtitle && (
                        <p className="text-white/90 text-xs md:text-sm lg:text-base drop-shadow-lg mt-1 line-clamp-1">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows - Hidden on mobile for cleaner look */}
        {banners.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-all z-10"
              aria-label="Previous banner"
              data-testid="banner-prev"
            >
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-gray-800" />
            </button>
            <button
              onClick={scrollNext}
              className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-all z-10"
              aria-label="Next banner"
              data-testid="banner-next"
            >
              <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-gray-800" />
            </button>
          </>
        )}

        {/* Indicator Dots */}
        {banners.length > 1 && (
          <div className="flex justify-center gap-1.5 md:gap-2 mt-2 md:mt-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${
                  index === selectedIndex
                    ? 'bg-[#E53935] w-5 md:w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to banner ${index + 1}`}
                data-testid={`banner-dot-${index}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerCarousel;
