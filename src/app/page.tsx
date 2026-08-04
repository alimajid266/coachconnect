"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";

const sports = [
  { id: "all", number: "01", name: "All coaches", detail: "Explore every specialty" },
  { id: "cricket", number: "02", name: "Cricket", detail: "Batting, bowling and fielding" },
  { id: "tennis", number: "03", name: "Tennis", detail: "Technique and match confidence" },
  { id: "strength", number: "04", name: "Strength", detail: "Movement and conditioning" },
];

const coaches = [
  {
    name: "Ayesha Khan",
    location: "Lahore",
    sport: "Cricket",
    specialty: "Beginner batting technique",
    rating: "Sample 4.9",
    price: "Rs 3,500",
    reason: "Sample match for beginner batting in Lahore, within budget.",
    badge: "Sample match",
    mode: "In person",
    image: "/images/coach-ayesha.jpg",
  },
  {
    name: "Hamza Siddiqui",
    location: "Karachi",
    sport: "Tennis",
    specialty: "Foundations and match play",
    rating: "Sample 4.8",
    price: "Rs 4,000",
    reason: "Sample beginner match with court equipment available.",
    badge: "Sample profile",
    mode: "In person",
    image: "/images/coach-hamza.jpg",
  },
  {
    name: "Sara Ahmed",
    location: "Islamabad",
    sport: "Strength",
    specialty: "Strength and conditioning",
    rating: "Sample 4.7",
    price: "Rs 3,000",
    reason: "Sample online match for athletes with limited equipment.",
    badge: "Sample profile",
    mode: "Online",
    image: "/images/coach-sara.jpg",
  },
];

export default function HomePage() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedCoach, setSelectedCoach] = useState<(typeof coaches)[number] | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [cityInput, setCityInput] = useState("any");
  const [appliedSearch, setAppliedSearch] = useState({ query: "", city: "any" });
  const [searchRan, setSearchRan] = useState(false);
  const profileDialogRef = useRef<HTMLElement>(null);
  const profileCloseRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedCoach) return;

    const trigger = profileTriggerRef.current;
    profileCloseRef.current?.focus();

    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedCoach(null);
        return;
      }

      if (event.key !== "Tab" || !profileDialogRef.current) return;
      const focusable = Array.from(
        profileDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKey);
    return () => {
      document.removeEventListener("keydown", handleDialogKey);
      trigger?.focus();
    };
  }, [selectedCoach]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedSport("all");
    setAppliedSearch({ query: queryInput.trim().toLowerCase(), city: cityInput });
    setSearchRan(true);
  };

  const visibleCoaches = coaches.filter((coach) => {
    const matchesSport = selectedSport === "all" || coach.sport.toLowerCase() === selectedSport;
    const matchesCity = appliedSearch.city === "any"
      || coach.location.toLowerCase() === appliedSearch.city;
    const searchable = [coach.name, coach.sport, coach.specialty, coach.location]
      .join(" ")
      .toLowerCase();
    const queryWords = appliedSearch.query.split(/\s+/).filter(Boolean);
    const matchesQuery = queryWords.every((word) => searchable.includes(word));
    return matchesSport && matchesCity && matchesQuery;
  });

  const searchCityLabel = appliedSearch.city === "any"
    ? "any city"
    : appliedSearch.city.charAt(0).toUpperCase() + appliedSearch.city.slice(1);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <nav className="container nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="CoachConnect home">Coach<span>Connect</span></a>
          <div className={`desktop-nav${mobileMenuOpen ? " mobile-open" : ""}`}>
            <a href="#coaches">Find a Coach</a>
            <a href="#how-it-works">How it works</a>
            <button className="nav-phase" type="button" disabled aria-label="Coach applications — Phase 2">Coach applications · Phase 2</button>
            <button className="nav-phase" type="button" disabled aria-label="Sign in — Phase 2">Sign in · Phase 2</button>
            <a className="button button-primary button-small" href="#search">Get Started</a>
          </div>
          <button
            className="menu-button"
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Sports coaching across Pakistan</p>
              <h1>Find the right coach. Reach your next goal.</h1>
              <p className="hero-lead">Explore sample cricket, tennis and strength profiles for focused one-to-one sessions—online or near you.</p>
              <p className="demo-notice"><strong>Demo preview:</strong> Sample profiles, names, ratings and match reasons are not real coaches or reviews.</p>
              <form className="search-console" id="search" onSubmit={handleSearch}>
                <div className="search-field search-main">
                  <label htmlFor="coach-search">What do you need?</label>
                  <input id="coach-search" name="query" placeholder="Cricket, tennis or strength" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} />
                </div>
                <div className="search-field">
                  <label htmlFor="search-city">City</label>
                  <select id="search-city" name="city" value={cityInput} onChange={(event) => setCityInput(event.target.value)}>
                    <option value="any">Any city</option><option value="lahore">Lahore</option><option value="karachi">Karachi</option><option value="islamabad">Islamabad</option>
                  </select>
                </div>
                <button className="button button-accent" type="submit">Find coaches</button>
              </form>
              <p className="search-example">Ordinary search is ready. Natural-language search arrives in Phase 3.</p>
              {searchRan && (
                <p className="search-status" role="status">
                  {visibleCoaches.length} sample {visibleCoaches.length === 1 ? "coach" : "coaches"} found
                  {appliedSearch.query ? ` for “${appliedSearch.query}”` : ""} in {searchCityLabel}.
                </p>
              )}
            </div>
            <div className="hero-photo" role="img" aria-label="Athlete training with a coach">
              <div className="hero-note"><strong>Clear matches.</strong><span>Private by design.</span></div>
            </div>
          </div>
        </section>

        <section className="section categories-section" aria-labelledby="sports-heading">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">Browse simply</p><h2 id="sports-heading">Start with your sport</h2></div>
              <p>Choose a category or use ordinary search. CoachConnect always shows what it matched.</p>
            </div>
            <div className="sport-grid" aria-label="Sport categories">
              {sports.map((sport) => (
                <button
                  className={`sport-card${selectedSport === sport.id ? " is-active" : ""}`}
                  type="button"
                  key={sport.id}
                  aria-pressed={selectedSport === sport.id}
                  onClick={() => {
                    setSelectedSport(sport.id);
                    setQueryInput("");
                    setCityInput("any");
                    setAppliedSearch({ query: "", city: "any" });
                    setSearchRan(false);
                  }}
                >
                  <span>{sport.number}</span>
                  <strong>{sport.name}</strong>
                  <small>{sport.detail}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section coaches-section" id="coaches" aria-labelledby="recommended-heading">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">Sample marketplace data</p><h2 id="recommended-heading">Sample coach profiles</h2></div>
              <p>These fictional profiles demonstrate future match explanations, privacy, pricing and service details.</p>
            </div>
            <div className="coach-grid">
              {visibleCoaches.map((coach) => (
                <article className="coach-card" key={coach.name} data-sport={coach.sport.toLowerCase()}>
                  <div className="coach-image-wrap">
                    <Image className="coach-image" src={coach.image} alt={`${coach.sport} training preview`} fill sizes="(max-width: 780px) 100vw, 33vw" />
                    <span className="match-badge">{coach.badge}</span>
                  </div>
                  <div className="coach-content">
                    <div className="coach-meta"><span>{coach.location} · {coach.sport}</span><span>★ {coach.rating}</span></div>
                    <h3>{coach.name}</h3>
                    <p className="specialty">{coach.specialty}</p>
                    <p className="match-reason">{coach.reason}</p>
                    <div className="coach-footer"><div><small>Starting from</small><strong>{coach.price}</strong></div><button type="button" className="text-button" aria-label={`View ${coach.name}'s profile`} onClick={(event) => { profileTriggerRef.current = event.currentTarget; setSelectedCoach(coach); }}>View profile</button></div>
                  </div>
                </article>
              ))}
              {visibleCoaches.length === 0 && (
                <p className="no-results" role="status">No sample coaches match those filters. Try another sport or city.</p>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-heading">
          <div className="container">
            <div className="section-heading compact"><div><p className="eyebrow">Three clear steps</p><h2 id="how-heading">How it works</h2></div></div>
            <div className="steps">
              <article><span>01</span><h3>Tell us what you need</h3><p>Choose a sport or use ordinary search. Natural-language search comes in Phase 3.</p></article>
              <article><span>02</span><h3>Compare suitable coaches</h3><p>Future verified profiles will show experience, price, service details and booking feedback.</p></article>
              <article><span>03</span><h3>Reserve a session</h3><p>Availability and reservations arrive in Phase 4. CoachConnect will not collect card details.</p></article>
            </div>
          </div>
        </section>

        <section className="section trust-section">
          <div className="container trust-panel">
            <div><p className="eyebrow light">Planned trust and privacy</p><h2>Confidence without oversharing.</h2></div>
            <ul>
              <li>Real coach profiles will require review before publication.</li>
              <li>Real reviews will require a completed CoachConnect booking.</li>
              <li>Exact meeting locations and private contact details will stay private.</li>
            </ul>
          </div>
        </section>

        <section className="section coach-cta" id="become-a-coach">
          <div className="container cta-row"><div><p className="eyebrow">For coaches</p><h2>Help athletes make meaningful progress.</h2></div><button className="button button-primary" type="button" disabled aria-label="Coach applications — Phase 2">Coach applications · Phase 2</button></div>
        </section>
      </main>

      {selectedCoach && (
        <div className="profile-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedCoach(null);
        }}>
          <section ref={profileDialogRef} className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-name">
            <button ref={profileCloseRef} className="profile-close" type="button" aria-label="Close coach profile" onClick={() => setSelectedCoach(null)}>×</button>
            <div className="profile-hero">
              <Image src={selectedCoach.image} alt="" fill sizes="700px" className="profile-image" />
            </div>
            <div className="profile-body">
              <div className="coach-meta"><span>Sample profile · {selectedCoach.location}</span><span>★ {selectedCoach.rating}</span></div>
              <h2 id="profile-name">{selectedCoach.name}</h2>
              <p className="specialty">{selectedCoach.sport} · {selectedCoach.specialty}</p>
              <p>This fictional profile demonstrates clear service details and privacy-safe location information. It does not represent a real person or active booking service.</p>
              <div className="service-box">
                <div className="service-title"><div><h3>One-to-one coaching session</h3><span>60 minutes · {selectedCoach.mode}</span></div><strong>{selectedCoach.price}</strong></div>
                <div className="service-details">
                  <section><h3>What&apos;s included</h3><ul><li>Technique assessment</li><li>Warm-up guidance</li><li>Coach-provided training aids</li></ul></section>
                  <section><h3>What to bring</h3><ul><li>Sports shoes and water</li><li>Your personal playing equipment</li></ul></section>
                  <section><h3>Facilities</h3><ul>{selectedCoach.mode === "Online" ? <><li>Private video-call link</li><li>Join from a quiet training space</li></> : <><li>Public sports training venue</li><li>Changing area and parking nearby</li></>}</ul></section>
                  <section><h3>Not included</h3><ul><li>Venue entry fee or transport</li><li>Medical or physiotherapy advice</li></ul></section>
                </div>
              </div>
              <p className="policy-note"><strong>Direct-payment cancellation:</strong> CoachConnect does not collect money or issue refunds. If an athlete pays a coach directly, a full refund is due when the athlete cancels at least 24 hours before, or whenever the coach cancels.</p>
              <button className="button button-accent" type="button" disabled aria-label="Availability — Phase 4">Availability · Phase 4</button>
            </div>
          </section>
        </div>
      )}

      <footer className="footer"><div className="container footer-row"><strong>CoachConnect Pakistan · Demo preview</strong><span>About · Safety · Cancellation · Privacy · Terms</span><span>Sample data · Prices in PKR · No payments collected</span></div></footer>
    </>
  );
}
