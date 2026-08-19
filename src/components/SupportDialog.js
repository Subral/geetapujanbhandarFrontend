import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';

const SupportDialog = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Playfair Display', color: '#E53935' }}>
            Customer Support
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-[#8C7E76]">
            We're here to help! Contact us through any of the following methods:
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border border-[#E6D5C3]">
              <div className="p-3 rounded-full" style={{ background: '#F5E6D3' }}>
                <Phone className="h-5 w-5" style={{ color: '#E53935' }} />
              </div>
              <div>
                <h4 className="font-bold mb-1">Call Us</h4>
                <p className="text-sm text-[#8C7E76] mb-2">Mon-Sat: 10 AM - 7 PM</p>
                <a href="tel:+919506711777" className="font-medium hover:text-[#E53935]">
                  +91 9506711777
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-[#E6D5C3]">
              <div className="p-3 rounded-full" style={{ background: '#F5E6D3' }}>
                <Mail className="h-5 w-5" style={{ color: '#E53935' }} />
              </div>
              <div>
                <h4 className="font-bold mb-1">Email Us</h4>
                <p className="text-sm text-[#8C7E76] mb-2">We'll respond within 24 hours</p>
                <a href="mailto:Geetapujans@gmail.com" className="font-medium hover:text-[#E53935]">
                  Geetapujans@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-[#E6D5C3]">
              <div className="p-3 rounded-full" style={{ background: '#F5E6D3' }}>
                <MessageCircle className="h-5 w-5" style={{ color: '#E53935' }} />
              </div>
              <div>
                <h4 className="font-bold mb-1">WhatsApp</h4>
                <p className="text-sm text-[#8C7E76] mb-2">Quick responses on WhatsApp</p>
                <a 
                  href="https://wa.me/919506711777" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium hover:text-[#E53935]"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-[#E6D5C3]">
              <div className="p-3 rounded-full" style={{ background: '#F5E6D3' }}>
                <MapPin className="h-5 w-5" style={{ color: '#E53935' }} />
              </div>
              <div>
                <h4 className="font-bold mb-1">Visit Our Store</h4>
                <p className="text-sm text-[#8C7E76]">
                  Latouche Road Plaza, First Floor<br />
                  92/77, Latouche Rd, Lucknow<br />
                  Uttar Pradesh 226018
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F5E6D3] p-4 rounded-lg">
            <h4 className="font-bold mb-2" style={{ color: '#E53935' }}>Need Help With Your Order?</h4>
            <p className="text-sm text-[#8C7E76]">
              For order-related queries, please have your order ID ready when contacting us.
            </p>
          </div>

          <Button 
            onClick={onClose}
            className="w-full rounded-full py-6"
            style={{ background: '#E53935' }}
            data-testid="close-support-button"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportDialog;
