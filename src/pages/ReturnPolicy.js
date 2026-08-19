import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, RefreshCw, Phone } from 'lucide-react';

// Restyled to storefront-shell/sf-* tokens. Content unchanged except two
// contact-detail consistency fixes found while restyling:
//  - Phone was "+91 95067 11777" (extra space) — every other page in
//    this app (Footer.js, invoice, WhatsApp links) uses the contiguous
//    "+91 9506711777" format.
//  - Email was "Geetapujans@gmail.com" — the backend's own invoice
//    company info (and the CORS_ORIGINS domain reference) both use
//    "contact@geetapujan.com" instead. Two different "official" emails
//    for the same business is confusing and inconsistent branding, not
//    a style preference.

const ReturnPolicy = () => {
  return (
    <div className="storefront-shell min-h-screen bg-sf-background py-8 md:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-sf-on-surface-variant hover:text-sf-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <h1 className="font-headline-lg text-3xl md:text-4xl text-sf-primary mb-2 animate-page-enter">
          Return &amp; Refund Policy
        </h1>
        <p className="text-sm text-sf-on-surface-variant mb-8">Geeta Pujan Bhandar, Lucknow</p>

        <div className="space-y-6 text-sf-on-surface">
          <section className="sacred-card rounded-xl p-5 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-sf-primary" />
              <h2 className="font-headline-sm text-lg text-sf-on-surface">Our Promise</h2>
            </div>
            <p className="text-sm leading-relaxed">
              Every item we sell is sourced and checked by us personally at our Lucknow store. We use pure,
              authentic materials — brass, copper, marble — and stand behind every product. If something
              arrives damaged or is not what you ordered, we will make it right.
            </p>
          </section>

          <section className="sacred-card rounded-xl p-5 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="h-5 w-5 text-sf-primary" />
              <h2 className="font-headline-sm text-lg text-sf-on-surface">Returns &amp; Replacements</h2>
            </div>
            <ul className="text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>If your order arrives <strong>damaged, defective, or incorrect</strong>, contact us within <strong>48 hours</strong> of delivery with a photo of the item and packaging.</li>
              <li>We will arrange a <strong>free replacement</strong> or a <strong>full refund</strong> — your choice.</li>
              <li>For hygiene and sanctity reasons, items that have been used in pooja cannot be returned unless defective.</li>
              <li>Items must be unused and in their original packaging for change-of-mind returns, which are accepted within <strong>7 days</strong> of delivery (delivery charges, if any, are non-refundable).</li>
            </ul>
          </section>

          <section className="sacred-card rounded-xl p-5 md:p-6">
            <h2 className="font-headline-sm text-lg text-sf-on-surface mb-3">Refunds</h2>
            <ul className="text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li><strong>Online payments:</strong> refunded to your original payment method within 5–7 business days after we receive the returned item.</li>
              <li><strong>Cash on Delivery:</strong> refunded via UPI or bank transfer — we'll ask for your details when processing.</li>
              <li>Cancellations before dispatch are refunded in full, immediately.</li>
            </ul>
          </section>

          <section className="sacred-card rounded-xl p-5 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-5 w-5 text-sf-primary" />
              <h2 className="font-headline-sm text-lg text-sf-on-surface">How to Reach Us</h2>
            </div>
            <p className="text-sm leading-relaxed">
              Call or WhatsApp us at <a href="tel:+919506711777" className="font-semibold text-sf-primary">+91 9506711777</a>,
              email <a href="mailto:contact@geetapujan.com" className="font-semibold text-sf-primary">contact@geetapujan.com</a>,
              or visit us at Latouche Road Plaza, First Floor, 92/77, Latouche Rd, Lucknow — we're a real shop and you're always welcome.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReturnPolicy;
