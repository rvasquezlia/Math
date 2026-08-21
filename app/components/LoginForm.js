"use client";

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      login(password);
      onSuccess?.();
    } catch (err) {
      setError(err.message ?? "Incorrect password.");
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form__field">
        <label htmlFor="login-password">Teacher Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
      </div>
      {error && <p className="login-form__error">{error}</p>}
      <button type="submit" className="btn-primary">Unlock Editing</button>
    </form>
  );
}
