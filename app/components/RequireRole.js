"use client";

import { useAuth } from "../contexts/AuthContext";
import LoginForm from "./LoginForm";

/**
 * Renders children only for a logged-in teacher/admin. Otherwise shows an
 * inline login form right where the content would be -- once login
 * succeeds, this re-renders with the real content in place, no navigation
 * needed.
 */
export default function RequireRole({ roles = ["admin"], children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="access-denied">
        <p className="access-denied__sub">Loading…</p>
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="access-denied">
        <div className="access-denied__icon">🔒</div>
        <h2 className="access-denied__title">Teacher Login Required</h2>
        <p className="access-denied__sub">Log in to create or edit lessons.</p>
        <LoginForm />
      </div>
    );
  }

  return children;
}
