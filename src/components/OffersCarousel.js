import { useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OffersCarousel = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await axios.get(`${API}/offers?active=true`);
      setOffers(response.data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (loading) {
    return null;
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 px-4" style={{ background: '#FFFCF8' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-8">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display', color: '#E53935' }}>
            Special Offers
          </h2>
          <div className="flex gap-2">
            <button
              onClick={scrollPrev}
              className="p-1.5 md:p-2 rounded-full border border-[#E6D5C3] hover:bg-[#F5E6D3] transition-colors"
              data-testid="offers-prev"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" style={{ color: '#E53935' }} />
            </button>
            <button
              onClick={scrollNext}
              className="p-1.5 md:p-2 rounded-full border border-[#E6D5C3] hover:bg-[#F5E6D3] transition-colors"
              data-testid="offers-next"
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" style={{ color: '#E53935' }} />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3 md:gap-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] min-w-0"
              >
                <div
                  className="relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8 h-44 md:h-64 flex flex-col justify-between text-white"
                  style={{ background: offer.bg_color }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 md:w-40 md:h-40 opacity-20">
                    <img loading="lazy" src={offer.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-base md:text-2xl font-bold mb-1 md:mb-2" style={{ fontFamily: 'Playfair Display' }}>
                      {offer.title}
                    </h3>
                    <p className="text-xs md:text-lg mb-2 md:mb-4">{offer.description}</p>
                  </div>

                  <div className="relative z-10">
                    <div className="inline-block bg-white/20 backdrop-blur-sm px-3 md:px-4 py-1 md:py-2 rounded-full border-2 border-white/40">
                      <p className="text-xs md:text-sm font-semibold">Use Code: {offer.code}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OffersCarousel;
