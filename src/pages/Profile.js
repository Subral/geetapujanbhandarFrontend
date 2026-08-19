import { useState, useEffect } from 'react';
import SmartAddressForm from '../components/SmartAddressForm';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Phone, MapPin, Package, HeadphonesIcon, LogOut, ChevronRight, Edit2, Plus, Trash2, Heart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import SupportDialog from '../components/SupportDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from 08_account (finalized Stitch canvas). All real logic
// unchanged: fetchUserData, fetchOrders, handleSaveProfile,
// handleSaveAddress, handleDeleteAddress, SmartAddressForm reuse,
// SupportDialog reuse.
//
// Structural change, not just a restyle: the design uses three tabs
// (Account Details / Addresses / Orders) instead of everything stacked
// as separate cards on one long page. The Details tab is inline-editable
// directly on the tab rather than behind an Edit icon that opens a
// modal — a real simplification the design calls for, not just new
// paint. Wishlist and Support — both real, working features with no
// equivalent in the design's three tabs — are kept as a persistent
// action row rather than dropped, same reasoning as keeping the admin
// dashboard's Low Stock Alerts when a redesign didn't know they existed.
//
// Removed `lucknowAreas`, a 15-item array declared but never referenced
// anywhere in this file — dead code, most likely a leftover from before
// SmartAddressForm was extracted into its own component.

const TABS = [
  { key: 'details', label: 'Account Details' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'orders', label: 'Orders' },
];

const Profile = ({ user: propUser, onLogout }) => {
  const [user, setUser] = useState(propUser);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showSupport, setShowSupport] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', gender: '' });
  const [addressForm, setAddressForm] = useState({
    name: '', phone: '', address_line: '', area: '', pincode: '', is_default: false,
  });

  useEffect(() => {
    if (!propUser) {
      navigate('/');
      return;
    }
    fetchUserData();
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propUser]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '', email: user.email || '', phone: user.phone || '', gender: user.gender || '',
      });
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API}/users/me`, profileForm, { headers: { Authorization: `Bearer ${token}` } });
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.name || !addressForm.phone || !addressForm.address_line || !addressForm.area || !addressForm.pincode) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!/^\d{10}$/.test(addressForm.phone)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (editingAddress !== null) {
        await axios.put(`${API}/users/me/addresses/${editingAddress}`, addressForm, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Address updated!');
      } else {
        await axios.post(`${API}/users/me/addresses`, addressForm, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Address added!');
      }
      fetchUserData();
      resetAddressForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (index) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/users/me/addresses/${index}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Address deleted!');
      fetchUserData();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const resetAddressForm = () => {
    setAddressForm({ name: '', phone: '', address_line: '', area: '', pincode: '', is_default: false });
    setEditingAddress(null);
    setShowAddAddress(false);
  };

  const openEditAddress = (address, index) => {
    setAddressForm(address);
    setEditingAddress(index);
    setShowAddAddress(true);
  };

  const handleLogout = () => {
    onLogout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-sf-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <>
      <div className="storefront-shell min-h-screen bg-sf-background py-4 md:py-8 px-4 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

          {/* Header */}
          <div className="sacred-card rounded-xl p-4 md:p-6 flex items-center justify-between animate-page-enter">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-sf-secondary-container/30">
                <User className="w-8 h-8 md:w-10 md:h-10 text-sf-primary" />
              </div>
              <div>
                <h1 className="font-headline-lg text-lg md:text-2xl text-sf-primary">{user?.name}</h1>
                <p className="text-xs md:text-sm text-sf-on-surface-variant">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-sf-on-surface-variant hover:text-sf-primary" data-testid="logout-button">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* Quick links: Wishlist + Support — real features, no
              equivalent in the design's three tabs, kept rather than dropped */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Link to="/wishlist" className="sacred-card card-hover rounded-xl p-3 md:p-4 flex items-center gap-3" data-testid="wishlist-link">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-sf-secondary-container/30 flex-shrink-0">
                <Heart className="w-4 h-4 text-sf-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-sf-on-surface truncate">My Wishlist</p>
                <p className="text-xs text-sf-on-surface-variant truncate">Saved for later</p>
              </div>
            </Link>
            <button onClick={() => setShowSupport(true)} className="sacred-card card-hover rounded-xl p-3 md:p-4 flex items-center gap-3 text-left" data-testid="support-button">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-sf-secondary-container/30 flex-shrink-0">
                <HeadphonesIcon className="w-4 h-4 text-sf-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-sf-on-surface truncate">Contact Support</p>
                <p className="text-xs text-sf-on-surface-variant truncate">Get help with orders</p>
              </div>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-sf-outline-variant">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key ? 'border-sf-primary text-sf-primary' : 'border-transparent text-sf-on-surface-variant hover:text-sf-on-surface'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Details tab — inline editable, no modal */}
          {activeTab === 'details' && (
            <div className="sacred-card rounded-xl p-4 md:p-6 space-y-4 animate-page-enter">
              <h2 className="font-headline-md text-base md:text-xl text-sf-on-surface">Personal Information</h2>
              <div>
                <Label className="text-xs md:text-sm flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="text-sm md:text-base" data-testid="profile-name-input" />
              </div>
              <div>
                <Label className="text-xs md:text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</Label>
                <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="text-sm md:text-base" data-testid="profile-email-input" />
              </div>
              <div>
                <Label className="text-xs md:text-sm flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Mobile</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="text-sm md:text-base" data-testid="profile-phone-input" />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Gender</Label>
                <Select value={profileForm.gender} onValueChange={(value) => setProfileForm({ ...profileForm, gender: value })}>
                  <SelectTrigger className="text-sm" data-testid="profile-gender-select"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="rounded py-5 px-8 text-sm bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="save-profile-button">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {/* Addresses tab */}
          {activeTab === 'addresses' && (
            <div className="sacred-card rounded-xl p-4 md:p-6 animate-page-enter">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-md text-base md:text-xl text-sf-on-surface">Saved Addresses</h2>
                <button onClick={() => { resetAddressForm(); setShowAddAddress(true); }} className="flex items-center gap-1 text-xs md:text-sm font-medium text-sf-primary" data-testid="add-address-button">
                  <Plus className="w-4 h-4" /> Add New Address
                </button>
              </div>

              {!user?.addresses || user.addresses.length === 0 ? (
                <div className="text-center py-6">
                  <MapPin className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-sf-outline-variant" />
                  <p className="text-sm md:text-base text-sf-on-surface-variant mb-3">No saved addresses</p>
                  <button onClick={() => setShowAddAddress(true)} className="text-sm font-medium text-sf-primary">Add your first address</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.addresses.map((address, index) => (
                    <div key={index} className="border border-sf-outline-variant rounded-xl p-3 md:p-4 relative">
                      {address.is_default && (
                        <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-sf-primary text-sf-on-primary">Default</span>
                      )}
                      <div className="pr-16">
                        <p className="text-sm md:text-base font-medium text-sf-on-surface">{address.name}</p>
                        <p className="text-xs md:text-sm text-sf-on-surface-variant">{address.phone}</p>
                        <p className="text-xs md:text-sm text-sf-on-surface-variant mt-1">
                          {address.address_line}, {address.area}, Lucknow – {address.pincode}
                        </p>
                      </div>
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <button onClick={() => openEditAddress(address, index)} className="p-1.5 rounded-full hover:bg-sf-surface-container-low" data-testid={`edit-address-${index}`}>
                          <Edit2 className="w-4 h-4 text-sf-primary" />
                        </button>
                        <button onClick={() => handleDeleteAddress(index)} className="p-1.5 rounded-full hover:bg-red-50" data-testid={`delete-address-${index}`}>
                          <Trash2 className="w-4 h-4 text-sf-primary" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders tab */}
          {activeTab === 'orders' && (
            <div className="sacred-card rounded-xl p-4 md:p-6 animate-page-enter">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-md text-base md:text-xl text-sf-on-surface">Recent Orders</h2>
                {orders.length > 0 && (
                  <Link to="/orders" className="text-xs md:text-sm font-medium text-sf-primary">View All</Link>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-sf-outline-variant" />
                  <p className="text-sm md:text-base text-sf-on-surface-variant mb-3">No orders yet</p>
                  <Link to="/products">
                    <Button className="rounded px-6 py-2 text-sm bg-sf-primary text-sf-on-primary hover:opacity-90">Start Shopping</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link key={order.id} to={`/orders/${order.id}`} className="block border border-sf-outline-variant rounded-xl p-3 md:p-4 hover:border-sf-primary transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-xs md:text-sm text-sf-on-surface-variant">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs md:text-sm text-sf-on-surface-variant">
                            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm md:text-lg font-bold text-sf-primary">₹{order.total.toLocaleString('en-IN')}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${order.order_status === 'delivered' ? 'bg-green-100 text-green-700' : order.order_status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {order.order_status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-sf-on-surface-variant flex-1">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                        <ChevronRight className="w-4 h-4 text-sf-on-surface-variant" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Address Dialog */}
      <Dialog open={showAddAddress} onOpenChange={resetAddressForm}>
        <DialogContent className="storefront-shell sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline-md text-lg text-sf-primary">
              {editingAddress !== null ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SmartAddressForm value={addressForm} onChange={setAddressForm} showDefaultCheckbox />
            <Button onClick={handleSaveAddress} disabled={saving} className="w-full rounded py-5 text-sm bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="save-address-button">
              {saving ? 'Saving...' : editingAddress !== null ? 'Update Address' : 'Add Address'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showSupport && <SupportDialog open={showSupport} onClose={() => setShowSupport(false)} />}
    </>
  );
};

export default Profile;
