"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Mode = "login" | "register";

type AuthResult = {
  user?: { id: string; displayName: string; email: string; role: "ATHLETE" | "COACH" | "ADMIN" };
  authenticated?: boolean;
  pendingEmailConfirmation?: boolean;
  message?: string;
  error?: string;
};

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailActionBusy, setEmailActionBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendCoolingDown = resendCooldown > 0;

  useEffect(() => {
    if (!resendCoolingDown) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCoolingDown]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setStatusMessage("");
    setComplete(false);
    setEmailConfirmationPending(false);
    setPassword("");
    setPasswordConfirmation("");
  }

  async function requestEmailAction(endpoint: string, fallbackError: string) {
    setEmailActionBusy(true);
    setMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as AuthResult;
      if (!response.ok || !result.message) {
        setMessage(result.error ?? fallbackError);
        return;
      }
      setStatusMessage(result.message);
      if (endpoint === "/api/auth/resend-confirmation") setResendCooldown(30);
    } catch {
      setMessage("The account service could not be reached. Please try again.");
    } finally {
      setEmailActionBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setStatusMessage("");

    if (mode === "register" && password !== passwordConfirmation) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = mode === "register"
        ? { displayName, email, password }
        : { email, password };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as AuthResult;

      if (response.ok && result.pendingEmailConfirmation) {
        setPassword("");
        setPasswordConfirmation("");
        setEmailConfirmationPending(true);
        setComplete(true);
        setMessage("Open the confirmation link sent to your email, then return here to sign in.");
        return;
      }

      if (!response.ok || (!result.user && !result.authenticated)) {
        setMessage(result.error ?? "Please check your details and try again.");
        return;
      }

      setPassword("");
      setPasswordConfirmation("");
      setComplete(true);
      setMessage(
        mode === "register"
          ? `Welcome, ${result.user?.displayName ?? displayName}. Your account is ready.`
          : `Welcome back${result.user?.displayName ? `, ${result.user.displayName}` : ""}.`,
      );
    } catch {
      setMessage("The account service could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-page">
      <section className="account-art" aria-label="Athlete training with a coach">
        <Link className="brand account-brand" href="/" aria-label="CoachConnect home">Coach<span>Connect</span></Link>
        <div>
          <p className="eyebrow light">For athletes and coaches</p>
          <h1 aria-label="Your next move starts here.">Your next move<br /><span aria-hidden="true">starts here.</span></h1>
          <p>Create a private account to find coaching, manage your profile and stay ready for every session.</p>
        </div>
        <div className="account-safety"><strong>Private by default</strong><span>Your email never appears on public coach profiles.</span></div>
      </section>

      <section className="account-panel" aria-labelledby="account-heading">
        <Link className="back-link" href="/">← Back to CoachConnect</Link>
        <div className="auth-card">
          <p className="eyebrow">Secure account access</p>
          <h2 id="account-heading">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <div className="auth-tabs" aria-label="Account action">
            <button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => changeMode("login")}>Sign in</button>
            <button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => changeMode("register")}>Create account</button>
          </div>

          {complete ? (
            <div className="auth-success" role="status">
              <span aria-hidden="true">✓</span>
              <h3>{emailConfirmationPending ? "Check your email" : "Account ready"}</h3>
              <p>{message}</p>
              {emailConfirmationPending ? (
                <button
                  className="auth-resend"
                  type="button"
                  disabled={emailActionBusy || resendCooldown > 0 || !email.trim()}
                  onClick={() => requestEmailAction("/api/auth/resend-confirmation", "Unable to resend the confirmation email.")}
                >
                  {emailActionBusy
                    ? "Sending…"
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : "Resend confirmation email"}
                </button>
              ) : (
                <Link className="button button-accent" href="/dashboard">Open my dashboard</Link>
              )}
              {statusMessage && <p className="auth-resend-status">{statusMessage}</p>}
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "register" && (
                <>
                  <label htmlFor="display-name">Display name</label>
                  <input id="display-name" autoComplete="name" minLength={2} maxLength={60} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  <p className="auth-account-note">One account lets you find coaching and apply to coach. You can do both at any time.</p>
                </>
              )}

              <label htmlFor="account-email">Email <span>Private</span></label>
              <input id="account-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />

              <label htmlFor="account-password">Password</label>
              <input id="account-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />

              {mode === "register" && (
                <>
                  <label htmlFor="account-password-confirmation">Re-enter your password</label>
                  <input id="account-password-confirmation" type="password" autoComplete="new-password" minLength={12} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
                </>
              )}

              <small>Use at least 12 characters. Authentication is securely managed by Supabase; CoachConnect never stores your password.</small>

              {mode === "login" && (
                <div className="auth-email-actions">
                  <button
                    className="auth-resend"
                    type="button"
                    disabled={emailActionBusy || !email.trim()}
                    onClick={() => requestEmailAction("/api/auth/forgot-password", "Unable to request a password reset.")}
                  >
                    {emailActionBusy ? "Sending…" : "Forgot password?"}
                  </button>
                  <button
                    className="auth-resend"
                    type="button"
                    disabled={emailActionBusy || resendCooldown > 0 || !email.trim()}
                    onClick={() => requestEmailAction("/api/auth/resend-confirmation", "Unable to resend the confirmation email.")}
                  >
                    {resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : "Resend confirmation email"}
                  </button>
                </div>
              )}

              {statusMessage && <p className="auth-resend-status" role="status">{statusMessage}</p>}
              {message && <p className="auth-error" role="alert">{message}</p>}
              <button className="button button-accent auth-submit" type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in securely" : "Create my account"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
