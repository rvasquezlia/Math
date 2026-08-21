"use client";

import { useAuth } from "../contexts/AuthContext";

/** Only shows a chip when logged in. There's no "log in" button in the
 * header on purpose -- the password prompt only appears on admin pages
 * themselves (see RequireRole), not as a global header control. */
export default function SignInButton() {
  const { user, loading, signOut } = useAuth();

  if (loading || !user) return null;

  return (
    <div className="user-chip">
      <div className="user-chip__info">
        <span className="user-chip__name">Teacher</span>
        <span className="user-chip__role" style={{ color: "#4ade80" }}>admin</span>
      </div>
      <button className="user-chip__signout" onClick={signOut} aria-label="Log out">
        ✕
      </button>
    </div>
  );
}
