import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import CreatableSelect from '../../components/CreatableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { deities, materials } from '../../utils/constants';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminProducts = ({ user, onLogout }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);

  // Upload one or more files for the Additional Images gallery
  const handleExtraImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingExtra(true);
    try {
      const token = localStorage.getItem('token');
      const uploaded = [];
      for (const file of files) {
        const data = new FormData();
        data.append('file', file);
        const response = await axios.post(`${API}/upload-image`, data, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        uploaded.push(response.data.url);
      }
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...uploaded.filter((u) => !prev.images.includes(u))] }));
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded`);
    } catch (error) {
      console.error(error);
      toast.error('Upload failed');
    } finally {
      setUploadingExtra(false);
      e.target.value = '';
    }
  };
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deity: '',
    material: '',
    price: '',
    mrp: '',
    image: '',
    images: [],
    colors: [],
    sizes: [],
    variant_group: '',
    size_label: '',
    color_label: '',
    stock: '',
    category: '',
    weight: '',
    dimensions: ''
  });
  const [discountPct, setDiscountPct] = useState('');
  const [imageInput, setImageInput] = useState('');

  // Added for the inventory_management restyle — the source app rendered
  // every fetched product with no search or pagination at all.
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PAGE_SIZE = 10;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Build dropdown options from: built-in constants + saved categories + values
  // already used on existing products, so custom values stay in "history".
  const deityOptions = [
    ...deities.map((d) => d.name),
    ...categories.filter((c) => c.type === 'deity').map((c) => c.name),
    ...products.map((p) => p.deity).filter(Boolean)
  ];
  const materialOptions = [
    ...materials.map((m) => m.value),
    ...categories.filter((c) => c.type === 'material').map((c) => c.name),
    ...products.map((p) => p.material).filter(Boolean)
  ];
  const categoryOptions = [
    ...categories.filter((c) => !['deity', 'material'].includes(c.type)).map((c) => c.name),
    'Statues', 'Brass Items', 'Copper Items', 'Pooja Thali', 'Diyas', 'Incense', 'Garlands', 'Accessories',
    ...products.map((p) => p.category).filter(Boolean)
  ];

  // Inventory table filtering + pagination (added for the restyle —
  // ported from inventory_management_geeta_pujan_bhandar's live search).
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.deity, p.material, p.category].some((f) => f?.toLowerCase().includes(q))
    );
  }, [products, productSearch]);
  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE));
  const pagedProducts = filteredProducts.slice(
    (productPage - 1) * PRODUCTS_PAGE_SIZE,
    productPage * PRODUCTS_PAGE_SIZE
  );

  // Existing variant group codes — pick from a list instead of retyping (no typos)
  const variantGroupOptions = [...new Set(products.map((pr) => pr.variant_group).filter(Boolean))];
  const groupSiblings = formData.variant_group
    ? products.filter((pr) => pr.variant_group === formData.variant_group && pr.id !== editingProduct?.id)
    : [];

  // Save a brand-new option as a category so it persists in history
  // and becomes available across the admin panel and the website.
  const saveNewOption = async (name, type, image = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/categories`, { name, type, image }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCategories();
      toast.success(`"${name}" added to ${type} options`);
    } catch (error) {
      console.error('Error saving new option:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        stock: parseInt(formData.stock),
        images: formData.images,
        variant_group: formData.variant_group.trim() || null,
        size_label: formData.size_label.trim() || null,
        color_label: formData.color_label.trim() || null,
        colors: formData.colors.filter((c) => c.name?.trim()),
        sizes: formData.sizes
          .filter((sz) => sz.label?.trim() && sz.price)
          .map((sz) => ({
            label: sz.label.trim(),
            price: parseFloat(sz.price),
            mrp: sz.mrp ? parseFloat(sz.mrp) : null
          }))
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Product updated successfully');
      } else {
        await axios.post(`${API}/products`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Product created successfully');
      }

      setShowDialog(false);
      setEditingProduct(null);
      setFormData({
        name: '', description: '', deity: '', material: '', price: '', mrp: '',
        image: '', images: [], stock: '', category: '', weight: '', dimensions: '', colors: [], sizes: [], variant_group: '', size_label: '', color_label: ''
      });
      setImageInput('');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      deity: product.deity,
      material: product.material,
      price: product.price.toString(),
      mrp: product.mrp ? product.mrp.toString() : '',
      image: product.image,
      images: product.images || [],
      colors: product.colors || [],
      sizes: product.sizes || [],
      variant_group: product.variant_group || '',
      size_label: product.size_label || '',
      color_label: product.color_label || '',
      stock: product.stock.toString(),
      category: product.category || '',
      weight: product.weight || '',
      dimensions: product.dimensions || ''
    });
    setDiscountPct(product.mrp && product.price && product.mrp > product.price ? String(Math.round((1 - product.price / product.mrp) * 100)) : '');
    setImageInput('');
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleImageUpload = async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  try {
    setUploading(true);

    const token = localStorage.getItem("token");

    const data = new FormData();
    data.append("file", file);

    const response = await axios.post(
      `${API}/upload-image`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      }
    );

    setFormData({
      ...formData,
      image: response.data.url
    });

    toast.success("Image uploaded");
  } catch (error) {
    console.error(error);
    toast.error("Upload failed");
  } finally {
    setUploading(false);
  }
};

  return (
    <AdminLayout user={user} onLogout={onLogout} searchPlaceholder="Search sacred items...">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-3xl text-adm-on-surface">Sacred Inventory</h1>
          <p className="text-sm text-adm-on-surface-variant mt-1">Manage and update your catalog of spiritual essentials.</p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: '', description: '', deity: '', material: '', price: '', mrp: '',
              image: '', images: [], stock: '', category: '', weight: '', dimensions: '', colors: [], sizes: [], variant_group: '', size_label: '', color_label: ''
            });
            setImageInput('');
            setShowDialog(true);
          }}
          className="rounded-lg px-6 bg-adm-primary text-adm-on-primary hover:opacity-90 warm-shadow"
          data-testid="add-product-button"
        >
          <Plus className="mr-2 h-5 w-5" /> Add New Item
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-adm-surface-container p-4 rounded-xl border border-adm-outline-variant/20 flex flex-col justify-between">
          <span className="font-label-md text-sm text-adm-on-surface-variant">Total Products</span>
          <span className="font-headline-md text-2xl font-bold text-adm-primary">{products.length}</span>
        </div>
        <div className="bg-adm-surface-container p-4 rounded-xl border border-adm-outline-variant/20 flex flex-col justify-between">
          <span className="font-label-md text-sm text-adm-on-surface-variant">Low Stock Alert</span>
          <div className="flex items-center gap-2">
            <span className="font-headline-md text-2xl font-bold text-adm-error">
              {products.filter((p) => p.stock > 0 && p.stock < 5).length}
            </span>
            <span className="material-symbols-outlined text-adm-error">warning</span>
          </div>
        </div>
        <div className="bg-adm-surface-container p-4 rounded-xl border border-adm-outline-variant/20 flex flex-col justify-between">
          <span className="font-label-md text-sm text-adm-on-surface-variant">Categories</span>
          <span className="font-headline-md text-2xl font-bold text-adm-secondary">
            {new Set(products.map((p) => p.category).filter(Boolean)).size}
          </span>
        </div>
        <div className="bg-adm-surface-container p-4 rounded-xl border border-adm-outline-variant/20 flex flex-col justify-between">
          <span className="font-label-md text-sm text-adm-on-surface-variant">Out of Stock</span>
          <span className="font-body-md font-medium text-adm-on-surface">
            {products.filter((p) => p.stock === 0).length} items
          </span>
        </div>
      </div>

      {/* Live search — client-side filter over the already-fetched catalog */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-adm-on-surface-variant text-lg">search</span>
        <input
          type="text"
          value={productSearch}
          onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
          placeholder="Filter by name, deity, category..."
          className="w-full bg-adm-surface-container border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-adm-primary/20 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="text-adm-on-surface-variant">Loading products…</div>
      ) : (
        <div className="bg-adm-surface-container-lowest rounded-xl border border-adm-outline-variant/30 warm-shadow overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-adm-surface-container-low border-b border-adm-outline-variant/20">
                <tr>
                  <th className="p-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Image</th>
                  <th className="p-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Product Name</th>
                  <th className="p-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Category</th>
                  <th className="p-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Stock Level</th>
                  <th className="p-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Price</th>
                  <th className="p-4 font-label-md text-xs text-adm-on-surface-variant uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-outline-variant/10">
                {pagedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-adm-surface-container-low transition-colors" data-testid={`product-row-${product.id}`}>
                    <td className="p-4">
                      <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-sm text-adm-on-surface">{product.name}</p>
                      <p className="text-xs text-adm-on-surface-variant">ID: {product.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-adm-secondary-container/30 text-adm-secondary">
                        {product.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${product.stock < 5 ? 'text-adm-error' : 'text-adm-on-surface'}`}>
                          {product.stock} units
                        </span>
                        {product.stock === 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-adm-error text-white">OUT OF STOCK</span>
                        ) : product.stock < 5 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-adm-error text-white">LOW STOCK</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-sm text-adm-on-surface">₹{product.price.toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} data-testid={`edit-${product.id}`}>
                          <Pencil className="h-4 w-4 text-adm-on-surface-variant" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} data-testid={`delete-${product.id}`}>
                          <Trash2 className="h-4 w-4 text-adm-error" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center text-adm-on-surface-variant">
                {productSearch ? `No products match "${productSearch}".` : 'No products found. Add your first product!'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-adm-outline-variant/20 bg-adm-surface-container-low/50">
              <p className="text-sm text-adm-on-surface-variant">
                Showing {filteredProducts.length === 0 ? 0 : (productPage - 1) * PRODUCTS_PAGE_SIZE + 1}
                –{Math.min(productPage * PRODUCTS_PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length} items
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                  disabled={productPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-adm-outline-variant text-adm-on-surface-variant hover:bg-adm-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                {Array.from({ length: productTotalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === productTotalPages || Math.abs(p - productPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-adm-on-surface-variant">...</span>}
                      <button
                        onClick={() => setProductPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${
                          p === productPage ? 'bg-adm-primary text-adm-on-primary font-bold' : 'hover:bg-adm-surface-container text-adm-on-surface-variant'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))}
                  disabled={productPage === productTotalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-adm-outline-variant text-adm-on-surface-variant hover:bg-adm-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display', color: '#E53935' }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Product Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required data-testid="product-name-input" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required data-testid="product-description-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deity</Label>
                  <CreatableSelect
                    value={formData.deity}
                    options={deityOptions}
                    placeholder="Select Deity"
                    addLabel="Add new deity..."
                    inputPlaceholder="e.g. Kartikeya"
                    onChange={(value, isNew) => {
                      setFormData({ ...formData, deity: value });
                      if (isNew) saveNewOption(value, 'deity', formData.image);
                    }}
                    testId="product-deity-select"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <CreatableSelect
                    value={formData.category}
                    options={categoryOptions}
                    placeholder="Select Category"
                    addLabel="Add new category..."
                    inputPlaceholder="e.g. Idols, Bells"
                    onChange={(value, isNew) => {
                      setFormData({ ...formData, category: value });
                      if (isNew) saveNewOption(value, 'accessory', formData.image);
                    }}
                    testId="product-category-select"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Material</Label>
                  <CreatableSelect
                    value={formData.material}
                    options={materialOptions}
                    placeholder="Select Material"
                    addLabel="Add new material..."
                    inputPlaceholder="e.g. Silver, Wood"
                    onChange={(value, isNew) => {
                      setFormData({ ...formData, material: value });
                      if (isNew) saveNewOption(value, 'material', formData.image);
                    }}
                    testId="product-material-select"
                  />
                </div>
                <div>
                  <Label>MRP (₹)</Label>
                  <Input type="number" value={formData.mrp} onChange={(e) => {
                    const mrp = e.target.value;
                    // Keep discount % applied to the new MRP
                    const pct = parseFloat(discountPct);
                    const next = { ...formData, mrp };
                    if (mrp && !isNaN(pct) && pct > 0) next.price = String(Math.round(parseFloat(mrp) * (1 - pct / 100)));
                    setFormData(next);
                  }} placeholder="e.g. 7000" data-testid="product-mrp-input" />
                </div>
                <div>
                  <Label>Discount % — auto-calculates price</Label>
                  <Input type="number" value={discountPct} onChange={(e) => {
                    const pct = e.target.value;
                    setDiscountPct(pct);
                    if (formData.mrp && pct !== '' && !isNaN(parseFloat(pct))) {
                      setFormData({ ...formData, price: String(Math.round(parseFloat(formData.mrp) * (1 - parseFloat(pct) / 100))) });
                    }
                  }} placeholder="e.g. 19" data-testid="product-discount-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Selling Price (₹)</Label>
                  <Input type="number" value={formData.price} onChange={(e) => {
                    const price = e.target.value;
                    setFormData({ ...formData, price });
                    // Editing price directly recomputes the shown discount %
                    if (formData.mrp && price) {
                      const pct = Math.round((1 - parseFloat(price) / parseFloat(formData.mrp)) * 100);
                      setDiscountPct(pct > 0 ? String(pct) : '');
                    }
                  }} required data-testid="product-price-input" />
                </div>
                <div className="flex items-end pb-2">
                  {formData.mrp && formData.price && parseFloat(formData.mrp) > parseFloat(formData.price) ? (
                    <p className="text-sm">
                      Customer sees: <span className="font-bold" style={{ color: '#E53935' }}>₹{parseFloat(formData.price).toLocaleString()}</span>{' '}
                      <span className="line-through text-[#8C7E76]">₹{parseFloat(formData.mrp).toLocaleString()}</span>{' '}
                      <span className="font-semibold" style={{ color: '#2D8659' }}>{Math.round((1 - formData.price / formData.mrp) * 100)}% off</span>
                    </p>
                  ) : (
                    <p className="text-xs text-[#8C7E76]">Add MRP + discount to show a deal price</p>
                  )}
                </div>
              </div>
              <div className="border border-[#E6D5C3] rounded-lg p-3 space-y-2">
                <Label>Link size / colour variants (optional)</Label>
                <p className="text-xs text-[#8C7E76]">
                  Create each size/colour as its own product (own price, stock, photos), then give them all the
                  same <b>variant group code</b>. They will appear on each other's pages — clicking one opens that product.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <CreatableSelect
                      value={formData.variant_group}
                      options={variantGroupOptions}
                      placeholder="Select group"
                      addLabel="New group..."
                      inputPlaceholder="e.g. krishna-brass"
                      onChange={(value) => setFormData({ ...formData, variant_group: value })}
                      testId="variant-group-input"
                    />
                    <p className="text-[10px] text-[#8C7E76] mt-1">Pick the existing group — only type once, for the first product</p>
                  </div>
                  <div>
                    <Input placeholder="Size e.g. 9 inch" value={formData.size_label} onChange={(e) => setFormData({ ...formData, size_label: e.target.value })} data-testid="variant-size-input" />
                    <p className="text-[10px] text-[#8C7E76] mt-1">This product's size</p>
                  </div>
                  <div>
                    <Input placeholder="Colour e.g. Golden" value={formData.color_label} onChange={(e) => setFormData({ ...formData, color_label: e.target.value })} data-testid="variant-color-input" />
                    <p className="text-[10px] text-[#8C7E76] mt-1">This product's colour</p>
                  </div>
                </div>
                {formData.variant_group && (
                  <p className="text-xs mt-1" style={{ color: groupSiblings.length ? '#2D8659' : '#BA7517' }}>
                    {groupSiblings.length
                      ? `Will link with: ${groupSiblings.map((pr) => `${pr.name}${pr.size_label ? ` (${pr.size_label})` : ''}${pr.color_label ? ` [${pr.color_label}]` : ''}`).join(', ')}`
                      : 'No other products in this group yet — add the next size/colour with the same group.'}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stock</Label>
                  <Input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} required data-testid="product-stock-input" />
                </div>
                <div>
  <Label>Main Product Image</Label>

  <Input
    type="file"
    accept="image/*"
    onChange={handleImageUpload}
  />

  {uploading && (
    <p className="text-sm text-gray-500 mt-2">
      Uploading image...
    </p>
  )}

  {formData.image && (
    <img
      src={formData.image}
      alt="preview"
      className="w-32 h-32 object-cover rounded-lg mt-2 border"
    />
  )}
                </div>
              </div>
              <div>
                <Label>Additional Images</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    placeholder="Paste image URL and click Add"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const url = imageInput.trim();
                        if (url && !formData.images.includes(url)) {
                          setFormData({ ...formData, images: [...formData.images, url] });
                          setImageInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const url = imageInput.trim();
                      if (url && !formData.images.includes(url)) {
                        setFormData({ ...formData, images: [...formData.images, url] });
                        setImageInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleExtraImagesUpload} data-testid="extra-images-upload" />
                    <span className={`inline-flex items-center h-9 px-3 rounded-md border border-[#E6D5C3] text-sm font-medium hover:bg-[#FFF5F5] transition-colors ${uploadingExtra ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingExtra ? 'Uploading...' : '📤 Upload'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-[#8C7E76] mt-1">Upload from your computer (select multiple at once) or paste a URL.</p>
                {formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E6D5C3]" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Weight (optional)</Label>
                  <Input value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} placeholder="e.g., 2kg" data-testid="product-weight-input" />
                </div>
                <div>
                  <Label>Dimensions (optional)</Label>
                  <Input value={formData.dimensions} onChange={(e) => setFormData({...formData, dimensions: e.target.value})} placeholder="e.g., 10x5x15 inches" data-testid="product-dimensions-input" />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full py-6" style={{ background: '#E53935' }} data-testid="submit-product-button">
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
    </AdminLayout>
  );
};

export default AdminProducts;