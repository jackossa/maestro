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
          firebaseSignOut(auth).catch((err) => {
            console.warn("[auth]", err);
            deliberateSignOut.current = false;
          });
          setError("wrong-domain");
        }
      })
      .catch((err) => {
        console.warn("[auth]", err);
        if (!cancelled) setError("generic");
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (cancelled) return;

      if (firebaseUser && isAuthorizedDomain(firebaseUser.email, WORKSPACE_DOMAIN)) {
        wasSignedIn.current = true;
        deliberateSignOut.current = false;
        setError(null);
        setUser(toAuthUser(firebaseUser));
        setStatus("signed-in");
        return;
      }

      if (firebaseUser) {
        // Signed in but wrong domain. May have already been signed out by
        // the getRedirectResult handler above (same page load as the
        // redirect), or may be a stale wrong-domain session persisting
        // from an interrupted sign-out on an earlier load -- either way,
        // never let status become "signed-in" for this user, and always
        // resolve to a real terminal state rather than leaving status
        // stuck at "loading" forever.
        deliberateSignOut.current = true;
        wasSignedIn.current = false;
        setError((prev) => prev ?? "wrong-domain");
        firebaseSignOut(auth).catch((err) => {
          console.warn("[auth]", err);
          deliberateSignOut.current = false;
        });
        setUser(null);
        setStatus("signed-out");
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
    signInWithRedirect(auth, googleProvider).catch((err) => {
      console.warn("[auth]", err);
      setSigningIn(false);
      setError("generic");
    });
  }, []);

  const signOut = useCallback(() => {
    deliberateSignOut.current = true;
    setError(null);
    firebaseSignOut(auth).catch(() => {
      deliberateSignOut.current = false;
    });
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
