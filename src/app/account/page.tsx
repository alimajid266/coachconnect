"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import SiteHeader, { type SessionUser } from "@/components/site-header";
import SiteLogo from "@/components/site-logo";
import SportsLoader from "@/components/sports-loader";
import ScheduleManager from "@/components/schedule-manager";
import TrainingPlanBuilder from "@/components/training-plan-builder";
import RecommendationPreferences from "@/components/recommendation-preferences";

type Mode = "login" | "register";
type PageState = "loading" | "unavailable" | "anonymous" | "authenticated" | "deleted";

type AuthResult = {
  user?: SessionUser;
  authenticated?: boolean;
  pendingEmailConfirmation?: boolean;
  message?: string;
  error?: string;
};

const coachStatusCopy = {
  DRAFT: ["Draft saved", "Continue application"],
  SUBMITTED: ["Submitted for review", "View application"],
  UNDER_REVIEW: ["Under review", "View application"],
  APPROVED: ["Approved coach", "Manage coach profile"],
  REJECTED: ["Changes requested", "Update application"],
  SUSPENDED: ["Coach profile suspended", "View profile status"],
} as const;

const onboardingSports = ["Football", "Cricket", "Tennis", "Strength", "Swimming", "Badminton", "Boxing", "Yoga"];

function requestedDestination() {
  if (typeof window === "undefined") return "/account";
  const candidate = new URLSearchParams(window.location.search).get("next");
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return "/account";
  if (candidate.includes("\\") || /[\u0000-\u001f\u007f]/.test(candidate)) return "/account";
  const resolved = new URL(candidate, window.location.origin);
  return resolved.origin === window.location.origin ? `${resolved.pathname}${resolved.search}${resolved.hash}` : "/account";
}

export default function AccountPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [preferredLocation, setPreferredLocation] = useState("Islamabad");
  const [maxBudgetPkr, setMaxBudgetPkr] = useState("3000");
  const [trainingGoal, setTrainingGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Beginner");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailActionBusy, setEmailActionBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const resendCoolingDown = resendCooldown > 0;

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json() as Promise<{ user: SessionUser | null }>;
      })
      .then((result) => {
        if (!active) return;
        setUser(result.user);
        setPageState(result.user ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (!active) return;
        setPageState("unavailable");
      });
    return () => { active = false; };
  }, []);

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

  async function uploadAvatar(file: File | undefined) {
    if (!file || !user) return;
    setAvatarBusy(true);
    setMessage("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/coach-application/image?purpose=avatar", {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setMessage(result.error ?? "The profile picture could not be uploaded.");
        return;
      }
      setAvatarUrl(result.url);
      setUser({ ...user, avatarUrl: result.url });
      setStatusMessage("Profile picture updated.");
    } catch {
      setMessage("The profile picture could not be uploaded. Please try again.");
    } finally {
      setAvatarBusy(false);
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
    if (mode === "register" && interests.length === 0) {
      setMessage("Choose at least one sport or training interest.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = mode === "register" ? { displayName, email, password, interests, preferredLocation, maxBudgetPkr: Number(maxBudgetPkr), trainingGoal, experienceLevel } : { email, password };
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

      if (mode === "login" && requestedDestination() === "/account") {
        const sessionResponse = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!sessionResponse.ok) throw new Error("Session unavailable");
        const sessionResult = (await sessionResponse.json()) as { user: SessionUser | null };
        if (!sessionResult.user) throw new Error("Session unavailable");
        setUser(sessionResult.user);
        setPageState("authenticated");
        setComplete(false);
        return;
      }

      setComplete(true);
      setMessage(mode === "register"
        ? `Welcome, ${result.user?.displayName ?? displayName}. Your account is ready.`
        : "You are signed in.");
    } catch {
      setMessage("The account service could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logOut() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      setUser(null);
      setStatusMessage("You have been logged out.");
      setPageState("anonymous");
      setComplete(false);
    } catch {
      setMessage("Unable to log out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirmation !== "DELETE" || deletePassword.length < 8) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const result = (await response.json()) as { deleted?: boolean; error?: string };
      if (!response.ok || !result.deleted) {
        setMessage(result.error ?? "Unable to delete your account.");
        return;
      }
      setUser(null);
      setDeleteConfirmation("");
      setDeletePassword("");
      setPageState("deleted");
    } catch {
      setMessage("Unable to delete your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (pageState === "loading") {
    return (
      <main className="account-state">
        <SportsLoader message="Checking your account…" compact />
      </main>
    );
  }

  if (pageState === "unavailable") {
    return (
      <main className="account-state">
        <SiteLogo />
        <p className="eyebrow">Account status unavailable</p>
        <h1>Unable to confirm your session</h1>
        <p>We could not safely determine whether you are signed in. Your session has not been changed.</p>
        <Link className="button button-primary" href="/account">Retry account check</Link>
      </main>
    );
  }

  if (pageState === "deleted") {
    return (
      <main className="account-state">
        <SiteLogo />
        <p className="eyebrow">Account removed</p>
        <h1>Account deleted</h1>
        <p>Your CoachConnect account and private profile data have been permanently removed.</p>
        <Link className="button button-primary" href="/">Return home</Link>
      </main>
    );
  }

  if (pageState === "authenticated" && user) {
    const coachStatus = user.capabilities?.coachStatus ?? (user.role === "COACH" ? "APPROVED" : null);
    const coachAction = coachStatus ? coachStatusCopy[coachStatus] : null;
    const isAdministrator = user.capabilities?.administrator ?? user.role === "ADMIN";

    return (
      <div className="member-account-page">
        <SiteHeader initialSession={{ user }} />
        <main className="member-account-main">
          <section className="member-account-intro">
            <p className="eyebrow">Member account</p>
            <h1>My account</h1>
            <p>Manage your CoachConnect access and coaching activity.</p>
            {message && <p className="auth-error" role="alert">{message}</p>}
            {statusMessage && <p className="auth-resend-status" role="status">{statusMessage}</p>}
          </section>

          <ScheduleManager userId={String(user.id)} approvedCoach={coachStatus === "APPROVED"} formats={user.capabilities?.coachFormats ?? undefined} />
          <RecommendationPreferences />
          <TrainingPlanBuilder />

          <section className="member-account-grid" aria-label="Account details and actions">
            <article className="account-summary-card">
              <span>Signed in as</span>
              {(avatarUrl ?? user.avatarUrl) && <img className="account-avatar" src={(avatarUrl ?? user.avatarUrl) as string} alt={`${user.displayName} profile picture`} />}
              <h2>{user.displayName}</h2>
              <p>{user.email}</p>
              <label className="account-avatar-upload">Account profile picture
                <input aria-label="Account profile picture" type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={(event) => uploadAvatar(event.target.files?.[0])} />
                <span>{avatarBusy ? "Uploading…" : "JPEG, PNG or WebP, up to 5 MB."}</span>
              </label>
            </article>
            <article>
              <span>Coaching</span>
              <h2>{coachAction?.[0] ?? "Become a coach"}</h2>
              <p>{coachStatus === "APPROVED"
                ? "Keep your public coaching information accurate."
                : "Use this member account to apply for coach approval."}</p>
              <Link className="button button-primary" href="/coach/apply">
                {coachAction?.[1] ?? "Become a coach"}
              </Link>
            </article>
            {isAdministrator && (
              <article>
                <span>Administration</span>
                <h2>Coach applications</h2>
                <p>Review submitted coach profiles and approval decisions.</p>
                <Link className="button button-primary" href="/admin/coaches">Review applications</Link>
              </article>
            )}
            <article>
              <span>Session</span>
              <h2>Account access</h2>
              <p>Log out on this device when you have finished.</p>
              <button className="button account-secondary-button" type="button" onClick={logOut} disabled={busy}>Log out</button>
            </article>
          </section>

          <section className="account-danger-zone" aria-labelledby="danger-heading">
            <div>
              <p className="eyebrow">Permanent action</p>
              <h2 id="danger-heading">Delete account</h2>
              <p>This permanently removes your member profile and coach application. It cannot be undone.</p>
            </div>
            {!deleteOpen ? (
              <button className="account-delete-button" type="button" onClick={() => setDeleteOpen(true)}>Delete account</button>
            ) : (
              <div className="account-delete-confirmation">
                <h3>Delete your account?</h3>
                <p>Enter your current password and type <strong>DELETE</strong> to confirm permanent deletion.</p>
                <label htmlFor="delete-account-password">Current password</label>
                <input
                  id="delete-account-password"
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
                <label htmlFor="delete-account-confirmation">Type DELETE to confirm</label>
                <input
                  id="delete-account-confirmation"
                  autoComplete="off"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                />
                {message && <p className="auth-error" role="alert">{message}</p>}
                <div>
                  <button type="button" onClick={() => { setDeleteOpen(false); setDeleteConfirmation(""); setDeletePassword(""); setMessage(""); }}>Cancel</button>
                  <button className="account-delete-button" type="button" disabled={busy || deleteConfirmation !== "DELETE" || deletePassword.length < 8} onClick={deleteAccount}>
                    {busy ? "Deleting…" : "Permanently delete account"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <main className="account-page">
      <section className="account-art" aria-label="Athlete training with a coach">
        <SiteLogo className="account-brand" />
        <div>
          <p className="eyebrow light">For athletes and coaches</p>
          <h1 aria-label="Your next move starts here.">Your next move<br /><span aria-hidden="true">starts here.</span></h1>
          <p>Create one account to find coaching, manage your profile and stay ready for every session.</p>
        </div>
        <div className="account-safety"><strong>One account, two ways to train</strong><span>Find a coach now and apply to offer coaching whenever you are ready.</span></div>
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
                <button className="auth-resend" type="button" disabled={emailActionBusy || resendCooldown > 0 || !email.trim()} onClick={() => requestEmailAction("/api/auth/resend-confirmation", "Unable to resend the confirmation email.")}>
                  {emailActionBusy ? "Sending…" : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend confirmation email"}
                </button>
              ) : (
                <Link className="button button-accent" href={requestedDestination()}>Open my account</Link>
              )}
              {statusMessage && <p className="auth-resend-status">{statusMessage}</p>}
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "register" && (
                <>
                  <label htmlFor="display-name">Display name</label>
                  <input id="display-name" autoComplete="name" minLength={2} maxLength={60} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  <fieldset className="auth-preferences">
                    <legend>Your coaching interests</legend>
                    <p>These help AI search recommend relevant coaches and plans. You can change them later.</p>
                    <div>{onboardingSports.map((sport) => <label key={sport}><input type="checkbox" checked={interests.includes(sport)} onChange={(event) => setInterests((current) => event.target.checked ? [...current, sport] : current.filter((item) => item !== sport))} />{sport}</label>)}</div>
                  </fieldset>
                  <div className="auth-preference-grid">
                    <label htmlFor="preferred-location">Preferred location<select id="preferred-location" value={preferredLocation} onChange={(event) => setPreferredLocation(event.target.value)}><option>Islamabad</option><option>Karachi</option><option>Lahore</option><option>Rawalpindi</option><option>Online</option></select></label>
                    <label htmlFor="max-budget">Maximum per-session budget (PKR)<input id="max-budget" type="number" min="500" max="1000000" step="100" required value={maxBudgetPkr} onChange={(event) => setMaxBudgetPkr(event.target.value)} /></label>
                    <label htmlFor="experience-level">Current level<select id="experience-level" value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
                  </div>
                  <label htmlFor="training-goal">Main training goal</label>
                  <input id="training-goal" minLength={2} maxLength={240} required placeholder="Example: improve football stamina and first touch" value={trainingGoal} onChange={(event) => setTrainingGoal(event.target.value)} />
                  <p className="auth-account-note">One account lets you find coaching and apply to coach. You can do both at any time.</p>
                </>
              )}
              <label htmlFor="account-email">Email</label>
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
                  <button className="auth-resend" type="button" disabled={emailActionBusy || !email.trim()} onClick={() => requestEmailAction("/api/auth/forgot-password", "Unable to request a password reset.")}>
                    {emailActionBusy ? "Sending…" : "Forgot password?"}
                  </button>
                  <button className="auth-resend" type="button" disabled={emailActionBusy || resendCooldown > 0 || !email.trim()} onClick={() => requestEmailAction("/api/auth/resend-confirmation", "Unable to resend the confirmation email.")}>
                    {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend confirmation email"}
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
