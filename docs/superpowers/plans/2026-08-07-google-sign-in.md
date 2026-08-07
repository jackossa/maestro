# Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate Maestro behind Google sign-in (Firebase Authentication, Ossa Studio Workspace-only), with a branded login screen, error handling, an always-reachable Account view, and sign-out — no changes to project data or how it's stored.

**Architecture:** A new, self-contained `AuthProvider` (`src/shared/state/auth.tsx`) wraps the entire app and owns Firebase Auth state via `signInWithRedirect`/`getRedirectResult`/`onAuthStateChanged`. `App.tsx` renders either the login screen or (unchanged) the existing `AppStateProvider`/`Shell` based on auth status — signed-out users never mount `AppStateProvider`, so project data can never flash on screen. This file never imports from or is imported by `store.tsx`.

**Tech Stack:** Firebase JS SDK (`firebase` npm package, modular v9+ API), existing Vite+React+TypeScript+Tailwind stack, no new routing library, no new backend.

## Global Constraints

- **No Node.js is available in this environment.** Every task's code (and the one task with tests) must be written correctly by careful reading — nothing can be run, installed, or type-checked locally. Every task's report must say plainly that nothing was executed. Verification happens via Vercel's build on push and manual browser testing against the deployed preview, exactly as in the pipeline-unification plan.
- **Firebase project setup is not a coded task.** Creating the actual Firebase project, enabling Google as a sign-in provider, configuring the OAuth consent screen as Internal (Workspace-only), and registering authorized domains all require live interaction with a Google account in a browser. This is done by the human project owner directly (or with the controller driving a browser session with them present), not dispatched to an implementer subagent. Until real config values exist, `.env.local` can hold placeholder strings — the code must compile and structure correctly either way; only live runtime behavior needs real credentials.
- **Exact copy is fixed, not a suggestion:** heading "Welcome to Maestro"; subtext "Sign in to continue to your workspace."; button "Continue with Google"; loading labels "Connecting to Google…" and "Signing you into Maestro…"; error messages exactly as given in Task 4's brief. Do not paraphrase these.
- **Color/style tokens to reuse (do not invent new ones):** `bg-os-charcoal` (#414142, login screen background, same as the existing Splash), `text-os-orange-300` (tagline on dark background), `text-os-orange-700` (eyebrow/accent text on light background), `bg-os-orange-050` (light accent wash), `bg-grad-accent` (avatar-initial fallback background), `rounded-brand-sm`/`rounded-brand-xl`, `shadow-glass`, existing `SectionHeader` and `PageHeader` components. Buttons follow the existing `rounded-full` pill shape language throughout.
- **No disconnect action for the Connected Account section** — Google is Maestro's only sign-in method; there is no fallback to disconnect to. This is intentional, not a gap to fill in later.
- **No new routing library.** "Protected routes" means a single status check in `App.tsx`, nothing else.

---

### Task 1: Firebase SDK setup

**Files:**
- Modify: `package.json`
- Create: `src/vite-env.d.ts`
- Create: `.env.example`
- Create: `src/shared/lib/firebase.ts`

**Interfaces:**
- Produces: `auth` (Firebase `Auth` instance), `googleProvider` (configured `GoogleAuthProvider`), `WORKSPACE_DOMAIN` (string constant) — all from `src/shared/lib/firebase.ts`.
- Consumes: nothing new.

- [ ] **Step 1: Add the Firebase dependency**

In `package.json`, add to `dependencies` (alongside `react`/`react-dom`):

```json
    "firebase": "^12.0.0",
```

- [ ] **Step 2: Add Vite env-var typing**

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_WORKSPACE_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

This file has no import/export statements — it must stay a global ambient declaration file (that's why there's no `export` anywhere in it). Do not add one.

- [ ] **Step 3: Document the required env vars**

Create `.env.example` (checked into git — documents the shape, holds no real secrets since these Firebase values aren't secrets to begin with, see Global Constraints in the design spec):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_WORKSPACE_DOMAIN=ossastudio.com
```

- [ ] **Step 4: Create the Firebase app/auth instance**

Create `src/shared/lib/firebase.ts`:

```ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Central Firebase init. All Firebase config values here are public
// identifiers, not secrets -- Google designs them to be exposed in
// client bundles. Real protection comes from the Workspace-only OAuth
// consent screen configuration (done in the Firebase Console, not in
// code) and the hd parameter set below. See the Google Sign-In design
// spec, "Security" section.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const WORKSPACE_DOMAIN = import.meta.env.VITE_WORKSPACE_DOMAIN || "ossastudio.com";

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: WORKSPACE_DOMAIN });
```

- [ ] **Step 5: Commit**

```bash
git add package.json src/vite-env.d.ts .env.example src/shared/lib/firebase.ts
git commit -m "Add Firebase SDK and app/auth initialization"
```

---

### Task 2: Workspace domain check (pure, tested)

**Files:**
- Create: `src/shared/lib/authDomain.ts`
- Test: `src/shared/lib/authDomain.test.ts`

**Interfaces:**
- Produces: `isAuthorizedDomain(email: string | null | undefined, allowedDomain: string): boolean`

This is the one piece of genuinely pure, testable logic in this plan — everything else is React/Firebase SDK wiring. Deliberately does an exact, case-insensitive domain match only (no subdomain matching) to avoid a `evil.com/?=x.ossastudio.com`-style confusion; a real subdomain of the Workspace domain is not automatically trusted.

- [ ] **Step 1: Write the failing tests**

Create `src/shared/lib/authDomain.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isAuthorizedDomain } from "./authDomain";

describe("isAuthorizedDomain", () => {
  it("accepts an exact domain match", () => {
    expect(isAuthorizedDomain("jack@ossastudio.com", "ossastudio.com")).toBe(true);
  });

  it("is case-insensitive on both the email and the allowed domain", () => {
    expect(isAuthorizedDomain("Jack@OssaStudio.com", "ossastudio.com")).toBe(true);
    expect(isAuthorizedDomain("jack@ossastudio.com", "OssaStudio.com")).toBe(true);
  });

  it("rejects a different domain", () => {
    expect(isAuthorizedDomain("jack@gmail.com", "ossastudio.com")).toBe(false);
  });

  it("rejects a subdomain of the allowed domain (exact match only)", () => {
    expect(isAuthorizedDomain("jack@mail.ossastudio.com", "ossastudio.com")).toBe(false);
  });

  it("rejects null, undefined, or empty email", () => {
    expect(isAuthorizedDomain(null, "ossastudio.com")).toBe(false);
    expect(isAuthorizedDomain(undefined, "ossastudio.com")).toBe(false);
    expect(isAuthorizedDomain("", "ossastudio.com")).toBe(false);
  });

  it("rejects a malformed email with no @", () => {
    expect(isAuthorizedDomain("not-an-email", "ossastudio.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/shared/lib/authDomain.test.ts`
Expected: FAIL — `Cannot find module './authDomain'`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/lib/authDomain.ts`:

```ts
// Exact, case-insensitive domain match only -- deliberately does NOT treat
// a subdomain of the allowed domain as trusted. See the Google Sign-In
// design spec, "Architecture" (domain restriction).
export function isAuthorizedDomain(email: string | null | undefined, allowedDomain: string): boolean {
  if (!email) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  return domain === allowedDomain.toLowerCase();
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/shared/lib/authDomain.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/authDomain.ts src/shared/lib/authDomain.test.ts
git commit -m "Add pure workspace-domain check for Google sign-in"
```

---

### Task 3: AuthProvider

**Files:**
- Create: `src/shared/state/auth.tsx`

**Interfaces:**
- Consumes: `auth`, `googleProvider`, `WORKSPACE_DOMAIN` (Task 1); `isAuthorizedDomain` (Task 2).
- Produces: `AuthProvider` (component), `useAuth()` returning
  `{ status: "loading" | "signed-out" | "signed-in"; user: { displayName: string; email: string; photoURL: string | null } | null; error: "generic" | "wrong-domain" | "expired" | null; signingIn: boolean; signIn(): void; signOut(): void; clearError(): void }`.

This is a React state-wiring file with no pure logic of its own (it consumes Task 2's pure function but adds no new pure logic itself) — no automated tests, consistent with how `store.tsx` has none. Manual verification happens once real Firebase credentials exist and the whole flow can be clicked through in a browser (see Task 9).

Two subtleties this task must get right, spelled out here because they're easy to get wrong from a vaguer description:

1. **"Expired" must only fire on an *unexpected* sign-out**, not after the user deliberately clicks "Sign out." A `deliberateSignOut` ref is set to `true` right before calling Firebase's `signOut`, checked (and cleared) inside the `onAuthStateChanged` handler, so a deliberate sign-out reaches plain `"signed-out"` with no error, while an unexpected transition from signed-in to signed-out sets `error: "expired"`.
2. **A wrong-domain sign-in must not leave the user looking signed-in even for a moment.** After `getRedirectResult` resolves with a user whose email fails `isAuthorizedDomain`, immediately call Firebase's `signOut` and set `error: "wrong-domain"` — never set `status: "signed-in"` for that user.

- [ ] **Step 1: Write the provider**

Create `src/shared/state/auth.tsx`:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  getRedirectResult,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, WORKSPACE_DOMAIN } from "../lib/firebase";
import { isAuthorizedDomain } from "../lib/authDomain";

// Owns Firebase Auth state for the whole app. Deliberately separate from
// store.tsx/AppStateProvider -- identity is not project data, and this
// file must be usable (and testable in isolation, conceptually) without
// ever importing from or being imported by the project-data state layer.
// See the Google Sign-In design spec, "Architecture".

export type AuthStatus = "loading" | "signed-out" | "signed-in";
export type AuthErrorKind = "generic" | "wrong-domain" | "expired";

export interface AuthUser {
  displayName: string;
  email: string;
  photoURL: string | null;
}

interface AuthContextShape {
  status: AuthStatus;
  user: AuthUser | null;
  error: AuthErrorKind | null;
  signingIn: boolean;
  signIn: () => void;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextShape | null>(null);

function toAuthUser(u: User): AuthUser {
  return {
    displayName: u.displayName || u.email || "Signed in",
    email: u.email || "",
    photoURL: u.photoURL,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const wasSignedIn = useRef(false);
  const deliberateSignOut = useRef(false);

  useEffect(() => {
    let cancelled = false;

    getRedirectResult(auth)
      .then((result) => {
        if (cancelled || !result) return;
        if (!isAuthorizedDomain(result.user.email, WORKSPACE_DOMAIN)) {
          deliberateSignOut.current = true;
          firebaseSignOut(auth).catch(() => {});
          setError("wrong-domain");
        }
      })
      .catch(() => {
        if (!cancelled) setError("generic");
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (cancelled) return;

      if (firebaseUser && isAuthorizedDomain(firebaseUser.email, WORKSPACE_DOMAIN)) {
        wasSignedIn.current = true;
        deliberateSignOut.current = false;
        setUser(toAuthUser(firebaseUser));
        setStatus("signed-in");
        return;
      }

      if (firebaseUser) {
        // Signed in but wrong domain -- already being signed out above;
        // this listener fires again with null shortly after. Don't flip
        // to signed-in for this user even momentarily.
        return;
      }

      if (wasSignedIn.current && !deliberateSignOut.current) {
        setError((prev) => prev ?? "expired");
      }
      wasSignedIn.current = false;
      deliberateSignOut.current = false;
      setUser(null);
      setStatus("signed-out");
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(() => {
    setSigningIn(true);
    setError(null);
    signInWithRedirect(auth, googleProvider).catch(() => {
      setSigningIn(false);
      setError("generic");
    });
  }, []);

  const signOut = useCallback(() => {
    deliberateSignOut.current = true;
    firebaseSignOut(auth).catch(() => {});
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextShape = { status, user, error, signingIn, signIn, signOut, clearError };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextShape {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Manual verification note**

No automated tests for this file (React/Firebase SDK wiring, not pure logic — consistent with `store.tsx`). Full verification happens in Task 9 once real Firebase credentials exist and `App.tsx` (Task 5) is wired up.

- [ ] **Step 3: Commit**

```bash
git add src/shared/state/auth.tsx
git commit -m "Add AuthProvider: Firebase Google sign-in via redirect flow"
```

---

### Task 4: Login screen

**Files:**
- Create: `src/features/auth/GoogleIcon.tsx`
- Create: `src/features/auth/LoginScreen.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3).
- Produces: `LoginScreen` component, self-contained — internally renders all of idle/loading/signing-in/error states with no props.

- [ ] **Step 1: Google's official "G" icon**

Create `src/features/auth/GoogleIcon.tsx`:

```tsx
// Google's official multi-color "G" mark. Kept exactly as published --
// per Google's brand guidelines the logo itself isn't re-themed to match
// Maestro's palette; only the button shape/typography around it is ours.
export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-none">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}
```

- [ ] **Step 2: The login screen itself**

Create `src/features/auth/LoginScreen.tsx`:

```tsx
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
```

- [ ] **Step 3: Manual verification note**

No automated tests (pure UI, driven entirely by `useAuth()` from Task 3). Verified visually in Task 9.

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/GoogleIcon.tsx src/features/auth/LoginScreen.tsx
git commit -m "Add the Google sign-in login screen"
```

---

### Task 5: Wire the auth gate into App.tsx

**Files:**
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth` (Task 3); `LoginScreen` (Task 4).

- [ ] **Step 1: Replace the entire file**

```tsx
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../shared/state/auth";
import { AppStateProvider, useAppState } from "../shared/state/store";
import { LoginScreen } from "../features/auth/LoginScreen";
import { Sidebar } from "./Sidebar";
import { ProjectInfoTab } from "../features/project-info/ProjectInfoTab";
import { FeeCalculationTab } from "../features/fee-calculation/FeeCalculationTab";
import { ProjectScheduleTab } from "../features/project-schedule/ProjectScheduleTab";
import { SettingsTab } from "../features/settings/SettingsTab";
import { PipelineTab } from "../features/pipeline/PipelineTab";
import { ProposalBuilderTab } from "../features/proposal-builder/ProposalBuilderTab";
import { AccountTab } from "../features/account/AccountTab";

// Pipeline is the app's home screen; opening a project switches to its
// four-tab workspace; Settings is reachable from either. See the Pipeline
// Unification design spec, "Navigation & screens". No URL routing --
// navigation is state-only (unchanged prior decision).
//
// The whole app additionally sits behind Google sign-in (AuthProvider +
// AuthGate below) -- see the Google Sign-In design spec. Signed-out users
// never mount AppStateProvider, so project data can never flash on screen
// before auth is confirmed.

function Splash() {
  return (
    <div className="fixed inset-0 z-[999] bg-os-charcoal flex items-center justify-center pointer-events-none animate-osSplashOut">
      <div className="flex items-center gap-4">
        <div className="h-14 flex-none animate-osSymbolPulse">
          <img src="/assets/logo-symbol-white.png" alt="" className="h-14 w-auto block" />
        </div>
        <div className="flex flex-col items-start gap-[5px]">
          <div className="font-bold text-[34px] leading-none font-display tracking-[.02em] text-white">MAESTRO</div>
          <div className="font-bold text-[10px] font-sans tracking-[.22em] uppercase text-os-orange-300">by Ossa Studio</div>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { state } = useAppState();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1600);
    return () => clearTimeout(t);
  }, []);

  const hasProject = !!state.store.projects[state.store.currentId];
  const projectTabVisible = state.view === "project" && hasProject;
  const settingsVisible = state.view === "settings" && hasProject;

  return (
    <>
      {showSplash && <Splash />}
      <div className="flex min-h-screen items-stretch max-md:block">
        <Sidebar />
        <main className="flex-1 min-w-0 px-11 pt-[34px] pb-[90px] max-w-[1280px] max-md:px-4 max-md:pt-5 max-md:pb-[60px]">
          <div style={{ display: state.view === "pipeline" ? "block" : "none" }}>
            <PipelineTab />
          </div>
          {settingsVisible && <SettingsTab />}
          {state.view === "account" && <AccountTab />}
          {projectTabVisible && state.projectTab === 1 && <ProjectInfoTab />}
          {projectTabVisible && state.projectTab === 2 && <FeeCalculationTab />}
          {projectTabVisible && state.projectTab === 3 && <ProjectScheduleTab />}
          {projectTabVisible && state.projectTab === 7 && <ProposalBuilderTab />}
        </main>
      </div>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status !== "signed-in") return <LoginScreen />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppStateProvider>
          <Shell />
        </AppStateProvider>
      </AuthGate>
    </AuthProvider>
  );
}
```

Note: `AccountTab` (Task 8) is imported and referenced here already, ahead of when it's built. This is expected and matches the pattern used throughout the pipeline-unification plan (later tasks' exports referenced by name before they exist) — the app won't compile cleanly until Task 8 lands, which is fine at this point in the sequence.

- [ ] **Step 2: Commit**

```bash
git add src/app/App.tsx
git commit -m "Gate the app behind Google sign-in"
```

---

### Task 6: Add the "account" view to the app state

**Files:**
- Modify: `src/shared/state/store.tsx`

**Interfaces:**
- Produces: `View` type gains `"account"`; `AppContextShape` gains `goToAccount: () => void`.

- [ ] **Step 1: Extend the `View` type**

In `src/shared/state/store.tsx`, find:

```ts
export type View = "pipeline" | "project" | "settings";
```

Replace with:

```ts
export type View = "pipeline" | "project" | "settings" | "account";
```

- [ ] **Step 2: Add `goToAccount` to the context shape**

Find the `AppContextShape` interface's `goToSettings: () => void;` line and add directly after it:

```ts
  goToAccount: () => void;
```

- [ ] **Step 3: Add the `goToAccount` implementation**

Find:

```ts
  const goToPipeline = useCallback(() => setState((s) => ({ ...s, view: "pipeline" })), []);
  const goToSettings = useCallback(() => setState((s) => ({ ...s, view: "settings" })), []);
```

Replace with:

```ts
  const goToPipeline = useCallback(() => setState((s) => ({ ...s, view: "pipeline" })), []);
  const goToSettings = useCallback(() => setState((s) => ({ ...s, view: "settings" })), []);
  const goToAccount = useCallback(() => setState((s) => ({ ...s, view: "account" })), []);
```

- [ ] **Step 4: Add `goToAccount` to the memoized value (both the object and its dependency array)**

Find the `useMemo<AppContextShape>` block (contains `goToPipeline,` and `goToSettings,` twice — once in the returned object, once in the dependency array). In **both** places, add `goToAccount,` directly after `goToSettings,`. The object literal and dependency array must match exactly, the same way `goToPipeline`/`goToSettings` already appear in both.

- [ ] **Step 5: Commit**

```bash
git add src/shared/state/store.tsx
git commit -m "Add account view and goToAccount action"
```

---

### Task 7: Profile menu

**Files:**
- Create: `src/app/ProfileMenu.tsx`
- Modify: `src/app/Sidebar.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3, for `user`/`signOut`); `useAppState()`'s `goToAccount` (Task 6).

Design decision to implement exactly as specified: the popover has **two** clickable rows, not three. The profile info block (photo/name/email) is itself the clickable link to the Account view — "Account" is not a separate third row alongside it. Below a divider, "Sign out" is the only other action. This keeps the menu compact per the design spec and avoids duplicating "Settings," which is already its own persistent sidebar item.

- [ ] **Step 1: Create the profile menu**

Create `src/app/ProfileMenu.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../shared/state/auth";
import { useAppState } from "../shared/state/store";

// Compact profile chip + popover for the sidebar's bottom section. The
// popover has exactly two rows: the profile info block (itself the link
// to the Account view) and Sign out -- "Settings" is deliberately not
// duplicated here, it's already a persistent sidebar item. See the Google
// Sign-In design spec, "Authenticated UI".
export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { goToAccount } = useAppState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative px-[10px] pt-[10px]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        className="w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-full text-left hover:bg-white/[.08] focus:outline-none focus:ring-2 focus:ring-os-orange-300"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full flex-none" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full flex-none bg-grad-accent text-white flex items-center justify-center font-bold text-[12px]">
            {initial}
          </div>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-[12.5px] text-white/85">{user.displayName}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-[10px] right-[10px] mb-2 rounded-brand-sm bg-os-900 border border-white/[.12] shadow-glass overflow-hidden">
          <button
            onClick={() => {
              setOpen(false);
              goToAccount();
            }}
            className="w-full text-left px-[14px] py-[12px] border-b border-white/[.12] hover:bg-white/[.08]"
          >
            <div className="font-bold text-[13px] text-white truncate">{user.displayName}</div>
            <div className="mt-[2px] text-[11.5px] text-white/60 truncate">{user.email}</div>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="w-full text-left px-[14px] py-[10px] text-[13px] font-medium text-white/85 hover:bg-white/[.08]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render it in the Sidebar's bottom section**

In `src/app/Sidebar.tsx`, add the import at the top alongside the other imports:

```tsx
import { ProfileMenu } from "./ProfileMenu";
```

Find the bottom section:

```tsx
      <div className="border-t border-white/[.12]">
        <button
          onClick={goToSettings}
```

Replace with (adding `<ProfileMenu />` as the first child, nothing else in this block changes):

```tsx
      <div className="border-t border-white/[.12]">
        <ProfileMenu />
        <button
          onClick={goToSettings}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/ProfileMenu.tsx src/app/Sidebar.tsx
git commit -m "Add profile menu (identity, link to Account, sign out) to the sidebar"
```

---

### Task 8: Account view

**Files:**
- Create: `src/features/account/useAccount.ts`
- Create: `src/features/account/AccountTab.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3); `PageHeader`, `SectionHeader` (existing shared components); `GoogleIcon` (Task 4).
- Produces: `AccountTab` component — the view `App.tsx` (Task 5) already renders when `state.view === "account"`.

Renders inside the normal light-background `<main>` content area (not the dark login screen) — same visual family as every other tab. Deliberately **not** gated on `hasProject`, unlike the per-project Settings tab: identity isn't a per-project concern, so this must be reachable even with zero projects.

- [ ] **Step 1: The hook**

Create `src/features/account/useAccount.ts`:

```ts
import { useAuth } from "../../shared/state/auth";

export function useAccount() {
  const { user } = useAuth();
  return {
    displayName: user?.displayName || "",
    email: user?.email || "",
    photoURL: user?.photoURL || null,
  };
}
```

- [ ] **Step 2: The view**

Create `src/features/account/AccountTab.tsx`:

```tsx
import { PageHeader } from "../../shared/components/PageHeader";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { GoogleIcon } from "../auth/GoogleIcon";
import { useAccount } from "./useAccount";

export function AccountTab() {
  const { displayName, email, photoURL } = useAccount();

  return (
    <div>
      <PageHeader eyebrow="Ossa Studio" title="Account" subtitle="Your Maestro sign-in identity." />

      <div className="flex items-center gap-4 mb-[30px]">
        {photoURL ? (
          <img src={photoURL} alt="" className="w-14 h-14 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-grad-accent text-white flex items-center justify-center font-bold text-[20px]">
            {displayName.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <div>
          <div className="font-bold text-[16px] text-os-ink">{displayName}</div>
          <div className="text-[13px] text-os-600">{email}</div>
        </div>
      </div>

      <SectionHeader>Connected Account</SectionHeader>
      <div className="mt-3 flex items-center justify-between rounded-brand-sm border border-os-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <GoogleIcon />
          <div>
            <div className="font-bold text-[13px] text-os-ink">Google</div>
            <div className="text-[12px] text-os-600">Connected as {email}</div>
          </div>
        </div>
        <span className="flex-none font-bold text-[11px] tracking-[.05em] uppercase text-os-orange-700 bg-os-orange-050 px-[10px] py-[5px] rounded-full">
          Status: Connected
        </span>
      </div>
      <p className="mt-2 text-[12px] text-os-500">
        Google is your only sign-in method for Maestro, so it can't be disconnected here.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/account/useAccount.ts src/features/account/AccountTab.tsx
git commit -m "Add the Account view with Connected Account section"
```

---

### Task 9: Firebase project setup + full manual verification

**Files:**
- Modify: `.env.local` (git-ignored — not committed)
- Modify: Vercel project environment variables (via Vercel dashboard, not a file in this repo)

**Interfaces:** none — this task is operational, not code.

This task is not dispatched to an implementer subagent. It requires live interaction with a Google account (Firebase Console) and the Vercel dashboard, done by the human project owner directly, with the controller assisting/driving where the platform allows.

- [ ] **Step 1: Create the Firebase project**

In the Firebase Console: create a new project for Maestro.

- [ ] **Step 2: Enable Google sign-in**

In Firebase Authentication → Sign-in method: enable the Google provider.

- [ ] **Step 3: Restrict the OAuth consent screen to the Workspace**

In the linked Google Cloud project's OAuth consent screen: set User Type to **Internal** (restricts sign-in to the Ossa Studio Workspace at the Google OAuth level, before the `hd` parameter in code is even reached).

- [ ] **Step 4: Register authorized domains**

In Firebase Authentication → Settings → Authorized domains: add the production domain (`maestro-dusky-chi.vercel.app`) and Vercel's preview-deployment domain pattern.

- [ ] **Step 5: Get the config values into both environments**

Copy the six Firebase config values (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID) into:
- `.env.local` locally (never committed — already covered by `.gitignore`)
- Vercel's project environment variables (Production and Preview), so deployed builds have them too

Set `VITE_WORKSPACE_DOMAIN` to the actual Ossa Studio domain in both places.

- [ ] **Step 6: Full manual verification walkthrough**

Once real credentials exist and the branch is deployed to a Vercel preview, click through:

1. Visiting the app while signed out shows only the login screen — no flash of Pipeline or any other content.
2. Clicking "Continue with Google" shows the "Connecting to Google…" state, then redirects to Google.
3. Signing in with an Ossa Studio Workspace account redirects back, briefly shows "Signing you into Maestro…", then lands on Pipeline (home).
4. Signing in with a non-Workspace Google account (if one is available to test with) shows the wrong-domain error message, not a generic one, and does not grant access.
5. The profile chip in the sidebar shows the signed-in user's photo (or initial, if no photo) and name.
6. Clicking the profile chip opens the popover; clicking the profile info block navigates to the Account view; the Account view shows the correct name/email/photo and the Connected Account section with no disconnect action.
7. Clicking "Sign out" (from the popover) returns to the login screen immediately, with no stale profile data visible at any point.
8. Reloading the app after signing out still shows the login screen (session state persisted correctly as "signed out").
9. Signing back in returns to a working app with existing project data intact (this task doesn't change data storage at all — confirms Project A truly left it alone).
10. Keyboard-only pass: Tab reaches the Google button and (in an error state) both error actions, each with a visible focus ring; Escape closes the profile popover.

Note any failures found during this walkthrough as follow-up fixes — do not mark this step done until all ten checks pass.

- [ ] **Step 7: Final cross-check**

Run: `grep -rn "TODO\|FIXME" src/features/auth src/features/account src/shared/state/auth.tsx src/app/ProfileMenu.tsx`
Expected: no matches.
