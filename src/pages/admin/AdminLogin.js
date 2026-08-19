import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import '../../styles/admin-theme.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Ported from admin_login_geeta_pujan_bhandar (Stitch canvas).
//
// The design shows a "Keep me signed in" checkbox, deliberately left out
// here: the JWT this app issues is already a flat 30-day token regardless
// of any checkbox (see backend/server.py's create_token), and the token
// is always read from localStorage everywhere in this app — there's no
// separate session-only storage mode to toggle between. A checkbox that
// doesn't change any real behavior would be decoration pretending to be
// a setting, so it's not included. If session-scoped admin logins become
// a real requirement, that's a broader change (a second token lifetime,
// and updating every call site that reads the token) — not a login-page
// restyle.
//
// The design's inline error banner (vs. the previous toast-only error) is
// real and included — it stays visible until the next submit attempt,
// which is more useful on a form with only two fields than a toast that
// disappears in a few seconds.

const AdminLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, credentials);

      if (response.data.user.role !== 'admin') {
        setError('This account does not have admin access.');
        setLoading(false);
        return;
      }

      onLogin(response.data.token, response.data.user);
      toast.success('Login successful!');
      navigate('/admin/dashboard');
    } catch (error) {
      setError('Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div
      className="admin-shell min-h-screen flex items-center justify-center py-12 px-4"
      style={{ background: 'radial-gradient(circle at 50% 50%, rgba(254,214,91,0.1) 0%, rgb(var(--adm-background)) 100%)' }}
    >
      <div className="glass-card rounded-xl p-8 w-full max-w-md border-t-4 border-adm-secondary-container">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-adm-primary text-4xl mb-2 block">temple_hindu</span>
          <h1 className="font-headline-md text-2xl text-adm-primary font-bold">Geeta Pujan Bhandar</h1>
          <p className="text-xs uppercase tracking-widest text-adm-on-surface-variant mt-1">Admin Console</p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 bg-adm-error-container text-adm-on-error-container text-sm px-4 py-3 rounded-lg mb-4 animate-fade-up"
            data-testid="admin-login-error"
          >
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              placeholder="admin@geetapujan.com"
              required
              className={error ? 'border-adm-error focus-visible:ring-adm-error/30' : ''}
              data-testid="admin-email-input"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
              className={error ? 'border-adm-error focus-visible:ring-adm-error/30' : ''}
              data-testid="admin-password-input"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-lg py-6 font-bold bg-adm-primary text-adm-on-primary hover:opacity-90 warm-shadow"
            disabled={loading}
            data-testid="admin-login-button"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                Authenticating…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Access Console
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
