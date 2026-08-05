"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CoachMap from "@/app/coaches/coach-map";
import { allSports, coaches, formatCoachPrice, type Coach } from "@/lib/coaches";

type SessionUser = {
  id: string;
  displayName: string;
  email: string;
  role: "ATHLETE" | "COACH" | "ADMIN";
};

type Props = {
  initialQuery: string;
  initialCity: string;
};

type SortOption = "recommended" | "rating" | "price-low" | "price-high";

export default function CoachCatalog({ initialQuery, initialCity }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [sport, setSport] = useState("any");
  const [mode, setMode] = useState("any");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [showMap, setShowMap] = useState(false);
  const [user, setUser] = useState<SessionUser | null>();
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((result: { user: SessionUser | null }) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => { active = false; };
  }, []);

  const visibleCoaches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const queryTerms = normalizedQuery
      .split(/\s+/)
      .filter((term) => term && !["a", "coach", "coaches", "coaching", "for", "the"].includes(term));
    const matches = coaches.filter((coach) => {
      const searchable = [coach.name, ...coach.sports, coach.specialty, coach.location, coach.mode]
        .join(" ")
        .toLowerCase();
      return (queryTerms.length === 0 || queryTerms.every((term) => searchable.includes(term)))
        && (city === "any" || coach.location === city)
        && (sport === "any" || coach.sports.includes(sport as (typeof coach.sports)[number]))
        && (mode === "any" || coach.mode === mode);
    });

    return [...matches].sort((first, second) => {
      if (sort === "rating") return second.rating - first.rating || second.reviewCount - first.reviewCount;
      if (sort === "price-low") return first.price - second.price;
      if (sort === "price-high") return second.price - first.price;
      return first.rank - second.rank;
    });
  }, [city, mode, query, sort, sport]);

  const clearFilters = () => {
    setQuery("");
    setCity("any");
    setSport("any");
    setMode("any");
    setSort("recommended");
  };

  return (
    <div className="catalog-page">
      <a className="skip-link" href="#catalog-results">Skip to coach results</a>
      <header className="catalog-header">
        <Link className="catalog-brand" href="/">CoachConnect</Link>
        <nav aria-label="Catalog navigation">
          <Link href="/">Home</Link>
          {user === undefined
            ? <span className="catalog-session-state">Checking account…</span>
            : user
              ? <Link className="catalog-account-link" href="/dashboard">Dashboard</Link>
              : <Link className="catalog-account-link" href="/account">Sign in</Link>}
        </nav>
      </header>

      <main className="catalog-main" id="catalog-results">
        <section className="catalog-intro">
          <div>
            <p>Coach catalog</p>
            <h1>Find a coach</h1>
            <span>Browse coaches across every sport, city and training format.</span>
          </div>
        </section>

        <section className="catalog-controls" aria-label="Coach filters">
          <label className="catalog-search">
            <span>Search</span>
            <input
              type="search"
              placeholder="Name, sport or specialty"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span>City</span>
            <select aria-label="City" value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="any">Any city</option>
              <option value="Islamabad">Islamabad</option>
              <option value="Karachi">Karachi</option>
              <option value="Lahore">Lahore</option>
            </select>
          </label>
          <label>
            <span>Sport</span>
            <select aria-label="Sport" value={sport} onChange={(event) => setSport(event.target.value)}>
              <option value="any">Any sport</option>
              {allSports.map((entry) => <option value={entry} key={entry}>{entry}</option>)}
            </select>
          </label>
          <label>
            <span>Format</span>
            <select aria-label="Format" value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="any">Any format</option>
              <option value="In person">In person</option>
              <option value="Online">Online</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
          <button type="button" onClick={clearFilters}>Clear filters</button>
        </section>

        <div className="catalog-results-heading">
          <p role="status">{visibleCoaches.length} {visibleCoaches.length === 1 ? "coach" : "coaches"}</p>
          <div>
            <span>Available coaches</span>
            <button type="button" onClick={() => setShowMap((current) => !current)}>
              {showMap ? "Hide map" : "Show map"}
            </button>
          </div>
        </div>

        <div className={`catalog-content${showMap ? " catalog-content-with-map" : ""}`}>
          {showMap && <CoachMap city={city} coaches={visibleCoaches} onViewProfile={setSelectedCoach} />}
          {visibleCoaches.length > 0 ? (
          <section className="catalog-grid" aria-label="Coach results">
            {visibleCoaches.map((coach) => (
              <article className="catalog-card" key={coach.id}>
                <div className="catalog-card-image">
                  <Image
                    src={coach.image}
                    alt={`${coach.name}, ${coach.sports.join(" and ")} coach`}
                    fill
                    sizes="(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 33vw"
                  />
                  <span>{coach.badge}</span>
                </div>
                <div className="catalog-card-body">
                  <div className="catalog-card-title">
                    <h2>{coach.name}</h2>
                    <span aria-label={`${coach.rating} out of 5 stars`}>★ {coach.rating}</span>
                  </div>
                  <p>{coach.coordinates ? `${coach.area}, ` : ""}{coach.location} · {coach.sports.join(" · ")} · {coach.mode}</p>
                  <strong>{coach.specialty}</strong>
                  <div className="catalog-card-footer">
                    <span><b>{formatCoachPrice(coach.price)}</b> per session</span>
                    <span>{coach.reviewCount} reviews · {coach.lessonCount} lessons</span>
                  </div>
                  <button
                    className="catalog-profile-button"
                    type="button"
                    aria-label={`View ${coach.name}'s profile`}
                    onClick={() => setSelectedCoach(coach)}
                  >
                    View profile
                  </button>
                </div>
              </article>
            ))}
          </section>
          ) : (
          <section className="catalog-empty">
            <h2>No coaches match these filters</h2>
            <p>Clear the filters to see every approved coach again.</p>
            <button type="button" onClick={clearFilters}>Show all coaches</button>
          </section>
          )}
        </div>
      </main>

      {selectedCoach && (
        <div className="catalog-profile-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedCoach(null);
        }}>
          <section className="catalog-profile" role="dialog" aria-modal="true" aria-labelledby="catalog-profile-name">
            <button className="catalog-profile-close" type="button" aria-label="Close coach profile" onClick={() => setSelectedCoach(null)}>×</button>
            <div className="catalog-profile-image">
              <Image src={selectedCoach.image} alt="" fill sizes="(max-width: 680px) 100vw, 520px" />
            </div>
            <div className="catalog-profile-body">
              <p>{selectedCoach.coordinates ? `${selectedCoach.area}, ` : ""}{selectedCoach.location} · {selectedCoach.sports.join(" · ")} · {selectedCoach.mode}</p>
              <h2 id="catalog-profile-name">{selectedCoach.name}</h2>
              <strong>{selectedCoach.specialty}</strong>
              <div className="catalog-profile-sports" aria-label="Sports coached">
                {selectedCoach.sports.map((entry) => <span key={entry}>{entry}</span>)}
              </div>
              <div className="catalog-profile-summary">
                <span><b>★ {selectedCoach.rating}</b>{selectedCoach.reviewCount} reviews</span>
                <span aria-label={`${selectedCoach.lessonCount} lessons taught`}><b>{selectedCoach.lessonCount}</b>lessons taught</span>
                <span><b>{formatCoachPrice(selectedCoach.price)}</b>60-minute session</span>
              </div>
              <section className="catalog-profile-about">
                <h3>About {selectedCoach.name.split(" ")[0]}</h3>
                <p>{selectedCoach.bio}</p>
              </section>
              <div className="catalog-profile-fit-grid">
                <section className="catalog-profile-fit">
                  <h3>Who {selectedCoach.name.split(" ")[0]} teaches</h3>
                  <div>{selectedCoach.audiences.map((audience) => <span key={audience}>{audience}</span>)}</div>
                </section>
                <section className="catalog-profile-fit">
                  <h3>Levels supported</h3>
                  <div>{selectedCoach.levels.map((level) => <span key={level}>{level}</span>)}</div>
                </section>
              </div>
              <div className="catalog-profile-details">
                <section>
                  <h3>Experience and credentials</h3>
                  <strong>{selectedCoach.experience}</strong>
                  <ul>{selectedCoach.credentials.map((credential) => <li key={credential}>{credential}</li>)}</ul>
                </section>
                <section>
                  <h3>Coaching style</h3>
                  <p>{selectedCoach.coachingStyle}</p>
                  <span><b>Languages</b>{selectedCoach.languages.join(" · ")}</span>
                </section>
              </div>
              <section className="catalog-profile-plan">
                <h3>Lesson plan</h3>
                <ol>
                  {selectedCoach.lessonPlan.map((step) => (
                    <li key={step.title}>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="catalog-profile-availability">
                <h3>Weekly availability</h3>
                <div>{selectedCoach.availability.map((day) => <span key={day}>{day}</span>)}</div>
              </section>
              <section className="catalog-profile-faq">
                <h3>Frequently asked questions</h3>
                <div>
                  {selectedCoach.faqs.map((faq) => (
                    <details key={faq.question}>
                      <summary>{faq.question}</summary>
                      <p>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
              <Link className="catalog-profile-reserve" href={user ? "/dashboard" : "/account"}>
                {user ? "Continue to reserve" : "Sign in to reserve"}
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
