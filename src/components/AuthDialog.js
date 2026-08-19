import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useAuthFlow } from '../hooks/useAuthFlow';

// Ported from 11_sign_in / 12_otp_verification / 13_create_account /
// 14_forgot_password (finalized Stitch canvases).
//
// All auth state/logic lives in useAuthFlow — shared with LoginGate.js,
// which is the same set of screens in full-page chrome for the /cart
// and /checkout route-level gate. See useAuthFlow.js for why.
//
// THE REAL FIX — outstanding since the very first audit of this app:
// this component used to call window.location.reload() after every
// successful login. Since AuthDialog is rendered from five different
// places (Navbar, BottomNav, Products, ProductDetail, ProductReviews),
// it had no way to reach App.js's real setUser — reload was a blunt
// workaround that also wiped out whatever the page was doing. Fixed via
// a custom event inside useAuthFlow's finishAuth; App.js listens for it
// and updates its own user state with no reload and no lost page state.
//
// onSuccess(user) is optional — callers that want to actively replay an
// interrupted action (e.g. ProductDetail.js retrying Add to Cart) can
// use it; it receives the fresh user object directly, not the caller's
// own (still-stale-at-this-instant) `user` prop.
const AuthDialog = ({ open, onClose, onSuccess }) => {
  const auth = useAuthFlow({ onSuccess: (user) => { onClose(); onSuccess?.(user); } });
  const {
    mode, setMode, loading, form, setField, setOtpSent,
    regOtpSent, setRegOtpSent, otpError, setOtpError,
    handleEmailLogin, handleRegisterSubmit, completeRegistration, resendRegOtp,
    requestOtp, verifyOtp, requestReset, doReset, handleGoogleSuccess,
  } = auth;

  const titles = {
    login: 'Welcome Back', register: 'Create Account',
    otp: 'Verify Identity', forgot: 'Forgot Password', reset: 'Reset Password',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="storefront-shell sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline-md text-xl md:text-2xl text-sf-primary">
            {titles[mode]}
          </DialogTitle>
        </DialogHeader>

        {/* ── Sign In: mobile-OTP primary, email/password secondary ── */}
        {mode === 'login' && (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-sf-on-surface-variant">
              Sign in to access your sacred collection.
            </p>
            <div>
              <Label className="text-xs md:text-sm">Mobile Number</Label>
              <Input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric" maxLength={10} placeholder="10-digit mobile"
                className="text-sm md:text-base" data-testid="login-phone-input"
              />
            </div>
            <Button
              onClick={requestOtp} disabled={loading}
              className="w-full rounded py-5 md:py-6 font-semibold text-sm md:text-base bg-sf-primary text-sf-on-primary hover:opacity-90"
              data-testid="send-otp-login-button"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sf-outline-variant" /></div>
              <div className="relative flex justify-center text-xs md:text-sm"><span className="px-2 bg-white text-sf-on-surface-variant">Or sign in with</span></div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs md:text-sm">Email Address</Label>
                <Input
                  value={form.identifier} onChange={(e) => setField('identifier', e.target.value)}
                  placeholder="Enter your email" required
                  className="text-sm md:text-base" data-testid="auth-identifier-input"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Password</Label>
                <Input
                  type="password" value={form.password} onChange={(e) => setField('password', e.target.value)}
                  required className="text-sm md:text-base" data-testid="auth-password-input"
                />
              </div>
              <div className="text-right -mt-1">
                <button type="button" onClick={() => setMode('forgot')} className="text-xs font-medium text-sf-primary" data-testid="forgot-password-link">
                  Forgot password?
                </button>
              </div>
              <Button type="submit" variant="outline" disabled={loading}
                className="w-full rounded py-5 md:py-6 font-semibold text-sm md:text-base border-sf-primary text-sf-primary hover:bg-sf-primary hover:text-sf-on-primary"
                data-testid="auth-submit-button">
                {loading ? 'Please wait...' : 'Sign In with Email'}
              </Button>
            </form>

            <div className="flex justify-center" data-testid="google-auth-button">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error('Google sign-in failed')}
                text="signin_with" shape="pill" width="320" useOneTap={false} />
            </div>

            <p className="text-center text-xs md:text-sm text-sf-on-surface-variant">
              New to the sanctuary?{' '}
              <button type="button" onClick={() => { setMode('register'); setRegOtpSent(false); }} className="font-semibold text-sf-primary" data-testid="auth-toggle-button">
                Create Account
              </button>
            </p>
          </div>
        )}

        {/* ── OTP code entry ── */}
        {mode === 'otp' && (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-sf-on-surface-variant">
              We've sent a 6-digit code to <span className="font-semibold text-sf-on-surface">+91 {form.phone}</span>
            </p>
            <div>
              <Label className="text-xs md:text-sm">Enter OTP</Label>
              <Input
                value={form.otp}
                onChange={(e) => { setField('otp', e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                inputMode="numeric" maxLength={6} placeholder="6-digit code"
                className={`text-sm md:text-base tracking-widest ${otpError ? 'border-sf-error focus-visible:ring-sf-error/30' : ''}`}
                data-testid="otp-code-input"
              />
              {otpError && (
                <p className="text-xs text-sf-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span> {otpError}
                </p>
              )}
            </div>
            <Button onClick={verifyOtp} disabled={loading}
              className="w-full rounded py-5 font-semibold text-sm bg-sf-primary text-sf-on-primary hover:opacity-90"
              data-testid="verify-otp-button">
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <div className="flex items-center justify-between text-xs md:text-sm">
              <button type="button" onClick={requestOtp} disabled={loading} className="font-medium text-sf-primary">
                Resend code
              </button>
              <button type="button" onClick={() => { setMode('login'); setOtpSent(false); setOtpError(''); }} className="font-medium text-sf-on-surface-variant">
                Change mobile number
              </button>
            </div>
          </div>
        )}

        {/* ── Create Account ── */}
        {mode === 'register' && (
          <div className="space-y-3 md:space-y-4">
            {!regOtpSent ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 md:space-y-4">
                <div>
                  <Label className="text-xs md:text-sm">Name</Label>
                  <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required className="text-sm md:text-base" data-testid="auth-name-input" />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required className="text-sm md:text-base" data-testid="auth-email-input" />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} placeholder="10-digit mobile" required className="text-sm md:text-base" data-testid="auth-phone-input" />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} required className="text-sm md:text-base" data-testid="auth-password-input" />
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full rounded py-5 md:py-6 font-semibold text-sm md:text-base bg-sf-primary text-sf-on-primary hover:opacity-90"
                  data-testid="auth-submit-button">
                  {loading ? 'Please wait...' : 'Send OTP to Register'}
                </Button>
              </form>
            ) : (
              <>
                <p className="text-xs md:text-sm text-sf-on-surface-variant">
                  Enter the code sent to <span className="font-semibold text-sf-on-surface">{form.phone}</span>
                </p>
                <div>
                  <Label className="text-xs md:text-sm">OTP</Label>
                  <Input value={form.otp} onChange={(e) => setField('otp', e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="text-sm md:text-base tracking-widest" data-testid="reg-otp-input" />
                </div>
                <Button onClick={completeRegistration} disabled={loading}
                  className="w-full rounded py-5 md:py-6 font-semibold text-sm md:text-base bg-sf-primary text-sf-on-primary hover:opacity-90"
                  data-testid="verify-register-button">
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={resendRegOtp} disabled={loading} className="font-medium text-sf-primary">Resend OTP</button>
                  <button type="button" onClick={() => setRegOtpSent(false)} className="font-medium text-sf-on-surface-variant">Edit details</button>
                </div>
              </>
            )}
            <p className="text-center text-xs md:text-sm text-sf-on-surface-variant">
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="font-semibold text-sf-primary" data-testid="back-to-login-button">
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* ── Forgot Password ── */}
        {mode === 'forgot' && (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-sf-on-surface-variant">Enter your registered email and we'll send you a reset code.</p>
            <div>
              <Label className="text-xs md:text-sm">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className="text-sm md:text-base" data-testid="forgot-email-input" />
            </div>
            <Button onClick={requestReset} disabled={loading}
              className="w-full rounded py-5 font-semibold text-sm bg-sf-primary text-sf-on-primary hover:opacity-90"
              data-testid="send-reset-button">
              {loading ? 'Sending...' : 'Send Reset Code'}
            </Button>
            <p className="text-center text-xs md:text-sm">
              <button type="button" onClick={() => setMode('login')} className="font-semibold text-sf-primary">Back to login</button>
            </p>
          </div>
        )}

        {/* ── Reset Password ── */}
        {mode === 'reset' && (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-sf-on-surface-variant">Enter the code sent to {form.email} and your new password.</p>
            <div>
              <Label className="text-xs md:text-sm">Reset Code</Label>
              <Input value={form.resetToken} onChange={(e) => setField('resetToken', e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="text-sm md:text-base tracking-widest" data-testid="reset-code-input" />
            </div>
            <div>
              <Label className="text-xs md:text-sm">New Password</Label>
              <Input type="password" value={form.newPassword} onChange={(e) => setField('newPassword', e.target.value)} placeholder="At least 6 characters" className="text-sm md:text-base" data-testid="reset-password-input" />
            </div>
            <Button onClick={doReset} disabled={loading}
              className="w-full rounded py-5 font-semibold text-sm bg-sf-primary text-sf-on-primary hover:opacity-90"
              data-testid="do-reset-button">
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <p className="text-center text-xs md:text-sm">
              <button type="button" onClick={() => setMode('forgot')} className="font-semibold text-sf-primary">Didn't get a code? Resend</button>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
