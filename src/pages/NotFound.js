import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

// Previously there was no 404 route or page at all — any unmatched URL
// silently rendered nothing inside the app shell (no <Route path="*">
// existed in App.js). Ported from the finalized design set's 21_404
// canvas.

const NotFound = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center px-4 py-20">
      <div className="max-w-md text-center animate-page-enter">
        <span className="material-symbols-outlined text-6xl text-sf-gold mb-4 block">auto_awesome</span>
        <h1 className="font-headline-lg text-3xl text-sf-on-surface mb-3">The Path Diverged</h1>
        <p className="text-sf-on-surface-variant leading-relaxed mb-8">
          We apologize, but the sacred item or offering you are seeking cannot be found.
          Perhaps it has been moved, or the path was inscribed incorrectly. Let us guide you back.
        </p>

        <form onSubmit={handleSearch} className="flex items-center bg-white border border-sf-outline-variant rounded-full px-4 py-2 mb-6">
          <span className="material-symbols-outlined text-sf-on-surface-variant mr-2">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for pooja items..."
            className="flex-1 bg-transparent outline-none text-sm text-sf-on-surface placeholder:text-sf-on-surface-variant"
            data-testid="404-search-input"
          />
        </form>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/products"
            className="px-6 py-3 rounded font-bold bg-sf-primary text-sf-on-primary hover:opacity-90 transition-opacity"
          >
            Return to Collections
          </Link>
          <Link
            to="/"
            className="px-6 py-3 rounded font-bold border-2 border-sf-outline-variant text-sf-on-surface hover:border-sf-primary transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
