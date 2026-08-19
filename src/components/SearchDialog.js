import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Search as SearchIcon, X, History } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const RECENT_KEY = 'gpb_recent_searches';
const MAX_RECENT = 5;

// Ported from 18_search_autosuggest (finalized Stitch canvas). Debounce
// fix from the earlier bug-fixing session is unchanged.
//
// Two real additions beyond the visual restyle:
//  - Recent Searches: the design calls for this but there's no backend
//    field for it (search history isn't tracked server-side anywhere).
//    Implemented as a genuine, working feature via localStorage — capped
//    at 5, newest first, deduplicated — rather than shown as static
//    example content with no actual persistence.
//  - Category suggestions: matches the query against real category
//    names from /categories (already fetched elsewhere in the app) and
//    links straight to the correctly-filtered listing page, using the
//    same type->query-param mapping AdminCategories.js already uses for
//    product counts (deity -> ?deity=, material -> ?material=, else
//    -> ?category=) — not decorative links to nowhere.

const getRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
};
const saveRecent = (term) => {
  const trimmed = term.trim();
  if (!trimmed) return;
  const existing = getRecent().filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  return updated;
};

const categoryParam = (category) =>
  category.type === 'deity' ? `deity=${encodeURIComponent(category.name)}`
  : category.type === 'material' ? `material=${encodeURIComponent(category.name)}`
  : `category=${encodeURIComponent(category.name)}`;

const SearchDialog = ({ open, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setRecent(getRecent());
  }, [open]);

  useEffect(() => {
    axios.get(`${API}/categories`).then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API}/products`, {
          params: { search: searchQuery, limit: 6 }
        });
        setResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const matchingCategories = searchQuery.length >= 2
    ? categories.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 4)
    : [];

  const goToResults = (term) => {
    saveRecent(term);
    onClose();
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const removeRecent = (term, e) => {
    e.stopPropagation();
    const updated = getRecent().filter((t) => t !== term);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecent(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="storefront-shell max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline-md text-sf-primary">Search Products</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-sf-on-surface-variant" />
          <Input
            placeholder="Search by deity, material, or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) goToResults(searchQuery); }}
            className="pl-10 pr-9"
            autoFocus
            data-testid="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3" aria-label="Clear search">
              <X className="h-4 w-4 text-sf-on-surface-variant" />
            </button>
          )}
        </div>

        <div className="mt-2 max-h-96 overflow-y-auto space-y-4">
          {searchQuery.length < 2 ? (
            <>
              {recent.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sf-on-surface-variant mb-2 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Recent Searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <button
                        key={term}
                        onClick={() => goToResults(term)}
                        className="group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-sf-surface-container-low hover:bg-sf-surface-container text-sm text-sf-on-surface transition-colors"
                        data-testid={`recent-search-${term}`}
                      >
                        {term}
                        <span onClick={(e) => removeRecent(term, e)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3 text-sf-on-surface-variant" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-sf-on-surface-variant py-8 text-sm">Type to search products...</p>
              )}
            </>
          ) : loading ? (
            <p className="text-center text-sf-on-surface-variant py-8 text-sm">Searching...</p>
          ) : results.length === 0 && matchingCategories.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-sf-outline-variant mb-2 block">search_off</span>
              <p className="text-sf-on-surface-variant text-sm">No results for &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            <>
              {matchingCategories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sf-on-surface-variant mb-2">Categories</p>
                  <div className="space-y-1">
                    {matchingCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/products?${categoryParam(cat)}`}
                        onClick={() => { saveRecent(searchQuery); onClose(); }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sf-surface-container-low transition-colors"
                        data-testid={`category-suggestion-${cat.id}`}
                      >
                        <span className="text-sm text-sf-on-surface">
                          <span className="text-sf-on-surface-variant capitalize">{cat.type}</span> › {cat.name}
                        </span>
                        <span className="material-symbols-outlined text-sf-on-surface-variant text-lg">chevron_right</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sf-on-surface-variant mb-2">Products</p>
                  <div className="space-y-2">
                    {results.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        onClick={() => { saveRecent(searchQuery); onClose(); }}
                        className="flex gap-3 p-2 rounded-lg hover:bg-sf-surface-container-low transition-colors"
                        data-testid={`search-result-${product.id}`}
                      >
                        <img loading="lazy" src={product.image} alt={product.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-sf-on-surface line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-sf-on-surface-variant">{product.material} • {product.deity} Ji</p>
                          <p className="text-sm font-bold text-sf-primary">₹{product.price.toLocaleString('en-IN')}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => goToResults(searchQuery)}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-sf-primary py-2.5 rounded-lg hover:bg-sf-primary-container/5 transition-colors"
                data-testid="see-all-results"
              >
                See all results for &ldquo;{searchQuery}&rdquo;
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
