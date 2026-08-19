import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import CreatableSelect from '../../components/CreatableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from category_management_geeta_pujan_bhandar (Stitch canvas).
//
// REAL GAPS CLOSED WHILE BUILDING (not just a visual pass):
//  - Categories previously could only be created and deleted — there was
//    no way to edit one at all. The design's per-card "Edit" action needed
//    a real PUT endpoint, which didn't exist; added `PUT /categories/{id}`
//    on the backend and wired this page to use it.
//  - The design's "description" text under each category name has no
//    matching field on the Category model. Added `description` to the
//    model (optional, additive, non-breaking for existing categories that
//    won't have one) rather than showing invented text with nowhere to
//    save it.
//  - The "124 Products" count badge has no backend aggregate to read —
//    computed client-side from the already-fetched product catalog,
//    matched by the same type-to-field logic the storefront's category
//    nav already uses (deity -> product.deity, material -> product.material,
//    anything else -> product.category).
//  - The design's "Premium" badge on one example card was dropped — it's
//    not backed by any real field (no featured/premium flag exists on
//    Category), and adding one wasn't asked for here.
//
// A confirm dialog (styled, not window.confirm()) replaces the delete
// action's previous browser-native confirm — matches the design and is a
// real UX improvement, not just decoration.

const AdminCategories = ({ user, onLogout }) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'deity', image: '', description: '' });

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const defaultTypes = ['deity', 'material', 'accessory'];
  const typeOptions = [...defaultTypes, ...categories.map((c) => c.type).filter(Boolean)];

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products?limit=1000`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products for category counts:', error);
    }
  };

  // Same type -> field mapping the storefront's Home.js already uses for
  // category nav, so counts here match what a shopper would actually see
  // if they clicked into that category.
  const productCountFor = (category) => {
    const field = category.type === 'deity' ? 'deity' : category.type === 'material' ? 'material' : 'category';
    return products.filter((p) => p[field] === category.name).length;
  };

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [categories, search]);

  const resetForm = () => setFormData({ name: '', type: 'deity', image: '', description: '' });

  const openAddDialog = () => {
    setEditingCategory(null);
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      image: category.image,
      description: category.description || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Category updated successfully');
      } else {
        await axios.post(`${API}/categories`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Category created successfully');
      }
      setShowDialog(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(editingCategory ? 'Failed to update category' : 'Failed to create category');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/categories/${deleteTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Category deleted');
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout user={user} onLogout={onLogout} searchPlaceholder="Search categories...">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl text-adm-on-surface">Categories Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-adm-on-surface-variant text-lg">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="bg-adm-surface-container-lowest border border-adm-outline-variant rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-adm-primary/20 outline-none w-56"
              data-testid="category-search-input"
            />
          </div>
          <Button
            onClick={openAddDialog}
            className="rounded-lg px-5 bg-adm-primary text-adm-on-primary hover:opacity-90 warm-shadow"
            data-testid="add-category-button"
          >
            <Plus className="mr-2 h-5 w-5" /> Add Category
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-adm-on-surface-variant">Loading categories…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category, i) => (
            <div
              key={category.id}
              className={`group bg-adm-surface-container-lowest rounded-xl border border-adm-outline-variant/30 overflow-hidden warm-shadow warm-shadow-hover transition-all animate-fade-up ${i < 4 ? `delay-${(i + 1) * 100}` : ''} flex flex-col`}
              data-testid={`category-${category.id}`}
            >
              <div className="relative h-48 w-full overflow-hidden bg-adm-surface-container-low">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-headline-sm text-lg text-adm-on-surface">{category.name}</h3>
                  <button
                    aria-label="Delete category"
                    onClick={() => setDeleteTarget(category)}
                    className="text-adm-on-surface-variant hover:text-adm-error transition-colors p-1 rounded-full hover:bg-adm-error-container"
                    data-testid={`delete-category-${category.id}`}
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
                <p className="text-sm text-adm-on-surface-variant mb-4 line-clamp-2 flex-1">
                  {category.description || `Products tagged "${category.name}"`}
                </p>
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-adm-outline-variant/20">
                  <span className="inline-flex items-center gap-1 bg-adm-surface-container-high text-adm-on-surface-variant px-2 py-1 rounded-md text-xs">
                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                    {productCountFor(category)} Products
                  </span>
                  <button
                    onClick={() => openEditDialog(category)}
                    className="text-adm-primary font-bold text-sm hover:underline"
                    data-testid={`edit-category-${category.id}`}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Create New Category — dashed-border trigger card, matches the design */}
          <button
            onClick={openAddDialog}
            className="border-2 border-dashed border-adm-outline-variant rounded-xl flex flex-col items-center justify-center p-8 text-center hover:border-adm-primary hover:bg-adm-primary-container/5 transition-colors min-h-[280px]"
            data-testid="add-category-card"
          >
            <div className="w-12 h-12 rounded-full bg-adm-primary text-adm-on-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">add</span>
            </div>
            <h3 className="font-headline-sm text-lg text-adm-on-surface mb-1">Create New Category</h3>
            <p className="text-sm text-adm-on-surface-variant max-w-[200px]">
              Organize your inventory by adding a new product grouping.
            </p>
          </button>
        </div>
      )}

      {!loading && filteredCategories.length === 0 && categories.length > 0 && (
        <div className="text-center py-12 text-adm-on-surface-variant">
          No categories match "{search}".
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline-md text-adm-primary">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="category-name-input"
              />
            </div>
            <div>
              <Label>Type</Label>
              <CreatableSelect
                value={formData.type}
                options={typeOptions}
                placeholder="Select type"
                addLabel="Add new type..."
                inputPlaceholder="e.g. festival, fabric..."
                onChange={(value) => setFormData({ ...formData, type: value })}
                testId="category-type-select"
              />
              <p className="text-xs text-adm-on-surface-variant mt-1">
                Pick a type or add your own — new types are saved and will appear here next time.
              </p>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Sacred brass, marble, and wooden murtis for home temples."
                data-testid="category-description-input"
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                required
                data-testid="category-image-input"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-lg py-6 bg-adm-primary text-adm-on-primary hover:opacity-90"
              data-testid="submit-category-button"
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — styled dialog, not window.confirm() */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm text-center">
          <div className="w-16 h-16 bg-adm-error-container text-adm-error rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-adm-on-surface text-center">Delete Category?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-adm-on-surface-variant">
            Are you sure you want to delete '<span className="font-bold">{deleteTarget?.name}</span>'?
            This action cannot be undone and will affect associated products.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-5 py-2 rounded-lg border border-adm-outline text-adm-on-surface font-bold text-sm hover:bg-adm-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-5 py-2 rounded-lg bg-adm-error text-white font-bold text-sm hover:opacity-90 transition-opacity"
              data-testid="confirm-delete-category"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCategories;
