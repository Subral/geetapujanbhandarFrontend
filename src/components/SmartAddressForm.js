import { useState } from 'react';
import axios from 'axios';
import { MapPin, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { lucknowAreas } from '../utils/constants';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Reusable smart address form.
 *
 * Props:
 *  - value:   the address object { name, phone, address_line, area, pincode, is_default }
 *  - onChange(updatedAddress): called whenever any field changes
 *  - showDefaultCheckbox: whether to render the "set as default" checkbox
 *  - showSaveToProfile:   whether to render the "save this address to my profile" checkbox
 *  - saveToProfile / onSaveToProfileChange: controlled state for that checkbox
 */
const SmartAddressForm = ({
  value,
  onChange,
  showDefaultCheckbox = false,
  showSaveToProfile = false,
  saveToProfile = false,
  onSaveToProfileChange = () => {},
}) => {
  const [detecting, setDetecting] = useState(false);
  const [pincodeLookup, setPincodeLookup] = useState({ loading: false, areas: [], done: false });

  const setField = (field, val) => onChange({ ...value, [field]: val });

  // ---- Pincode -> area/city lookup ----
  const handlePincodeChange = async (raw) => {
    const pin = raw.replace(/\D/g, '').slice(0, 6);
    onChange({ ...value, pincode: pin });
    setPincodeLookup({ loading: false, areas: [], done: false });

    if (pin.length === 6) {
      setPincodeLookup({ loading: true, areas: [], done: false });
      try {
        const res = await axios.get(`${API}/pincode-lookup/${pin}`);
        const { areas = [], city = '', serviceable } = res.data;
        setPincodeLookup({ loading: false, areas, done: true });
        // Auto-fill area if we got exactly one, otherwise leave for the dropdown
        if (areas.length === 1) {
          onChange({ ...value, pincode: pin, area: areas[0] });
        }
        if (!serviceable) {
          toast('This pincode is outside our delivery zone', {
            description: 'We currently deliver only within Lucknow.',
          });
        }
      } catch (error) {
        setPincodeLookup({ loading: false, areas: [], done: true });
      }
    }
  };

  // ---- GPS "use my current location" ----
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          const data = await res.json();
          const a = data.address || {};
          const addressLine = [a.house_number, a.road || a.street || a.pedestrian, a.neighbourhood || a.suburb]
            .filter(Boolean)
            .join(', ');
          const detectedArea = a.suburb || a.neighbourhood || a.city_district || '';
          const matchedArea =
            lucknowAreas.find((area) => detectedArea.toLowerCase().includes(area.toLowerCase())) || '';
          onChange({
            ...value,
            address_line: addressLine || value.address_line,
            pincode: a.postcode || value.pincode,
            area: matchedArea || value.area,
          });
          toast.success('Location detected — please verify and adjust if needed');
        } catch {
          toast.error('Could not fetch your address. Please enter it manually.');
        }
        setDetecting(false);
      },
      (error) => {
        setDetecting(false);
        if (error.code === 1) {
          toast('Location permission denied', {
            description: 'Please allow location access or enter your address manually.',
          });
        } else {
          toast.error('Could not detect location. Please enter manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // The area dropdown options: pincode-lookup results if available, else the static Lucknow list
  const areaOptions = pincodeLookup.areas.length > 0 ? pincodeLookup.areas : lucknowAreas;

  return (
    <div className="space-y-3">
      {/* Use current location */}
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-colors"
        style={{ borderColor: '#E53935', color: '#E53935' }}
        data-testid="use-current-location"
      >
        {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        {detecting ? 'Detecting your location...' : 'Use my current location'}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Full Name</Label>
          <Input
            value={value.name}
            onChange={(e) => setField('name', e.target.value)}
            className="text-sm"
            data-testid="address-name-input"
          />
        </div>
        <div>
          <Label className="text-xs">Phone <span style={{ color: '#E53935' }}>*</span></Label>
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={value.phone}
            onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile"
            className="text-sm"
            data-testid="address-phone-input"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Address Line</Label>
        <Input
          value={value.address_line}
          onChange={(e) => setField('address_line', e.target.value)}
          placeholder="House no., Street name, Landmark"
          className="text-sm"
          data-testid="address-line-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs flex items-center gap-1">
            Pincode <span style={{ color: '#E53935' }}>*</span>
            {pincodeLookup.loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {pincodeLookup.done && !pincodeLookup.loading && value.pincode.length === 6 && (
              <CheckCircle2 className="h-3 w-3" style={{ color: '#4CAF50' }} />
            )}
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={value.pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            placeholder="Enter to auto-fill area"
            className="text-sm"
            data-testid="address-pincode-input"
          />
        </div>
        <div>
          <Label className="text-xs">Area</Label>
          <Select value={value.area} onValueChange={(v) => setField('area', v)}>
            <SelectTrigger className="text-sm" data-testid="address-area-select">
              <SelectValue placeholder="Select Area" />
            </SelectTrigger>
            <SelectContent>
              {areaOptions.map((area) => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showDefaultCheckbox && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is-default"
            checked={value.is_default || false}
            onChange={(e) => setField('is_default', e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="is-default" className="text-xs">Set as default address</Label>
        </div>
      )}

      {showSaveToProfile && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="save-to-profile"
            checked={saveToProfile}
            onChange={(e) => onSaveToProfileChange(e.target.checked)}
            className="rounded"
            data-testid="save-to-profile-checkbox"
          />
          <Label htmlFor="save-to-profile" className="text-xs flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Save this address to my profile for next time
          </Label>
        </div>
      )}
    </div>
  );
};

export default SmartAddressForm;
