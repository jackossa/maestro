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
