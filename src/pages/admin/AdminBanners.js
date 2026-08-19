import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { Pencil, Trash2, Plus, GripVertical, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from banner_management_geeta_pujan_bhandar (Stitch canvas).
//
// The design's grip-dots icon implies drag-to-reorder, but there's no
// actual drag/drop JS behind it in the source file — it's a static
// visual affordance, not a working interaction. Rather than either fake
// drag-and-drop or silently drop the reordering need, Move Up/Move Down
// buttons do the same job for the existing `display_order` field with no
// new dependency (real drag-and-drop would need dnd-kit or similar,
// which isn't installed).
//
// `subtitle` is a real, new field — see backend/server.py and
// components/BannerCarousel.js — not just an admin-side display value.

const AdminBanners = ({ user, onLogout }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '', subtitle: '', image_url: '', target_link: '', display_order: 0, is_active: true,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/banners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanners(response.data.sort((a, b) => a.display_order - b.display_order));
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingBanner) {
        await axios.put(`${API}/admin/banners/${editingBanner.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Banner updated successfully');
      } else {
        await axios.post(`${API}/admin/banners`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Banner created successfully');
      }
      setShowDialog(false);
      setEditingBanner(null);
      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save banner');
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      image_url: banner.image_url,
      target_link: banner.target_link,
      display_order: banner.display_order,
      is_active: banner.is_active,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Banner deleted');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/banners/${banner.id}`,
        { is_active: !banner.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
      fetchBanners();
    } catch (error) {
      toast.error('Failed to update banner status');
    }
  };

  // Swap display_order with the adjacent banner — see header note on why
  // this replaces literal drag-and-drop.
  const moveBanner = async (banner, direction) => {
    const sorted = [...banners].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((b) => b.id === banner.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const token = localStorage.getItem('token');
    try {
      await Promise.all([
        axios.put(`${API}/admin/banners/${banner.id}`, { display_order: other.display_order }, { headers: { Authorization: `Bearer ${token}` } }),
        axios.put(`${API}/admin/banners/${other.id}`, { display_order: banner.display_order }, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      fetchBanners();
    } catch {
      toast.error('Failed to reorder banners');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', subtitle: '', image_url: '', target_link: '', display_order: banners.length, is_active: true });
  };

  const openAddDialog = () => {
    setEditingBanner(null);
    resetForm();
    setShowDialog(true);
  };

  return (
    <AdminLayout user={user} onLogout={onLogout} searchPlaceholder="Search banners...">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl text-adm-on-surface">Homepage Banners</h1>
          <p className="text-sm text-adm-on-surface-variant mt-1">Manage the promotional banners displayed on the storefront hero section.</p>
        </div>
        <Button
          onClick={openAddDialog}
          className="rounded-lg px-5 bg-adm-primary text-adm-on-primary hover:opacity-90 warm-shadow"
          data-testid="add-banner-button"
        >
          <Plus className="mr-2 h-5 w-5" /> Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="text-adm-on-surface-variant">Loading banners…</div>
      ) : banners.length === 0 ? (
        <div className="bg-adm-surface-container-lowest border border-adm-outline-variant/30 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-adm-surface-container rounded-full flex items-center justify-center text-adm-primary mb-4 mx-auto">
            <span className="material-symbols-outlined text-3xl">view_carousel</span>
          </div>
          <h3 className="font-headline-sm text-lg text-adm-on-surface mb-2">No Banners Found</h3>
          <p className="text-sm text-adm-on-surface-variant max-w-md mx-auto mb-4">
            You haven't added any banners to the homepage yet. Add your first promotional banner to engage customers.
          </p>
          <Button onClick={openAddDialog} className="bg-adm-surface-container-lowest border border-adm-secondary text-adm-secondary hover:bg-adm-secondary-container/10">
            <Plus className="mr-2 h-4 w-4" /> Add Banner
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`bg-adm-surface-container-lowest border rounded-xl overflow-hidden warm-shadow transition-all devotional-border ${
                banner.is_active ? 'border-adm-outline-variant/30' : 'border-adm-outline-variant/20 opacity-60'
              }`}
              data-testid={`banner-row-${banner.id}`}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="flex flex-col items-center gap-1 text-adm-on-surface-variant">
                  <button onClick={() => moveBanner(banner, -1)} disabled={index === 0} className="disabled:opacity-30 hover:text-adm-primary" aria-label="Move up">
                    <span className="material-symbols-outlined text-base">expand_less</span>
                  </button>
                  <GripVertical className="w-4 h-4 opacity-50" />
                  <button onClick={() => moveBanner(banner, 1)} disabled={index === banners.length - 1} className="disabled:opacity-30 hover:text-adm-primary" aria-label="Move down">
                    <span className="material-symbols-outlined text-base">expand_more</span>
                  </button>
                </div>
                <span className="text-sm font-bold text-adm-primary w-6 text-center">{index + 1}</span>

                <div className="w-32 h-20 md:w-48 md:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-adm-surface-container">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Image+Error'; }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-headline-sm text-lg text-adm-on-surface truncate">{banner.title || 'Untitled Banner'}</h3>
                  {banner.subtitle && <p className="text-sm text-adm-on-surface-variant truncate">{banner.subtitle}</p>}
                  <a
                    href={banner.target_link}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-adm-secondary hover:text-adm-primary flex items-center gap-1 truncate mt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Link: {banner.target_link}
                  </a>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold ${banner.is_active ? 'text-adm-primary' : 'text-adm-on-surface-variant'}`}>
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Switch checked={banner.is_active} onCheckedChange={() => handleToggleActive(banner)} data-testid={`toggle-${banner.id}`} />
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)} data-testid={`edit-${banner.id}`}>
                    <Pencil className="h-4 w-4 text-adm-on-surface-variant" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)} data-testid={`delete-${banner.id}`}>
                    <Trash2 className="h-4 w-4 text-adm-error" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-headline-md text-adm-primary">
              {editingBanner ? 'Edit Banner' : 'Add New Banner'}
            </DialogTitle>
            <DialogDescription className="text-adm-on-surface-variant">
              {editingBanner ? 'Update the banner details below' : 'Fill in the details to create a new promotional banner'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="title">Banner Title</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Festival Special Diyas" required data-testid="banner-title-input" />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle (optional)</Label>
              <Input id="subtitle" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="e.g., Light up your home with our premium brass collection." data-testid="banner-subtitle-input" />
            </div>
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input id="image_url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://example.com/banner-image.jpg" required data-testid="banner-image-input" />
              {formData.image_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-adm-outline-variant">
                  <img
                    src={formData.image_url} alt="Preview" className="w-full h-32 object-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x150?text=Invalid+Image+URL'; }}
                  />
                </div>
              )}
              <p className="text-xs text-adm-on-surface-variant mt-1">Recommended size: 1200x400 pixels (3:1 aspect ratio)</p>
            </div>
            <div>
              <Label htmlFor="target_link">Target Link</Label>
              <Input id="target_link" value={formData.target_link} onChange={(e) => setFormData({ ...formData, target_link: e.target.value })} placeholder="/products or /products?deity=Krishna" required data-testid="banner-link-input" />
              <p className="text-xs text-adm-on-surface-variant mt-1">Where users will be redirected when clicking the banner</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input id="display_order" type="number" min="0" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} data-testid="banner-order-input" />
                <p className="text-xs text-adm-on-surface-variant mt-1">Lower numbers appear first</p>
              </div>
              <div>
                <Label>Active Status</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} data-testid="banner-active-toggle" />
                  <span className="text-sm text-adm-on-surface">{formData.is_active ? 'Active (visible on homepage)' : 'Inactive (hidden)'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1 rounded-lg py-6">Cancel</Button>
              <Button type="submit" className="flex-1 rounded-lg py-6 bg-adm-primary text-adm-on-primary hover:opacity-90" data-testid="submit-banner-button">
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBanners;
