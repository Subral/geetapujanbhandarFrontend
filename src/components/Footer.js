import { Link } from 'react-router-dom';

// Ported from the finalized 22-screen Stitch canvas set (the richer
// "Our Heritage / Sacred Support / Visit Us" footer used on most
// screens, e.g. Heritage). Store facts (address, phone, hours,
// founding year, copyright year) match the values locked in across
// the design correction rounds — 2000, ₹200 threshold, dynamic
// current year rather than a hardcoded one.
//
// Real, working links from the previous footer (actual Facebook/
// Instagram URLs, not the mockup's placeholder "#" hrefs) were kept.
// "Terms of Service" and "Privacy Policy" have no dedicated page in
// this app yet — same honest gap the previous footer already had —
// so both still point at "/" rather than a fabricated route.

const Footer = () => {
  return (
    <footer className="storefront-shell bg-sf-tertiary-container/20 text-sf-on-background pt-16 md:pt-24 pb-12 px-4 md:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
        {/* Brand */}
        <div className="md:col-span-4">
          <Link to="/" className="flex items-center gap-3 mb-6">
            <img
              src="https://customer-assets.emergentagent.com/job_2b9c1f6e-f9fc-4bc2-ad8d-3f79bfc7556c/artifacts/y7vt3g8x_logo.jpeg"
              alt="Geeta Pujan Bhandar"
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="font-headline-md text-2xl text-sf-primary font-bold">Geeta Pujan Bhandar</span>
          </Link>
          <p className="text-sf-on-background/80 leading-relaxed font-medium mb-8 max-w-sm text-sm">
            Authentic religious items and handcrafted statues for your spiritual journey.
          </p>
          <div className="flex gap-4">
            <a
              href="https://www.facebook.com"
              target="_blank" rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-sf-surface-container-high flex items-center justify-center hover:bg-sf-primary hover:text-sf-on-primary transition-colors"
              aria-label="Facebook"
            >
              <span className="material-symbols-outlined text-sm">public</span>
            </a>
            <a
              href="https://www.instagram.com/geetapujan?utm_source=qr&igsh=MWM5NmEwdDZ3Y3Qyeg=="
              target="_blank" rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-sf-surface-container-high flex items-center justify-center hover:bg-sf-primary hover:text-sf-on-primary transition-colors"
              aria-label="Instagram"
            >
              <span className="material-symbols-outlined text-sm">photo_camera</span>
            </a>
          </div>
        </div>

        {/* Our Heritage */}
        <div className="md:col-span-2">
          <h6 className="font-bold uppercase tracking-[0.2em] text-sf-primary text-xs mb-6">Our Heritage</h6>
          <ul className="space-y-3">
            <li><Link to="/heritage" className="text-sf-on-background/70 hover:text-sf-primary transition-colors text-sm font-medium">Our Story Since 2000</Link></li>
            <li><Link to="/heritage" className="text-sf-on-background/70 hover:text-sf-primary transition-colors text-sm font-medium">The Artisan Collective</Link></li>
            <li><Link to="/heritage" className="text-sf-on-background/70 hover:text-sf-primary transition-colors text-sm font-medium">Care Guide</Link></li>
          </ul>
        </div>

        {/* Sacred Support */}
        <div className="md:col-span-2">
          <h6 className="font-bold uppercase tracking-[0.2em] text-sf-primary text-xs mb-6">Sacred Support</h6>
          <ul className="space-y-3">
            <li><Link to="/return-policy" className="text-sf-on-background/70 hover:text-sf-primary transition-colors text-sm font-medium">Shipping &amp; Returns</Link></li>
            <li><Link to="/" className="text-sf-on-background/70 hover:text-sf-primary transition-colors text-sm font-medium">Privacy Policy</Link></li>
            <li><Link to="/" className="text-sf-on-background/70 hover:text-sf-primary transition-colors text-sm font-medium">Terms of Service</Link></li>
            <li><a href="tel:+919506711777" className="text-sf-on-background/70 hover:text-sf-primary transition-colors text-sm font-medium">Contact Us</a></li>
          </ul>
        </div>

        {/* Visit Us */}
        <div className="md:col-span-4">
          <h6 className="font-bold uppercase tracking-[0.2em] text-sf-primary text-xs mb-6">Visit Us</h6>
          <p className="text-sf-on-background/70 mb-1 leading-relaxed font-medium text-sm">
            Latouche Road Plaza, First Floor, 92/77, Latouche Rd,
          </p>
          <p className="text-sf-on-background/70 mb-4 leading-relaxed font-medium text-sm">
            Hazratganj, Lucknow – 226018
          </p>
          <a href="tel:+919506711777" className="block text-sf-on-background/70 hover:text-sf-primary transition-colors font-medium text-sm mb-1">
            Phone: +91 9506711777
          </a>
          <p className="text-sf-on-background/70 font-medium text-sm mb-4">
            Mon–Sat: 9 AM – 8 PM · Sun: 10 AM – 6 PM
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Geeta+Pujan+Bhandar+Latouche+Road+Lucknow"
            target="_blank" rel="noopener noreferrer"
            className="text-sf-primary font-bold text-sm hover:underline"
          >
            Get Directions →
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-sf-on-background/10 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold uppercase tracking-widest gap-4 opacity-60">
        <p>&copy; {new Date().getFullYear()} Geeta Pujan Bhandar. All rights reserved.</p>
        <div className="flex gap-8">
          <a href="https://www.instagram.com/geetapujan" target="_blank" rel="noopener noreferrer" className="hover:text-sf-primary transition-colors">Instagram</a>
          <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-sf-primary transition-colors">Facebook</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
