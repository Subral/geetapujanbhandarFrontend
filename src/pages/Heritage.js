import { useState } from 'react';
import { Link } from 'react-router-dom';

// Ported from the finalized 22-screen Stitch canvas set (10_heritage).
// Added while rebuilding Home.js/Footer.js — both now link to /heritage,
// which had no route or page at all before this. Rather than ship a
// broken link, this is a real page: story, craft, a working FAQ
// accordion, and real contact links. No contact-form backend endpoint
// exists yet, so "Reach Out to Us" uses real tel:/mailto:/WhatsApp
// links (the same pattern SupportDialog already uses) instead of a
// form that would submit nowhere.

const FAQS = [
  {
    q: 'How do you ensure the purity of the Puja Samagri?',
    a: 'Every batch of ingredients is inspected to meet Shastric standards. We avoid synthetic fragrances and chemicals, focusing on organic and ethically sourced raw materials.',
  },
  {
    q: 'Do you deliver outside Lucknow?',
    a: 'Currently, we focus exclusively on serving our patrons within Lucknow to ensure the freshness and sanctity of our offerings. We deliver across Lucknow in 2–3 days.',
  },
  {
    q: 'Can I customize a Puja Kit for a specific ritual?',
    a: 'Yes. Call or WhatsApp us and we can help curate a kit tailored to your requirements, whether for a Griha Pravesh, a wedding, or a daily ritual.',
  },
];

const Heritage = () => {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="storefront-shell min-h-screen bg-sf-background">
      {/* Hero */}
      <section className="px-4 md:px-16 py-16 md:py-24 max-w-4xl mx-auto text-center animate-page-enter">
        <p className="heritage-badge text-lg mb-3">Our Heritage</p>
        <h1 className="font-headline-lg text-4xl md:text-5xl text-sf-on-surface font-bold mb-6">
          Preserving Devotion Through Generations
        </h1>
        <p className="text-sf-on-surface-variant text-lg leading-relaxed">
          Founded in the heart of Lucknow's spiritual corridors, Geeta Pujan Bhandar began as a
          small sanctuary for sacred artifacts in 2000. Today, we are custodians of tradition,
          bringing the purity of temple rituals to homes across Lucknow.
        </p>
      </section>

      {/* The Craft */}
      <section className="px-4 md:px-16 py-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="sacred-card rounded p-8">
          <span className="material-symbols-outlined text-sf-primary text-3xl mb-4 block">history_edu</span>
          <h3 className="font-headline-md text-xl text-sf-on-surface mb-3">The Lucknow Legacy</h3>
          <p className="text-sf-on-surface-variant leading-relaxed">
            Our flagship store in Lucknow is more than a shop — it is a point of trust for those
            seeking authentic Puja Samagri. For generations, families across Lucknow have trusted
            our pure incense, hand-cast idols, and carefully preserved scriptures.
          </p>
        </div>
        <div className="sacred-card rounded p-8">
          <span className="material-symbols-outlined text-sf-gold text-3xl mb-4 block">workspace_premium</span>
          <h3 className="font-headline-md text-xl text-sf-on-surface mb-3">Quality Without Compromise</h3>
          <p className="text-sf-on-surface-variant leading-relaxed">
            We source our ingredients from the source — pure ghee, hand-picked flowers, and aged
            sandalwood. Every product is checked for quality before it reaches your doorstep.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-16 py-12 max-w-3xl mx-auto">
        <h2 className="font-headline-md text-2xl text-sf-on-surface mb-2 text-center">Common Rituals &amp; Queries</h2>
        <p className="text-sf-on-surface-variant text-center mb-8">Your guide to our services and sacred offerings.</p>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="border border-sf-outline-variant rounded overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left bg-sf-surface-container-lowest hover:bg-sf-surface-container-low transition-colors"
                aria-expanded={openFaq === i}
              >
                <span className="font-medium text-sf-on-surface">{faq.q}</span>
                <span className={`material-symbols-outlined text-sf-on-surface-variant transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sf-on-surface-variant text-sm leading-relaxed animate-slide-down">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Shipping + Returns + Contact */}
      <section className="px-4 md:px-16 py-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="sacred-card rounded p-6">
          <span className="material-symbols-outlined text-sf-primary mb-3 block">local_shipping</span>
          <h4 className="font-bold text-sf-on-surface mb-2">Shipping Rituals</h4>
          <ul className="space-y-1.5 text-sm text-sf-on-surface-variant">
            <li>Delivery across Lucknow in 2–3 days</li>
            <li>Hand-delivered by our specialized staff</li>
            <li>Complimentary delivery for orders above ₹200</li>
          </ul>
        </div>
        <div className="sacred-card rounded p-6">
          <span className="material-symbols-outlined text-sf-primary mb-3 block">assignment_return</span>
          <h4 className="font-bold text-sf-on-surface mb-2">Return Policy</h4>
          <p className="text-sm text-sf-on-surface-variant mb-3">
            If an item reaches you damaged, we offer a no-questions-asked replacement within 7 days.
          </p>
          <Link to="/return-policy" className="text-sm font-bold text-sf-primary hover:underline">
            Read Detailed Policy →
          </Link>
        </div>
        <div className="sacred-card rounded p-6">
          <span className="material-symbols-outlined text-sf-primary mb-3 block">call</span>
          <h4 className="font-bold text-sf-on-surface mb-2">Reach Out to Us</h4>
          <div className="space-y-2 text-sm">
            <a href="tel:+919506711777" className="block text-sf-on-surface-variant hover:text-sf-primary transition-colors">+91 9506711777</a>
            <a href="mailto:Geetapujans@gmail.com" className="block text-sf-on-surface-variant hover:text-sf-primary transition-colors">Geetapujans@gmail.com</a>
            <a href="https://wa.me/919506711777" target="_blank" rel="noopener noreferrer" className="block font-bold text-[#25D366] hover:underline">
              Chat on WhatsApp →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Heritage;
