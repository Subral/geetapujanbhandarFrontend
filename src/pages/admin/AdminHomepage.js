import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminHomepage = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    hero_title: '',
    hero_subtitle: '',
    hero_image: '',
    hero_description: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/homepage-settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/homepage-settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Homepage settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout user={user} onLogout={onLogout}>
        <div>Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div>
        <h1 className="text-4xl font-bold mb-8" style={{ fontFamily: 'Playfair Display', color: '#E53935' }}>
          Homepage Settings
        </h1>

        <form onSubmit={handleSubmit} className="max-w-3xl">
          <div className="bg-white border border-[#E6D5C3] rounded-2xl p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Playfair Display' }}>
                Hero Section
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Hero Title</Label>
                  <Input
                    value={settings.hero_title}
                    onChange={(e) => setSettings({...settings, hero_title: e.target.value})}
                    placeholder="e.g., Divine Collection"
                    required
                    data-testid="hero-title-input"
                  />
                </div>

                <div>
                  <Label>Hero Subtitle</Label>
                  <Input
                    value={settings.hero_subtitle}
                    onChange={(e) => setSettings({...settings, hero_subtitle: e.target.value})}
                    placeholder="e.g., from Lucknow"
                    required
                    data-testid="hero-subtitle-input"
                  />
                </div>

                <div>
                  <Label>Hero Description</Label>
                  <Textarea
                    value={settings.hero_description}
                    onChange={(e) => setSettings({...settings, hero_description: e.target.value})}
                    placeholder="Brief description for hero section"
                    required
                    data-testid="hero-description-input"
                  />
                </div>

                <div>
                  <Label>Hero Image URL</Label>
                  <Input
                    value={settings.hero_image}
                    onChange={(e) => setSettings({...settings, hero_image: e.target.value})}
                    placeholder="https://..."
                    required
                    data-testid="hero-image-input"
                  />
                  {settings.hero_image && (
                    <div className="mt-3">
                      <p className="text-sm text-[#8C7E76] mb-2">Preview:</p>
                      <img 
                        src={settings.hero_image} 
                        alt="Hero preview" 
                        className="w-full h-64 object-cover rounded-lg border border-[#E6D5C3]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E6D5C3]">
              <Button
                type="submit"
                disabled={saving}
                className="w-full rounded-full py-6 font-semibold"
                style={{ background: '#E53935' }}
                data-testid="save-settings-button"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-8 bg-[#FFF3E0] border border-[#FFB74D] rounded-2xl p-6">
          <h4 className="font-bold mb-2" style={{ color: '#F57C00' }}>Note:</h4>
          <p className="text-sm text-[#8C7E76]">
            Changes will be reflected on the homepage immediately after saving. Make sure to use high-quality images for the best user experience.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHomepage;
