import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, KeyRound, Eye, EyeOff, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '15631312508-0r23i2q9aaor4teum3sehvk0j65v3qi9.apps.googleusercontent.com';

// Dynamic script loader helper with promise memoization
let gsiScriptPromise = null;
function loadGoogleGsiScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve) => {
    // Check if script tag is already in DOM
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      // If already loaded before event listener attached
      if (window.google?.accounts?.id) return resolve(true);
      // Fallback timeout in case event already fired
      setTimeout(() => resolve(Boolean(window.google?.accounts?.id)), 2500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Google Identity Services script failed to load (possible ad-blocker or network restriction).');
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

export default function GoogleAuthButton({
  role = 'candidate',
  companyName = '',
  buttonText = 'continue_with',
  onSuccess,
  onError,
  className = '',
}) {
  const { loginWithGoogle, linkGoogleAccount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [gisReady, setGisReady] = useState(false);
  const [originNotice, setOriginNotice] = useState(false);

  // State for Account Linking Modal (Anti-Account Takeover)
  const [linkingState, setLinkingState] = useState(null); // { email, credential }
  const [linkPassword, setLinkPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);

  const handleRedirect = useCallback((res) => {
    if (onSuccess) {
      onSuccess(res);
      return;
    }

    const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl');
    const userRole = res.user?.role || role;

    if (redirectUrl) {
      if ((userRole === 'employer' || userRole === 'recruiter') && redirectUrl.startsWith('/candidate')) {
        navigate('/recruiter');
      } else if (userRole === 'candidate' && (redirectUrl.startsWith('/recruiter') || redirectUrl.startsWith('/employer'))) {
        navigate('/candidate/dashboard');
      } else {
        navigate(redirectUrl);
      }
      return;
    }

    if (['director', 'main_admin', 'admin', 'bd_lead', 'tl_coordinator', 'recruiter'].includes(userRole)) {
      navigate('/admin/dashboard');
    } else if (userRole === 'employer') {
      if (res.profile && (!res.profile.is_onboarding_completed || res.profile.is_onboarding_completed === 0)) {
        navigate('/recruiter/onboarding');
      } else {
        navigate('/recruiter');
      }
    } else {
      navigate('/candidate/dashboard');
    }
  }, [onSuccess, searchParams, role, navigate]);

  const handleCredentialResponse = useCallback(async (response) => {
    const credential = response?.credential;
    if (!credential) {
      setErrorMessage('No credential returned from Google identity verification.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await loginWithGoogle({
        credential,
        role,
        company_name: companyName,
      });

      if (res?.success) {
        handleRedirect(res);
      } else {
        setErrorMessage(res?.message || 'Google authentication failed.');
        if (onError) onError(res);
      }
    } catch (err) {
      if (err?.code === 'LINK_PASSWORD_REQUIRED') {
        setLinkingState({
          email: err.email,
          credential,
        });
        setLinkPassword('');
        setLinkError('');
      } else if (err?.code === 'ACCOUNT_ROLE_CONFLICT') {
        setErrorMessage(err.message || 'This account is registered under a different role. Please use the appropriate portal.');
        if (onError) onError(err);
      } else {
        setErrorMessage(err?.message || 'Authentication error. Please try again or use email sign-in.');
        if (onError) onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, role, companyName, handleRedirect, onError]);

  // Always keep global callback updated to the current mounted instance
  const handleCredentialResponseRef = useRef(handleCredentialResponse);
  useEffect(() => {
    handleCredentialResponseRef.current = handleCredentialResponse;
    window.__vakancy_gsi_active_callback = (resp) => {
      if (typeof handleCredentialResponseRef.current === 'function') {
        handleCredentialResponseRef.current(resp);
      }
    };
  }, [handleCredentialResponse]);

  // Main GIS initialization and render effect
  const initAndRender = useCallback(async () => {
    setIsInitializing(true);
    const scriptLoaded = await loadGoogleGsiScript();

    if (!scriptLoaded || !window.google?.accounts?.id) {
      setIsInitializing(false);
      setGisReady(false);
      return false;
    }

    try {
      // 1. Singleton initialization with global dispatcher
      if (!window.__vakancy_gsi_initialized_for || window.__vakancy_gsi_initialized_for !== GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => {
            if (typeof window.__vakancy_gsi_active_callback === 'function') {
              window.__vakancy_gsi_active_callback(resp);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.__vakancy_gsi_initialized_for = GOOGLE_CLIENT_ID;
      }

      // 2. Render Google Button if container exists
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth || 340;
        const buttonWidth = Math.min(400, Math.max(240, containerWidth));

        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: buttonText,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonWidth,
        });
        setGisReady(true);
      }

      setIsInitializing(false);
      return true;
    } catch (err) {
      console.warn('Google Identity Services render warning:', err);
      setIsInitializing(false);
      return false;
    }
  }, [buttonText]);

  useEffect(() => {
    let timer = null;
    initAndRender().then((ready) => {
      if (!ready) {
        timer = setTimeout(() => {
          initAndRender();
        }, 1000);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [initAndRender]);

  // User click on fallback button: immediately attempts prompt / initialization
  const handleFallbackClick = async () => {
    setErrorMessage('');
    if (window.google?.accounts?.id) {
      try {
        if (!window.__vakancy_gsi_initialized_for || window.__vakancy_gsi_initialized_for !== GOOGLE_CLIENT_ID) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (resp) => {
              if (typeof window.__vakancy_gsi_active_callback === 'function') {
                window.__vakancy_gsi_active_callback(resp);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          window.__vakancy_gsi_initialized_for = GOOGLE_CLIENT_ID;
        }

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            if (reason === 'unregistered_origin') {
              setOriginNotice(true);
            }
          }
        });
      } catch (err) {
        console.warn('GSI prompt exception:', err);
        setErrorMessage('Unable to open Google Sign-In prompt. Please use Email / Password to continue.');
      }
    } else {
      setLoading(true);
      const ready = await initAndRender();
      setLoading(false);
      if (ready && window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      } else {
        setErrorMessage('Google Identity Services could not be loaded. Please check your internet connection or ad-blocker settings, or sign in using email.');
      }
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkPassword) {
      setLinkError('Please enter your password to link your Google account.');
      return;
    }

    setLinkingLoading(true);
    setLinkError('');

    try {
      const res = await linkGoogleAccount({
        credential: linkingState.credential,
        password: linkPassword,
      });

      if (res?.success) {
        setLinkingState(null);
        handleRedirect(res);
      } else {
        setLinkError(res?.message || 'Failed to link account.');
      }
    } catch (err) {
      setLinkError(err?.message || 'Incorrect password or failed to link account.');
    } finally {
      setLinkingLoading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm text-[#00288e] font-semibold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-[#00288e]" />
          Verifying Google Identity...
        </div>
      )}

      {/* Error Alert with actionable guidance */}
      {errorMessage && (
        <div className="w-full mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => { setErrorMessage(''); initAndRender(); }}
              className="mt-1.5 inline-flex items-center gap-1 font-bold text-red-800 underline hover:no-underline"
            >
              <RefreshCw className="w-3 h-3" />
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Origin Notice if local or dev domain is not authorized in Google Cloud Console */}
      {originNotice && (
        <div className="w-full mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-bold">OAuth Origin Configuration Notice:</span>
            <p className="mt-0.5">
              The current origin ({window.location.origin}) must be added to Authorized JavaScript Origins in Google Cloud Console for Client ID <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">{GOOGLE_CLIENT_ID.slice(0, 20)}...</code>. Please use email/password while development origins are being registered.
            </p>
          </div>
        </div>
      )}

      {/* Official Google Identity Services Button Container */}
      <div
        ref={containerRef}
        className="w-full flex justify-center min-h-[44px]"
        id="google-signin-btn-container"
      />

      {/* Fallback & Loading Button if GIS iframe is initializing or delayed */}
      {!gisReady && !loading && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={isInitializing}
          aria-label="Continue with Google"
          className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold transition-all flex items-center justify-center gap-3 shadow-xs hover:shadow min-h-[44px] cursor-pointer disabled:opacity-75"
        >
          {isInitializing ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isInitializing ? 'Connecting Google Identity...' : 'Continue with Google'}</span>
        </button>
      )}

      {/* SECURE ACCOUNT LINKING MODAL (Anti-Takeover) */}
      {linkingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => {
                setLinkingState(null);
                setLinkPassword('');
                setLinkError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#00288e]">
                <ShieldCheck className="w-6 h-6 text-[#00288e]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Link Existing Account</h3>
                <p className="text-xs text-slate-500">Security verification required</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              An account with <strong className="text-slate-900">{linkingState.email}</strong> is already registered on Vakancy.
              To securely connect your Google account and prevent unauthorized access, please confirm your current Vakancy password.
            </p>

            {linkError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{linkError}</span>
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showLinkPassword ? 'text' : 'password'}
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="w-full bg-slate-50 text-slate-900 text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00288e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinkPassword(!showLinkPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showLinkPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLinkPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLinkingState(null);
                    setLinkPassword('');
                    setLinkError('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingLoading}
                  className="px-5 py-2.5 text-xs font-bold bg-[#00288e] hover:bg-[#1e40af] text-white rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer min-h-[40px]"
                >
                  {linkingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
