import { useState } from 'react';
import axios from 'axios';
import { MapPin, CheckCircle2, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PincodeChecker = ({ compact = false }) => {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkPincode = async () => {
    if (pincode.length !== 6) {
      setResult({ error: 'Enter a valid 6-digit pincode' });
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const res = await axios.get(`${API}/check-pincode/${pincode}`);
      setResult(res.data);
    } catch (error) {
      setResult({ error: error.response?.data?.detail || 'Could not check pincode' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={compact ? '' : 'py-3 md:py-4 border-y border-[#E6D5C3]'}>
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin className="h-4 w-4" style={{ color: '#E53935' }} />
        <p className="text-xs md:text-sm font-medium">Check delivery availability</p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ''));
            setResult(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && checkPincode()}
          className="flex-1 max-w-[160px] px-3 py-2 text-xs md:text-sm border border-[#E6D5C3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
          data-testid="pincode-input"
        />
        <button
          onClick={checkPincode}
          disabled={checking}
          className="px-3 md:px-4 py-2 rounded-lg font-medium text-white text-xs md:text-sm"
          style={{ background: '#E53935' }}
          data-testid="check-pincode-button"
        >
          {checking ? '...' : 'Check'}
        </button>
      </div>
      {result && (
        <div className="flex items-center gap-1.5 mt-2 text-xs md:text-sm">
          {result.error ? (
            <span style={{ color: '#E53935' }}>{result.error}</span>
          ) : result.serviceable ? (
            <>
              <CheckCircle2 className="h-4 w-4" style={{ color: '#4CAF50' }} />
              <span style={{ color: '#4CAF50' }}>
                {result.message} — delivery in ~{result.estimated_days} day{result.estimated_days !== 1 ? 's' : ''}
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" style={{ color: '#E53935' }} />
              <span style={{ color: '#E53935' }}>{result.message}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PincodeChecker;
