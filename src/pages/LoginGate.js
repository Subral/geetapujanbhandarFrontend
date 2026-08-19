import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useAuthFlow } from '../hooks/useAuthFlow';

// Ported from 15_login_gate (finalized Stitch canvas). Full-page version
// of AuthDialog — used as the route-level gate for /cart and /checkout,
// replacing what used to be a silent <Navigate to="/" /> with zero
// explanation whenever a logged-out visitor hit either URL directly.
//
// Shares useAuthFlow with AuthDialog.js rather than duplicating the
// login/register/OTP/reset logic a second time — the two components
// differ only in chrome (modal vs full page), not in what they do.
//
// The design's example shows a specific cart item ("Brass Akhand Diya,
// Qty 1, ₹1,250") as reassurance context. That can't be shown honestly
// here: a logged-out visitor has no accessible cart at all (the backend
// requires a token for every cart endpoint, and this app's cart is
// login-gated by design — see Cart.js/Checkout.js's route guards). Since
// there's no real item to point to at this route-level gate, the
// reassurance copy below is generic rather than item-specific — showing
// a fabricated example item would be worse than showing none.
const LoginGate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // LoginGate renders directly at whichever URL triggered it (App.js's
  // route does `user ? <Cart/> : <LoginGate/>` at the same path — it's
  // not a redirect to a separate /login-gate URL), so the current
  // pathname IS the destination: once `user` is set, re-navigating here
  // makes the route ternary resolve to the real page instead.
  const destination = location.pathname;

  const auth = useAuthFlow({ onSuccess: () => navigate(destination, { replace: true }) });
  const {
    mode, setMode, loading, form, setField, otpError, setOtpError,
    handleEmailLogin, requestOtp, verifyOtp,
  } = auth;

  return (
    <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full sacred-card rounded-xl p-6 md:p-8 animate-page-enter">
        <div className="text-center mb-6">
          <span className="material-symbols-outlined text-sf-primary text-3xl mb-2 block">how_to_reg</span>
          <h1 className="font-headline-lg text-2xl text-sf-on-surface">Sign In to Continue</h1>
          <p className="text-sm text-sf-on-surface-variant mt-2">
            An account is required to continue. It only takes a moment.
          </p>
        </div>

        {mode === 'login' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Mobile Number</Label>
              <Input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric" maxLength={10} placeholder="10-digit mobile"
                data-testid="gate-phone-input"
              />
            </div>
            <Button onClick={requestOtp} disabled={loading}
              className="w-full rounded py-6 font-semibold bg-sf-primary text-sf-on-primary hover:opacity-90"
              data-testid="gate-send-otp-button">
              {loading ? 'Sending...' : 'Send OTP via SMS'}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sf-outline-variant" /></div>
              <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-sf-on-surface-variant">Or sign in with</span></div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <Label className="text-sm">Email Address</Label>
                <Input value={form.identifier} onChange={(e) => setField('identifier', e.target.value)} placeholder="Enter your email" required data-testid="gate-email-input" />
              </div>
              <div>
                <Label className="text-sm">Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} required data-testid="gate-password-input" />
              </div>
              <div className="text-right -mt-1">
                <button type="button" onClick={() => setMode('forgot')} className="text-xs font-medium text-sf-primary" data-testid="gate-forgot-link">
                  Forgot Password?
                </button>
              </div>
              <Button type="submit" disabled={loading}
                className="w-full rounded py-6 font-semibold bg-sf-primary text-sf-on-primary hover:opacity-90"
                data-testid="gate-signin-button">
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">lock</span>
                  {loading ? 'Please wait...' : 'Sign In Securely'}
                </span>
              </Button>
            </form>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={auth.handleGoogleSuccess}
                onError={() => toast.error('Google sign-in failed')}
                text="signin_with" shape="pill" width="320" useOneTap={false}
              />
            </div>

            <p className="text-center text-sm text-sf-on-surface-variant">
              New devotee?{' '}
              <button type="button" onClick={() => setMode('register')} className="font-semibold text-sf-primary" data-testid="gate-create-account-link">
                Create an account
              </button>
            </p>
          </div>
        )}

        {mode === 'otp' && (
          <div className="space-y-4">
            <p className="text-sm text-sf-on-surface-variant">
              We've sent a 6-digit code to <span className="font-semibold text-sf-on-surface">+91 {form.phone}</span>
            </p>
            <div>
              <Label className="text-sm">Enter OTP</Label>
              <Input
                value={form.otp}
                onChange={(e) => { setField('otp', e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                inputMode="numeric" maxLength={6} placeholder="6-digit code"
                className={`tracking-widest ${otpError ? 'border-sf-error' : ''}`}
                data-testid="gate-otp-input"
              />
              {otpError && <p className="text-xs text-sf-error mt-1">{otpError}</p>}
            </div>
            <Button onClick={verifyOtp} disabled={loading} className="w-full rounded py-6 font-semibold bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="gate-verify-otp-button">
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={requestOtp} disabled={loading} className="font-medium text-sf-primary">Resend code</button>
              <button type="button" onClick={() => setMode('login')} className="font-medium text-sf-on-surface-variant">Change mobile number</button>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div className="space-y-4">
            {!auth.regOtpSent ? (
              <form onSubmit={auth.handleRegisterSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required data-testid="gate-name-input" />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required data-testid="gate-reg-email-input" />
                </div>
                <div>
                  <Label className="text-sm">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} placeholder="10-digit mobile" required data-testid="gate-reg-phone-input" />
                </div>
                <div>
                  <Label className="text-sm">Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} required data-testid="gate-reg-password-input" />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded py-6 font-semibold bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="gate-reg-submit-button">
                  {loading ? 'Please wait...' : 'Send OTP to Register'}
                </Button>
              </form>
            ) : (
              <>
                <p className="text-sm text-sf-on-surface-variant">
                  Enter the code sent to <span className="font-semibold text-sf-on-surface">{form.phone}</span>
                </p>
                <div>
                  <Label className="text-sm">OTP</Label>
                  <Input value={form.otp} onChange={(e) => setField('otp', e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="tracking-widest" data-testid="gate-reg-otp-input" />
                </div>
                <Button onClick={auth.completeRegistration} disabled={loading} className="w-full rounded py-6 font-semibold bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="gate-reg-verify-button">
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={auth.resendRegOtp} disabled={loading} className="font-medium text-sf-primary">Resend OTP</button>
                  <button type="button" onClick={() => auth.setRegOtpSent(false)} className="font-medium text-sf-on-surface-variant">Edit details</button>
                </div>
              </>
            )}
            <p className="text-center text-sm text-sf-on-surface-variant">
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="font-semibold text-sf-primary" data-testid="gate-back-to-login">
                Sign In
              </button>
            </p>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="space-y-4">
            <p className="text-sm text-sf-on-surface-variant">Enter your registered email and we'll send you a reset code.</p>
            <div>
              <Label className="text-sm">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} data-testid="gate-forgot-email-input" />
            </div>
            <Button onClick={auth.requestReset} disabled={loading} className="w-full rounded py-6 font-semibold bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="gate-send-reset-button">
              {loading ? 'Sending...' : 'Send Reset Code'}
            </Button>
            <p className="text-center text-sm">
              <button type="button" onClick={() => setMode('login')} className="font-semibold text-sf-primary">Back to login</button>
            </p>
          </div>
        )}

        {mode === 'reset' && (
          <div className="space-y-4">
            <p className="text-sm text-sf-on-surface-variant">Enter the code sent to {form.email} and your new password.</p>
            <div>
              <Label className="text-sm">Reset Code</Label>
              <Input value={form.resetToken} onChange={(e) => setField('resetToken', e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="tracking-widest" data-testid="gate-reset-code-input" />
            </div>
            <div>
              <Label className="text-sm">New Password</Label>
              <Input type="password" value={form.newPassword} onChange={(e) => setField('newPassword', e.target.value)} placeholder="At least 6 characters" data-testid="gate-reset-password-input" />
            </div>
            <Button onClick={auth.doReset} disabled={loading} className="w-full rounded py-6 font-semibold bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="gate-do-reset-button">
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <p className="text-center text-sm">
              <button type="button" onClick={() => setMode('forgot')} className="font-semibold text-sf-primary">Didn't get a code? Resend</button>
            </p>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 text-xs text-sf-on-surface-variant mt-6">
          <span className="material-symbols-outlined text-sm text-green-700">verified_user</span>
          Safe &amp; Secure checkout. 256-bit encryption applied to all transactions.
        </p>
      </div>
    </div>
  );
};

export default LoginGate;
