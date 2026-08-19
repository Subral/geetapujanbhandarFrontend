import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// All real auth state and handlers, extracted so AuthDialog (modal) and
// LoginGate (full-page, route-level gate for /cart and /checkout) share
// exactly one implementation instead of two independently-maintained
// copies of the same login/register/OTP/reset logic — the two screens
// differ only in layout chrome, not in what they actually do.
//
// onSuccess(user) is called after any successful auth action. Each
// caller decides what "done" means: AuthDialog closes its dialog,
// LoginGate navigates to wherever the shopper was originally headed.
export const useAuthFlow = ({ onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    identifier: '', otp: '', resetToken: '', newPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const finishAuth = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // See AuthDialog.js's header comment for why this event exists
    // rather than window.location.reload().
    window.dispatchEvent(new CustomEvent('gpb:auth-changed', { detail: data.user }));
    toast.success('Login successful!');
    onSuccess?.(data.user);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        identifier: form.identifier, password: form.password,
      });
      finishAuth(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.phone)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register/send-otp`, {
        name: form.name, email: form.email, phone: form.phone,
      });
      setRegOtpSent(true);
      if (res.data.dev_otp) {
        toast.success(`OTP (dev mode): ${res.data.dev_otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent to your mobile');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!/^\d{6}$/.test(form.otp)) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: form.name, email: form.email, password: form.password,
        phone: form.phone, otp: form.otp,
      });
      finishAuth(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resendRegOtp = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register/send-otp`, {
        name: form.name, email: form.email, phone: form.phone,
      });
      if (res.data.dev_otp) {
        toast.success(`OTP (dev mode): ${res.data.dev_otp}`, { duration: 10000 });
      } else {
        toast.success('OTP resent');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    if (!/^\d{10}$/.test(form.phone)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setOtpError('');
    try {
      const res = await axios.post(`${API}/auth/otp/request`, { phone: form.phone });
      setOtpSent(true);
      setMode('otp');
      if (res.data.dev_otp) {
        toast.success(`OTP (dev mode): ${res.data.dev_otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent to your mobile');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setOtpError('');
    try {
      const res = await axios.post(`${API}/auth/otp/verify`, { phone: form.phone, otp: form.otp });
      finishAuth(res.data);
    } catch (error) {
      setOtpError(error.response?.data?.detail || "That code isn't right. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async () => {
    if (!form.email) {
      toast.error('Enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { email: form.email });
      setMode('reset');
      if (res.data.dev_token) {
        toast.success(`Reset code (dev mode): ${res.data.dev_token}`, { duration: 10000 });
      } else {
        toast.success('If an account exists, a reset code was sent');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  const doReset = async () => {
    if (form.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        email: form.email, token: form.resetToken, new_password: form.newPassword,
      });
      toast.success('Password reset! Please log in.');
      setMode('login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API}/auth/google/callback`, {
        credential: credentialResponse.credential,
      });
      finishAuth(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Google sign-in failed');
    }
  };

  return {
    mode, setMode, loading, form, setField, otpSent, setOtpSent,
    regOtpSent, setRegOtpSent, otpError, setOtpError,
    handleEmailLogin, handleRegisterSubmit, completeRegistration, resendRegOtp,
    requestOtp, verifyOtp, requestReset, doReset, handleGoogleSuccess,
  };
};
