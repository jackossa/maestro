import { useAuth, type AuthErrorKind } from "../../shared/state/auth";
import { GoogleIcon } from "./GoogleIcon";

// Exact copy per the Google Sign-In design spec -- do not paraphrase.
const ERROR_COPY: Record<AuthErrorKind, string> = {
  generic: "We couldn't sign you in with Google. Please try again.",
  "wrong-domain": "This Google account isn't authorized for Maestro. Please sign in with your Ossa Studio account.",
  expired: "Your session expired. Please sign in again.",
};

// Full-viewport, dark-charcoal, no nested card -- reuses the existing
// Splash screen's identity treatment. Handles every pre-signed-in state
// (initial redirect-result check, idle, signing-in, error) in one shell;
// see the design spec, "Login screen" and "Flow & states".
export function LoginScreen() {
  const { status, signingIn, error, signIn, clearError } = useAuth();

  return (
    <div className="fixed inset-0 z-[900] bg-os-charcoal flex items-center justify-center px-5">
      <div className="w-full max-w-[400px] flex flex-col items-center text-center">
        <img src="/assets/logo-symbol-white.png" alt="" className="h-12 w-auto mb-4" />
        <div className="font-bold text-[26px] leading-none font-display tracking-[.02em] text-white">MAESTRO</div>
        <div className="mt-2 font-bold text-[10px] font-sans tracking-[.22em] uppercase text-os-orange-300">by Ossa Studio</div>

        <div className="mt-10 min-h-[64px] flex flex-col items-center justify-center" aria-live="polite">
          {error ? (
            <>
              <h1 className="font-bold text-[22px] font-display text-white">Sign-in failed</h1>
              <p className="mt-2 text-[14px] text-white/70">{ERROR_COPY[error]}</p>
            </>
          ) : status === "loading" ? (
            <p className="text-[14px] text-white/70">Signing you into Maestro…</p>
          ) : (
            <>
              <h1 className="font-bold text-[26px] font-display text-white">Welcome to Maestro</h1>
              <p className="mt-2 text-[14px] text-white/70">Sign in to continue to your workspace.</p>
            </>
          )}
        </div>

        {status !== "loading" && (
          <div className="mt-8 w-full flex flex-col items-center gap-3">
            {error ? (
              <>
                <button
                  onClick={() => {
                    clearError();
                    signIn();
                  }}
                  className="w-full h-[46px] rounded-full bg-white text-os-ink font-bold text-[14px] hover:bg-os-100 active:bg-os-150 focus:outline-none focus:ring-2 focus:ring-os-orange-300 focus:ring-offset-2 focus:ring-offset-os-charcoal"
                >
                  Try again
                </button>
                <button
                  onClick={clearError}
                  className="px-2 py-1 rounded-full text-[13px] font-medium text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-os-orange-300"
                >
                  Back to sign-in
                </button>
              </>
            ) : (
              <button
                onClick={signIn}
                disabled={signingIn}
                aria-label="Continue with Google"
                className="w-full h-[46px] flex items-center justify-center gap-3 rounded-full bg-white text-os-ink font-bold text-[14px] hover:bg-os-100 active:bg-os-150 focus:outline-none focus:ring-2 focus:ring-os-orange-300 focus:ring-offset-2 focus:ring-offset-os-charcoal disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {signingIn ? (
                  <>
                    <Spinner />
                    <span>Connecting to Google…</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-[18px] w-[18px] text-os-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
