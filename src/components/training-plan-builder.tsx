"use client";

import { FormEvent, useState } from "react";

type Plan = { title: string; summary: string; safetyNote: string; weeks: number; sessions: Array<{ day: string; focus: string; warmup: string[]; workout: string[]; cooldown: string[]; minutes: number }> };

export default function TrainingPlanBuilder() {
  const [sport, setSport] = useState("Football");
  const [goal, setGoal] = useState("Improve fitness and technique");
  const [level, setLevel] = useState("Beginner");
  const [equipment, setEquipment] = useState("Open space, water bottle");
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [minutesPerSession, setMinutesPerSession] = useState(45);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/ai/training-plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sport, goal, level, equipment, sessionsPerWeek, minutesPerSession }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Training plan could not be created.");
      setPlan(body.plan); setSource(body.generatedBy);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Training plan could not be created."); }
    finally { setBusy(false); }
  }

  return <section className="training-plan-studio" aria-labelledby="training-plan-heading">
    <div className="training-plan-intro"><span>AI training studio</span><h2 id="training-plan-heading">Build a four-week starter plan</h2><p>Choose a sport, goal and realistic schedule. CoachConnect creates a practical outline. It is not medical or rehabilitation advice.</p></div>
    <form className="training-plan-form" onSubmit={submit}>
      <label>Sport<select value={sport} onChange={(e) => setSport(e.target.value)}>{["Football", "Cricket", "Tennis", "Strength", "Running", "Swimming"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Experience<select value={level} onChange={(e) => setLevel(e.target.value)}>{["Beginner", "Intermediate", "Advanced"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="plan-wide">Your goal<input value={goal} maxLength={140} onChange={(e) => setGoal(e.target.value)} required /></label>
      <label className="plan-wide">Equipment available<input value={equipment} maxLength={160} onChange={(e) => setEquipment(e.target.value)} required /></label>
      <label>Sessions each week<select value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(Number(e.target.value))}>{[2, 3, 4, 5].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Minutes per session<select value={minutesPerSession} onChange={(e) => setMinutesPerSession(Number(e.target.value))}>{[30, 45, 60, 75, 90].map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="account-primary plan-wide" disabled={busy}>{busy ? "Building your plan…" : "Generate training plan"}</button>
    </form>
    {message && <p className="account-message" role="alert">{message}</p>}
    {plan && <div className="training-plan-result"><header><div><small>{plan.weeks} weeks · {source}</small><h3>{plan.title}</h3><p>{plan.summary}</p></div><span>Starter plan</span></header><div className="training-plan-days">{plan.sessions.map((session, index) => <article key={`${session.day}-${index}`}><div><strong>{session.day}</strong><span>{session.minutes} min</span></div><h4>{session.focus}</h4><p><b>Warm up:</b> {session.warmup.join(" · ")}</p><p><b>Workout:</b> {session.workout.join(" · ")}</p><p><b>Cool down:</b> {session.cooldown.join(" · ")}</p></article>)}</div><p className="training-plan-safety">{plan.safetyNote}</p></div>}
  </section>;
}
