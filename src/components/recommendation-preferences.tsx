"use client";

import { FormEvent, useEffect, useState } from "react";

const sportOptions = ["Football", "Cricket", "Tennis", "Strength", "Swimming", "Badminton", "Boxing", "Yoga", "Running"];

export default function RecommendationPreferences() {
  const [interests, setInterests] = useState<string[]>([]);
  const [preferredLocation, setPreferredLocation] = useState("");
  const [maxBudgetPkr, setMaxBudgetPkr] = useState(3000);
  const [trainingGoal, setTrainingGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Beginner");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch("/api/preferences", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) return;
    const body = await response.json(); const value = body.preferences;
    setInterests(value.interests ?? []); setPreferredLocation(value.preferredLocation ?? ""); setMaxBudgetPkr(value.maxBudgetPkr ?? 3000); setTrainingGoal(value.trainingGoal ?? ""); setExperienceLevel(value.experienceLevel ?? "Beginner");
  }).catch(() => undefined); }, []);

  function toggle(sport: string) { setInterests((current) => current.includes(sport) ? current.filter((item) => item !== sport) : [...current, sport]); }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ interests, preferredLocation, maxBudgetPkr, trainingGoal, experienceLevel }) });
      const body = await response.json(); setMessage(response.ok ? body.message : body.error);
    } catch { setMessage("Preferences could not be saved."); }
    finally { setSaving(false); }
  }

  return <section className="recommendation-preferences" aria-labelledby="preferences-heading">
    <div><span>Recommendation profile</span><h2 id="preferences-heading">Tell CoachConnect what fits</h2><p>AI search uses these saved preferences with your current search. It never receives your email, password or payment fields.</p></div>
    <form onSubmit={save}>
      <fieldset><legend>Interests</legend><div className="preference-chips">{sportOptions.map((sport) => <label key={sport} className={interests.includes(sport) ? "is-selected" : ""}><input type="checkbox" checked={interests.includes(sport)} onChange={() => toggle(sport)} />{sport}</label>)}</div></fieldset>
      <div className="preference-fields">
        <label>Preferred city or online<input value={preferredLocation} maxLength={80} placeholder="Lahore or Online" onChange={(e) => setPreferredLocation(e.target.value)} /></label>
        <label>Maximum budget per session (PKR)<input type="number" min={500} max={1000000} step={100} value={maxBudgetPkr} onChange={(e) => setMaxBudgetPkr(Number(e.target.value))} /></label>
        <label>Current level<select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label className="preference-goal">Main goal<input value={trainingGoal} minLength={2} maxLength={240} required placeholder="Improve first touch and match fitness" onChange={(e) => setTrainingGoal(e.target.value)} /></label>
      </div>
      <button className="account-primary" disabled={saving || interests.length === 0}>{saving ? "Saving…" : "Save recommendation preferences"}</button>
      {message && <p role="status" className="account-message">{message}</p>}
    </form>
  </section>;
}
