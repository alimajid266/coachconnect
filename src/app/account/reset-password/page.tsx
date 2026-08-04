"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type UpdateResult = { message?: string; error?: string };

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password !== passwordConfirmation) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, passwordConfirmation }),
      });
      const result = (await response.json()) as UpdateResult;
      if (!response.ok || !result.message) {
        setMessage(result.error ?? "Unable to update the password.");
        return;
      }
      setPassword("");
      setPasswordConfirmation("");
      setMessage(result.message);
      setComplete(true);
    } catch {
      setMessage("The local service could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-page">
      <section className="account-art" aria-label="CoachConnect password recovery introduction">
        <Link className="brand account-brand" href="/" aria-label="CoachConnect home">Coach<span>Connect</span></Link>
        <div>
          <p className="eyebrow light">Secure recovery</p>
          <h1>Choose a new<br /><span>password.</span></h1>
          <p>Your recovery link creates a short-lived secure session. After the update, that session is signed out automatically.</p>
        </div>
        <div className="account-safety"><strong>Private by default</strong><span>Your password is handled by Supabase and is never stored by CoachConnect.</span></div>
      </section>

      <section className="account-panel" aria-labelledby="reset-heading">
        <Link className="back-link" href="/account">← Back to Sign In</Link>
        <div className="auth-card">
          <p className="eyebrow">Password recovery</p>
          <h2 id="reset-heading">Set a new password</h2>

          {complete ? (
            <div className="auth-success" role="status">
              <span aria-hidden="true">✓</span>
              <h3>Password updated</h3>
              <p>{message}</p>
              <Link className="button button-accent" href="/account">Return to Sign In</Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />

              <label htmlFor="new-password-confirmation">Re-enter new password</label>
              <input id="new-password-confirmation" type="password" autoComplete="new-password" minLength={12} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />

              <small>Use at least 12 characters and choose a password you do not use elsewhere.</small>
              {message && <p className="auth-error" role="alert">{message}</p>}
              <button className="button button-accent auth-submit" type="submit" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
