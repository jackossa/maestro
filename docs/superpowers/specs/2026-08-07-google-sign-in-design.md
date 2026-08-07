# Google Sign-In (Firebase Authentication)

**Date:** 2026-08-07
**Status:** Approved, ready for implementation plan

## Motivation

Maestro has no authentication today — it's a pure client-side Vite+React SPA
with zero backend, zero database, and all project data in per-browser
`localStorage`. This is Project A of a two-project sequence: add a real,
secure Google sign-in gate in front of the app. Project B (a separate, later
spec) will migrate project data from `localStorage` into a per-account
backend so each Google account has its own private, cross-device data.
Project A does not touch project data at all — it is purely an identity and
session layer sitting in front of the existing app, unchanged.

## Scope decisions (from brainstorming)

- **Auth provider: Firebase Authentication.** Its client SDK handles the
  full OAuth 2.0 + PKCE + session/token-refresh flow with zero custom
  backend code required for login. No Supabase, no hand-rolled OAuth via
  Vercel serverless functions.
- **Auth-only for now; data migration is Project B**, not part of this
  spec. Until Project B ships, signed-in users still share one
  `localStorage` bucket per browser — this is a known, accepted limitation
  of doing the projects in this order, not an oversight.
- **Restricted to the Ossa Studio Google Workspace domain.** Not open to
  any Google account. This matters more than it would in a typical app:
  because Project B hasn't shipped, "signed in" doesn't yet mean "sees only
  their own data" — it means "got past the front door" to the one shared
  local dataset. Open sign-in would expose live firm data to anyone who
  found the URL.
- **The entire app requires sign-in.** No public/unauthenticated content
  exists anywhere in Maestro. A signed-out visitor sees only the login
  screen.
- **New Firebase project**, created from scratch as part of implementation
  setup (not an existing project being reused).
- **No GitHub auth, no email/password auth** — Google only. (Maestro has no
  existing email authentication to preserve as a secondary option; the
  brief's conditional instruction to keep it if present therefore doesn't
  apply.)

## Architecture

- **`src/shared/state/auth.tsx`** — new file, a Firebase-Auth-backed
  `AuthProvider` + `useAuth()` hook. Structurally mirrors the existing
  `AppStateProvider` Context pattern in `store.tsx` but is entirely
  separate from it — this file never imports from or is imported by
  `store.tsx`. Exposes:
  ```ts
  interface AuthContextShape {
    status: "loading" | "signed-out" | "signed-in";
    user: { displayName: string; email: string; photoURL: string | null } | null;
    error: AuthErrorKind | null; // see Error Handling below
    signIn: () => void;
    signOut: () => void;
    clearError: () => void;
  }
  ```
- **`App.tsx`** — `AuthProvider` becomes the outermost provider, wrapping
  everything. A gate below it renders exactly one of: a lightweight loading
  state, the login screen, or (completely unchanged) the existing
  `AppStateProvider` + `Shell`. Signed-out users never mount
  `AppStateProvider` — this is what guarantees project data can never flash
  on screen before auth is confirmed, satisfying "do not briefly display
  private content before authentication has been confirmed."
- **Redirect flow, not popup.** Implemented via Firebase's
  `signInWithRedirect` / `getRedirectResult`, not `signInWithPopup`.
  Rationale: popups have no real "callback" moment (the brief's dedicated
  "OAuth Callback Experience" section wouldn't correspond to anything real
  under a popup flow), and popups are frequently blocked or unusable in
  mobile browsers and in-app webviews, which conflicts with "mobile-first."
  On app boot, before anything else renders, `getRedirectResult()` is
  awaited and the login screen's shell shows "Signing you into Maestro…"
  until it resolves.
- **Session persistence:** Firebase's default `browserLocalPersistence` —
  stays signed in until explicit sign-out. Matches the rest of Maestro's
  existing "saved automatically, no timeouts" behavior.
- **Domain restriction, two layers:**
  1. **Primary:** the Firebase/Google Cloud OAuth consent screen is
     configured as **Internal** (Workspace-only), so Google itself rejects
     non-Workspace accounts at the OAuth level, before any consent screen
     is shown.
  2. **Defense in depth:** the `hd` custom parameter is also set on the
     Google auth provider, and the returned account's domain is checked
     client-side after sign-in as a second gate.
- **No new routing library.** Maestro has no URL routing today (view-based
  state navigation, no deep links) and none is introduced by this project.
  "Protected routes" is satisfied by the single boolean gate in `App.tsx`.

## Login screen

**Full-viewport `bg-os-charcoal` background** — reuses the existing splash
screen's identity treatment (white logo mark, "MAESTRO" wordmark, "by Ossa
Studio" tagline in orange) rather than inventing a new light "auth card"
look. Single centered column, **no nested card** anywhere on this screen.

Content, top to bottom:
1. Logo mark + wordmark + tagline (existing assets/styles, unchanged)
2. Heading: **"Welcome to Maestro"** — white, existing display font
3. Subtext: **"Sign in to continue to your workspace."** — white at reduced
   opacity, matching the sidebar's existing secondary-text treatment
4. **Google button**: official multi-color "G" logo, white/light pill
   (`rounded-full`, matching existing button shape language), dark text
   "Continue with Google," minimum 44px height. Deliberately kept in
   Google's own recommended light button styling rather than Maestro's
   orange-gradient primary-button style — both because Google's brand
   guidelines restrict re-skinning the logo, and because a light button
   reads as high-contrast against the dark background without needing a
   card behind it. Focus ring uses the existing orange accent color.
   States: default, hover (subtle darken), pressed (subtle
   darken+compress), focus (orange ring), disabled/loading (dimmed +
   spinner, see below).

**Mobile:** identical charcoal background and column, full width, 20–24px
horizontal padding, button spans full width.

## Flow & states

All states below render inside the same login-screen shell — only the
heading/subtext area and button state change. No separate pages, no
navigation.

**Click → loading:**
1. Button disables immediately.
2. Button label changes to "Connecting to Google…" with a spinner.
3. `signInWithRedirect` is called; the browser navigates to Google.

**Redirect back → callback state:**
1. On app boot, before rendering login or app content, `getRedirectResult()`
   is awaited.
2. While pending, the shell shows: heading/subtext area replaced with
   **"Signing you into Maestro…"** + a subtle spinner. Never a blank or
   technical page.
3. On success: domain check runs, then either signed-in state (renders the
   app) or the wrong-domain error (below).
4. On failure: the generic error state (below).

**Error states** (inline in the same shell, no navigation):

| Case | Message | Actions |
|---|---|---|
| Generic (cancelled, network failure, callback failure, verification failure) | "We couldn't sign you in with Google. Please try again." | Try again (primary) · Back to sign-in (secondary) |
| Wrong domain (account outside Ossa Studio Workspace) | "This Google account isn't authorized for Maestro. Please sign in with your Ossa Studio account." | Try again (primary) · Back to sign-in (secondary) |
| Session expired (Firebase reports signed-out while app was in signed-in state) | "Your session expired. Please sign in again." | Back to sign-in |

No raw Firebase/OAuth error text, codes, or stack traces are ever shown.
Errors are announced via an `aria-live` region for screen readers.

**New/returning users:** Firebase Auth handles both identically — a new
Google identity signing in for the first time is automatically provisioned
as a Firebase user; a returning identity signs into the same Firebase user.
No separate "create account" step, no duplicate-account risk (Firebase
keys accounts by the Google identity itself).

## Protected routing & post-sign-in landing

Because Maestro has no URL routing, "preserve the requested destination and
return the user to it" doesn't map onto a real destination the way it would
in a router-based app — a signed-out visitor never reaches any in-app
screen (the whole app is gated), so there is nothing to preserve in that
sense.

The one real case this affects: a session expiring *while* a user is
mid-task. Because signed-out rendering happens entirely outside
`AppStateProvider` (see Architecture), a mid-session expiry unmounts the
whole app state tree. On re-sign-in, the user lands back at Pipeline
(home) — not the exact project/tab they were on. This is an accepted
trade-off for a single-view app, not an oversight.

## Authenticated UI

- **Profile chip** added to the sidebar's bottom section, next to the
  existing persistent Settings button: avatar photo + display name,
  compact, matching existing sidebar sizing/spacing.
- Clicking it opens a **small popover** (not a full menu): profile info
  block (photo, name, email) at the top, a divider, then a single
  **Sign out** action. "Settings" is deliberately *not* duplicated here —
  it's already a persistent, always-reachable nav item.
- **New `view: "account"`** state value (parallel to the existing
  `"pipeline" | "project" | "settings"`), reachable via a link inside the
  popover. This is a new, always-reachable view — not folded into the
  existing per-project Settings tab, which is scoped to project data
  ("These settings apply only to this project, not firm-wide") and doesn't
  even render with zero projects. Identity is not a per-project concern.
- **Account view contents:**
  - Profile block: photo, display name, email (read-only — these come from
    Google, not editable in Maestro)
  - **Connected Account** section: Google icon, "Connected as
    `[email]`," "Status: Connected." **Informational only — no disconnect
    action**, since Google is currently Maestro's only sign-in method and
    disconnecting it would lock the user out with no fallback. A short
    note states this. (This makes the brief's "confirm before
    disconnecting" requirement moot by design, not by omission.)

## Sign out

Calls Firebase `signOut()`. Because signed-out rendering lives entirely
outside `AppStateProvider`, the moment auth status flips to `"signed-out"`
the whole authenticated app UI (including the profile chip and any cached
name/photo) unmounts — there is no code path where stale profile data can
linger on screen. A brief CSS fade transitions between the two states
rather than an abrupt cut.

## Accessibility

- All interactive elements (button, popover items, error actions) meet the
  44px minimum touch target.
- Google button and all error actions have visible keyboard focus rings
  (existing orange accent token).
- Error messages render inside an `aria-live="polite"` region so
  screen readers announce them without requiring focus to move.
- "Status: Connected" is conveyed via text, not color alone.
- Logical tab order: logo (non-interactive) → heading (non-interactive) →
  Google button → (error state only) Try again → Back to sign-in.

## Security

- PKCE and OAuth state validation are handled entirely inside the Firebase
  Auth SDK — not hand-implemented.
- The Firebase client config (API key, project ID, etc.) is not a secret;
  it's designed by Google to be public. Actual protection comes from the
  Workspace-only OAuth consent screen configuration and Firebase's own
  request validation, not from hiding config values.
- No OAuth tokens, client secrets, or internal error detail are ever
  rendered in the UI or logged to the console in a user-visible way.
- Production HTTPS is already satisfied by existing Vercel hosting.

## Firebase project setup (operational, done alongside implementation)

1. Create a new Firebase project in the Firebase Console (user-driven in
   browser, tied to their Google identity — same pattern as the
   GitHub/Vercel sign-ins done earlier in this workstream).
2. Enable Google as a sign-in provider in Firebase Authentication.
3. Configure the OAuth consent screen as **Internal** (Workspace-only) —
   the primary domain-restriction mechanism (see Architecture).
4. Register authorized domains: production Vercel URL
   (`maestro-dusky-chi.vercel.app`) plus Vercel's preview-deployment domain
   pattern.
5. Pull Firebase config values into Vite environment variables
   (`VITE_FIREBASE_*`), added both locally and in Vercel project settings.

## Out of scope

- Any migration of project data to a backend (Project B, separate spec).
- Email/password authentication (doesn't exist today; not being added).
- GitHub authentication (explicitly excluded by the brief).
- A self-service "disconnect Google" action (see Authenticated UI).
- Preserving exact in-app position (project/tab) across a session-expiry
  re-sign-in (see Protected routing).
- URL routing / deep linking of any kind.

## Verification

No Node.js has been available in this environment throughout this
workstream (confirmed repeatedly in prior sessions). The implementation
plan should assume the same constraint unless re-verified: code and tests
written carefully by hand, with real verification happening via Vercel's
build step on push and manual browser testing against the deployed
preview — the same approach used successfully for the pipeline-unification
project.
