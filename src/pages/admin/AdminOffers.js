import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { Pencil, Trash2, Plus, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from offers_management_geeta_pujan_bhandar (Stitch canvas). All
// existing CRUD logic (create/edit/delete, gradient picker, discount
// type/value/min-order) is unchanged — only the shell and card visuals
// were rebuilt, plus two real additions the design calls for:
//   - Active/Inactive filter tabs with live counts
//   - Copy-to-clipboard on the promo code (navigator.clipboard, with a
//     brief checkmark confirmation) — the design shows a copy icon next
//     to each code but had no behavior wired to it in the source HTML.

const gradientOptions = [
  { name: 'Diwali Gold', value: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
  { name: 'Sacred Teal', value: 'linear-gradient(135deg, #0e7490 0%, #67c9d4 100%)' },
  { name: 'Ash Grey', value: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)' },
  { name: 'Purple Dream', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Pink Passion', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Royal Red', value: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

const emptyForm = {
  title: '', description: '', code: '', image: '',
  bg_color: gradientOptions[0].value, active: true,
  discount_type: 'percent', discount_value: '', min_order: '',
};

const AdminOffers = ({ user, onLogout }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(response.data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    all: offers.length,
    active: offers.filter((o) => o.active).length,
    inactive: offers.filter((o) => !o.active).length,
  };

  const filteredOffers = useMemo(() => {
    if (filter === 'active') return offers.filter((o) => o.active);
    if (filter === 'inactive') return offers.filter((o) => !o.active);
    return offers;
  }, [offers, filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value) || 0,
        min_order: parseFloat(formData.min_order) || 0,
      };
      if (editingOffer) {
        await axios.put(`${API}/offers/${editingOffer.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Offer updated successfully');
      } else {
        await axios.post(`${API}/offers`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Offer created successfully');
      }
      setShowDialog(false);
      setEditingOffer(null);
      setFormData(emptyForm);
      fetchOffers();
    } catch (error) {
      toast.error('Failed to save offer');
    }
  };

  const handleEdit = (offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      code: offer.code,
      image: offer.image,
      bg_color: offer.bg_color,
      active: offer.active,
      discount_type: offer.discount_type || 'percent',
      discount_value: offer.discount_value ? offer.discount_value.toString() : '',
      min_order: offer.min_order ? offer.min_order.toString() : '',
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/offers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Offer deleted');
      fetchOffers();
    } catch (error) {
      toast.error('Failed to delete offer');
    }
  };

  const copyCode = async (offer) => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopiedId(offer.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error('Could not copy — copy manually: ' + offer.code);
    }
  };

  return (
    <AdminLayout user={user} onLogout={onLogout} searchPlaceholder="Search offers...">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl text-adm-on-surface">Manage Offers</h1>
          <p className="text-sm text-adm-on-surface-variant mt-1">Active promotions and seasonal discounts.</p>
        </div>
        <Button
          onClick={() => { setEditingOffer(null); setFormData(emptyForm); setShowDialog(true); }}
          className="rounded-lg px-5 bg-adm-primary text-adm-on-primary hover:opacity-90 warm-shadow"
          data-testid="add-offer-button"
        >
          <Plus className="mr-2 h-5 w-5" /> Add Offer
        </Button>
      </div>

      {/* Filter tabs with live counts */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.key
                ? 'bg-adm-primary text-adm-on-primary border-adm-primary'
                : 'bg-adm-surface-container-lowest border-adm-outline-variant text-adm-on-surface-variant hover:border-adm-primary/40'
            }`}
            data-testid={`offer-filter-${f.key}`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-adm-on-surface-variant">Loading offers…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="relative overflow-hidden rounded-xl p-6 h-64 flex flex-col justify-between text-white warm-shadow"
              style={{ background: offer.bg_color }}
              data-testid={`offer-card-${offer.id}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none">
                {offer.image && <img src={offer.image} alt="" className="w-full h-full object-cover" />}
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex items-center gap-1 ${offer.active ? 'bg-white/25' : 'bg-black/25'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${offer.active ? 'bg-green-300' : 'bg-white/50'}`} />
                    {offer.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full border border-white/30">
                    {offer.discount_type === 'percent' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                  </span>
                </div>
                <h3 className="font-headline-md text-xl mb-2 mt-2">{offer.title}</h3>
                <p className="text-sm opacity-90 line-clamp-2">{offer.description}</p>
              </div>

              <div className="relative z-10">
                <button
                  onClick={() => copyCode(offer)}
                  className="w-full flex items-center justify-between bg-white/15 hover:bg-white/25 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30 transition-colors mb-2"
                  data-testid={`copy-code-${offer.id}`}
                >
                  <span className="text-sm font-bold tracking-wide">{offer.code}</span>
                  {copiedId === offer.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <div className="flex justify-between items-center text-xs opacity-90">
                  <span>Min Order: ₹{offer.min_order?.toLocaleString('en-IN') || 0}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(offer)}
                      className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                      data-testid={`edit-offer-${offer.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                      data-testid={`delete-offer-${offer.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredOffers.length === 0 && (
        <div className="bg-adm-surface-container-lowest border border-adm-outline-variant/30 rounded-xl p-12 text-center text-adm-on-surface-variant">
          {offers.length === 0 ? 'No offers found. Create your first offer to attract customers!' : `No ${filter} offers.`}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline-md text-adm-primary">
              {editingOffer ? 'Edit Offer' : 'Add New Offer'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Offer Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g., New Year Special" data-testid="offer-title-input" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required placeholder="e.g., Flat 20% OFF on all Krishna Statues" data-testid="offer-description-input" />
            </div>
            <div>
              <Label>Promo Code</Label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required placeholder="e.g., KRISHNA20" data-testid="offer-code-input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Discount Type</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  data-testid="offer-discount-type"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>
              <div>
                <Label>{formData.discount_type === 'percent' ? 'Discount %' : 'Discount ₹'}</Label>
                <Input type="number" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder={formData.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 500'} data-testid="offer-discount-value" />
              </div>
              <div>
                <Label>Min Order (₹)</Label>
                <Input type="number" value={formData.min_order} onChange={(e) => setFormData({ ...formData, min_order: e.target.value })} placeholder="0 = none" data-testid="offer-min-order" />
              </div>
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." data-testid="offer-image-input" />
            </div>
            <div>
              <Label>Background Gradient</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {gradientOptions.map((gradient) => (
                  <button
                    key={gradient.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, bg_color: gradient.value })}
                    className={`h-16 rounded-lg border-2 flex items-center justify-center ${formData.bg_color === gradient.value ? 'border-adm-primary border-4' : 'border-adm-outline-variant'}`}
                    style={{ background: gradient.value }}
                  >
                    <span className="text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded">{gradient.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.active} onCheckedChange={(checked) => setFormData({ ...formData, active: checked })} data-testid="offer-active-switch" />
              <Label>Active (visible to customers)</Label>
            </div>
            <Button type="submit" className="w-full rounded-lg py-6 bg-adm-primary text-adm-on-primary hover:opacity-90" data-testid="submit-offer-button">
              {editingOffer ? 'Update Offer' : 'Create Offer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOffers;
