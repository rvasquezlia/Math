"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// This is a soft UI gate, not real authentication -- there is no server
// verifying it. It just keeps casual visitors from seeing edit controls;
// anyone who reads the site's JS can find this string. Change it here to
// change the password.
const ADMIN_PASSWORD = "Password1!";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { role: "admin" } | null
  const [loading, setLoading] = useState(true);

  const login = useCallback((password) => {
    if (password !== ADMIN_PASSWORD) {
      throw new Error("Incorrect password.");
    }
    const profile = { role: "admin" };
    setUser(profile);
    sessionStorage.setItem("auth_user", JSON.stringify(profile));
    return profile;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem("auth_user");
  }, []);

  // Restore the unlocked state from sessionStorage on mount.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("auth_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
