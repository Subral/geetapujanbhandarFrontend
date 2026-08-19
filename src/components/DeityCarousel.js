import { useCallback, useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { deities as defaultDeities } from '../utils/constants';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DeityCarousel = () => {
  const [deities, setDeities] = useState(defaultDeities);

  useEffect(() => {
    // Merge deity categories created in the admin panel into the carousel
    const loadDeities = async () => {
      try {
        const response = await axios.get(`${API}/categories?type=deity`);
        const adminDeities = (response.data || [])
          .filter((c) => c.name)
          .map((c) => ({ name: c.name, image: c.image }));
        if (adminDeities.length > 0) {
          const seen = new Set();
          const merged = [...adminDeities, ...defaultDeities].filter((d) => {
            if (seen.has(d.name.toLowerCase())) return false;
            seen.add(d.name.toLowerCase());
            return true;
          });
          setDeities(merged);
        }
      } catch (error) {
        console.error('Error fetching deity categories:', error);
      }
    };
    loadDeities();
  }, []);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    slidesToScroll: 1
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <section className="py-10 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 md:mb-12">
          <h2 className="text-xl sm:text-3xl md:text-5xl font-bold" style={{ fontFamily: 'Playfair Display', color: '#E53935' }}>
            Shop by Deity
          </h2>
          <div className="flex gap-2">
            <button
              onClick={scrollPrev}
              className="p-1.5 md:p-2 rounded-full border border-[#E6D5C3] hover:bg-[#F5E6D3] transition-colors"
              data-testid="deity-prev"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" style={{ color: '#E53935' }} />
            </button>
            <button
              onClick={scrollNext}
              className="p-1.5 md:p-2 rounded-full border border-[#E6D5C3] hover:bg-[#F5E6D3] transition-colors"
              data-testid="deity-next"
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" style={{ color: '#E53935' }} />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3 md:gap-6">
            {deities.map((deity) => (
              <div
                key={deity.name}
                className="flex-[0_0_calc(50%-6px)] sm:flex-[0_0_calc(33.333%-8px)] md:flex-[0_0_calc(25%-12px)] lg:flex-[0_0_calc(20%-14.4px)] min-w-0"
              >
                <Link 
                  to={`/products?deity=${deity.name}`}
                  className="deity-card group block"
                  data-testid={`deity-card-${deity.name.toLowerCase()}`}
                >
                  <img loading="lazy" src={deity.image} alt={deity.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-end justify-center pb-3 md:pb-6">
                    <h3 className="text-sm md:text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display' }}>
                      {deity.name} Ji
                    </h3>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeityCarousel;
