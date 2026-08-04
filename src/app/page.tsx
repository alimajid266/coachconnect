"use client";

import Image from "next/image";
import { type FormEvent, type MouseEvent, useEffect, useRef, useState } from "react";

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
    rating: "4.9",
    price: "Rs 3,500",
    reason: "Strong fit for beginner batting in Lahore and this price range.",
    badge: "Top match",
    mode: "In person",
    availability: ["Saturday", "Sunday"],
    image: "/images/coach-ayesha.jpg",
  },
  {
    name: "Hamza Siddiqui",
    location: "Karachi",
    sport: "Tennis",
    specialty: "Foundations and match play",
    rating: "4.8",
    price: "Rs 4,000",
    reason: "Beginner-friendly tennis coaching with court equipment available.",
    badge: "Great fit",
    mode: "In person",
    availability: ["Tuesday", "Saturday"],
    image: "/images/coach-hamza.jpg",
  },
  {
    name: "Sara Ahmed",
    location: "Islamabad",
    sport: "Strength",
    specialty: "Strength and conditioning",
    rating: "4.7",
    price: "Rs 3,000",
    reason: "Online strength coaching designed for limited equipment.",
    badge: "Online",
    mode: "Online",
    availability: ["Monday", "Wednesday"],
    image: "/images/coach-sara.jpg",
  },
  {
    name: "Zainab Malik",
    location: "Karachi",
    sport: "Cricket",
    specialty: "Fast bowling and fielding",
    rating: "4.8",
    price: "Rs 3,800",
    reason: "Focused cricket coaching for improving bowling rhythm and fielding speed.",
    badge: "Cricket skills",
    mode: "In person",
    availability: ["Friday", "Saturday"],
    image: "/images/coach-zainab.jpg",
  },
  {
    name: "Omar Farooq",
    location: "Islamabad",
    sport: "Tennis",
    specialty: "Serve technique and footwork",
    rating: "4.7",
    price: "Rs 2,800",
    reason: "Flexible tennis coaching for serve mechanics and confident movement.",
    badge: "Flexible",
    mode: "Online",
    availability: ["Saturday", "Sunday"],
    image: "/images/coach-omar.jpg",
  },
  {
    name: "Bilal Raza",
    location: "Lahore",
    sport: "Strength",
    specialty: "Athletic strength and mobility",
    rating: "4.9",
    price: "Rs 3,200",
    reason: "Athlete-focused strength sessions balancing power, control and mobility.",
    badge: "Athletic prep",
    mode: "In person",
    availability: ["Monday", "Thursday"],
    image: "/images/coach-bilal.jpg",
  },
];

type SearchFilters = {
  rawQuery: string;
  sport: string | null;
  city: string;
  level: string | null;
  mode: string | null;
  budget: number | null;
  rating: number | null;
  availability: string | null;
  terms: string[];
};

const sportAliases = {
  cricket: ["cricket", "batting", "bowling", "fielding"],
  tennis: ["tennis", "serve", "racquet", "racket"],
  strength: ["strength", "fitness", "gym", "conditioning", "mobility"],
};
const searchableCities = ["lahore", "karachi", "islamabad"];
const searchableLevels = ["beginner", "intermediate", "advanced"];
const searchableDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const searchStopWords = new Set([
  "a", "an", "and", "at", "coach", "coaching", "for", "in", "me", "my", "near",
  "of", "on", "please", "rs", "session", "sessions", "the", "trainer", "under", "up",
  "with", "within",
]);

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const formatRupees = (value: number) => `Rs ${value.toLocaleString("en-PK")}`;
const coachPrice = (price: string) => Number(price.replace(/\D/g, ""));

function parseSearch(query: string, selectedCity: string): SearchFilters {
  const rawQuery = query.trim();
  const normalized = rawQuery.toLowerCase();
  const sport = Object.entries(sportAliases).find(([, aliases]) =>
    aliases.some((alias) => normalized.includes(alias)),
  )?.[0] ?? null;
  const queryCity = searchableCities.find((city) => normalized.includes(city));
  const level = searchableLevels.find((entry) => normalized.includes(entry)) ?? null;
  const mode = /\bonline\b/.test(normalized)
    ? "online"
    : /\b(in[ -]?person|face[ -]?to[ -]?face|local)\b/.test(normalized)
      ? "in person"
      : null;
  const budgetMatch = normalized.match(/(?:under|below|up\s*to|max(?:imum)?|budget(?:\s+of)?)\D{0,12}(\d[\d,]*)/);
  const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : null;
  const ratingMatch = normalized.match(/(?:rated?|rating|at\s+least)\D{0,8}([1-5](?:\.\d)?)/)
    ?? normalized.match(/([1-5](?:\.\d)?)\s*(?:\+|stars?)/);
  const rating = ratingMatch ? Number(ratingMatch[1]) : null;
  const availability = searchableDays.find((day) => normalized.includes(day)) ?? null;
  const recognizedWords = new Set([
    ...Object.values(sportAliases).flat(),
    ...searchableCities,
    ...searchableLevels,
    ...searchableDays,
    "online", "person", "face", "local", "below", "to", "max", "maximum", "budget",
    "available", "availability", "rated", "rating", "least", "stars", "star",
  ]);
  const terms = normalized
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !searchStopWords.has(word) && !recognizedWords.has(word));

  if (level) terms.push(level);

  return {
    rawQuery,
    sport,
    city: queryCity ?? selectedCity,
    level,
    mode,
    budget: Number.isFinite(budget) ? budget : null,
    rating: Number.isFinite(rating) ? rating : null,
    availability,
    terms: [...new Set(terms)],
  };
}

const emptySearch = parseSearch("", "any");

export default function HomePage() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedCoach, setSelectedCoach] = useState<(typeof coaches)[number] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [cityInput, setCityInput] = useState("any");
  const [appliedSearch, setAppliedSearch] = useState<SearchFilters>(emptySearch);
  const [searchRan, setSearchRan] = useState(false);
  const profileDialogRef = useRef<HTMLElement>(null);
  const profileCloseRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSectionNavigation = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
    setMobileMenuOpen(false);
  };

  const handleSearchNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    handleSectionNavigation(event, "top");
    searchInputRef.current?.focus({ preventScroll: true });
  };

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
    setAppliedSearch(parseSearch(queryInput, cityInput));
    setSearchRan(true);
  };

  const visibleCoaches = coaches.filter((coach) => {
    const matchesSport = selectedSport === "all" || coach.sport.toLowerCase() === selectedSport;
    const matchesSearchSport = !appliedSearch.sport
      || coach.sport.toLowerCase() === appliedSearch.sport;
    const matchesCity = appliedSearch.city === "any"
      || coach.location.toLowerCase() === appliedSearch.city;
    const matchesMode = !appliedSearch.mode || coach.mode.toLowerCase() === appliedSearch.mode;
    const matchesBudget = !appliedSearch.budget || coachPrice(coach.price) <= appliedSearch.budget;
    const matchesRating = !appliedSearch.rating || Number(coach.rating) >= appliedSearch.rating;
    const matchesAvailability = !appliedSearch.availability
      || coach.availability.some((day) => day.toLowerCase() === appliedSearch.availability);
    const searchable = [coach.name, coach.sport, coach.specialty, coach.location, coach.reason, coach.mode]
      .join(" ")
      .toLowerCase();
    const matchesQuery = appliedSearch.terms.every((word) => searchable.includes(word));
    return matchesSport && matchesSearchSport && matchesCity && matchesMode
      && matchesBudget && matchesRating && matchesAvailability && matchesQuery;
  });

  const searchCityLabel = appliedSearch.city === "any"
    ? "any city"
    : titleCase(appliedSearch.city);
  const interpretedFilters = [
    appliedSearch.sport && { key: "sport", label: titleCase(appliedSearch.sport) },
    appliedSearch.city !== "any" && { key: "city", label: titleCase(appliedSearch.city) },
    appliedSearch.level && { key: "level", label: titleCase(appliedSearch.level) },
    appliedSearch.mode && { key: "mode", label: titleCase(appliedSearch.mode) },
    appliedSearch.budget && { key: "budget", label: `Up to ${formatRupees(appliedSearch.budget)}` },
    appliedSearch.rating && { key: "rating", label: `${appliedSearch.rating.toFixed(1)}+ rating` },
    appliedSearch.availability && { key: "availability", label: titleCase(appliedSearch.availability) },
  ].filter(Boolean) as { key: keyof SearchFilters; label: string }[];

  const removeSearchFilter = (key: keyof SearchFilters) => {
    setAppliedSearch((current) => {
      if (key === "city") {
        setCityInput("any");
        return { ...current, city: "any" };
      }
      if (key === "budget") return { ...current, budget: null };
      if (key === "rating") return { ...current, rating: null };
      if (key === "availability") return { ...current, availability: null };
      if (key === "level") {
        return { ...current, level: null, terms: current.terms.filter((term) => term !== current.level) };
      }
      if (key === "sport" || key === "mode") return { ...current, [key]: null };
      return current;
    });
  };

  const availableSlots = selectedCoach
    ? selectedCoach.availability.flatMap((day) => [`${day} · 10:00 AM`, `${day} · 5:00 PM`])
    : [];

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <nav className="container nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="CoachConnect home">Coach<span>Connect</span></a>
          <div className={`desktop-nav${mobileMenuOpen ? " mobile-open" : ""}`}>
            <a href="#coaches" onClick={(event) => handleSectionNavigation(event, "coaches")}>Find a Coach</a>
            <a href="#how-it-works" onClick={(event) => handleSectionNavigation(event, "how-it-works")}>How it works</a>
            <a className="nav-phase" href="#become-a-coach" onClick={(event) => handleSectionNavigation(event, "become-a-coach")}>Coach applications</a>
            <a className="nav-phase" href="/account">Sign in</a>
            <a className="button button-small nav-cta" href="#top" onClick={handleSearchNavigation}>Search coaches <span aria-hidden="true">↓</span></a>
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
          <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow light">Pakistan&apos;s coaching marketplace</p>
              <h1><span>Train smarter.</span><span className="headline-accent">Play bolder.</span></h1>
              <p className="hero-lead">Find focused cricket, tennis and strength coaching built for your level, your city and your next breakthrough.</p>

              <form className="search-console" id="search" onSubmit={handleSearch}>
                <div className="search-field search-main">
                  <label htmlFor="coach-search">What do you need?</label>
                  <input ref={searchInputRef} id="coach-search" name="query" placeholder="Cricket, tennis or strength" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} />
                </div>
                <div className="search-field">
                  <label htmlFor="search-city">City</label>
                  <select id="search-city" name="city" value={cityInput} onChange={(event) => setCityInput(event.target.value)}>
                    <option value="any">Any city</option><option value="lahore">Lahore</option><option value="karachi">Karachi</option><option value="islamabad">Islamabad</option>
                  </select>
                </div>
                <button className="button button-accent" type="submit">Find coaches <span aria-hidden="true">→</span></button>
              </form>
              <p className="search-example">Try “beginner tennis in Karachi under Rs 4,500” or search by name.</p>
              {searchRan && interpretedFilters.length > 0 && (
                <div className="interpreted-filters" role="region" aria-label="Interpreted search filters">
                  <strong>We understood</strong>
                  <div>
                    {interpretedFilters.map((filter) => (
                      <button key={filter.key} type="button" onClick={() => removeSearchFilter(filter.key)} aria-label={`Remove ${filter.label} filter`}>
                        <span>{filter.label}</span><b aria-hidden="true">×</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {searchRan && (
                <p className="search-status" role="status">
                  {visibleCoaches.length} {visibleCoaches.length === 1 ? "coach" : "coaches"} found
                  {appliedSearch.sport ? ` for ${appliedSearch.sport}` : ""} in {searchCityLabel}.
                </p>
              )}
            </div>
            <div className="hero-stage">
              <div className="hero-orbit" aria-hidden="true" />
              <div className="hero-photo" role="img" aria-label="Athlete training with a coach" />
              <div className="hero-chip hero-chip-top" aria-label="One-to-one coaching — built around you"><span aria-hidden="true">01</span><strong>One-to-one coaching</strong><small>Built around you</small></div>
              <div className="hero-chip hero-chip-bottom"><span className="pulse-dot" /><strong>Pakistan-wide energy</strong><small>Local, private, focused</small></div>
              <div className="hero-wordmark" aria-hidden="true">MOVE</div>
            </div>
          </div>
        </section>

        <section className="momentum-strip" aria-label="CoachConnect launch focus">
          <div className="container momentum-grid">
            <div><span>Launch focus</span><strong>3 focused sports</strong></div>
            <p>Karachi <b>•</b> Lahore <b>•</b> Islamabad</p>
            <div className="momentum-promise"><span>Built for progress</span><strong>One clear next step →</strong></div>
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
                    setAppliedSearch(emptySearch);
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
              <div><p className="eyebrow">Find your fit</p><h2 id="recommended-heading">Recommended coaches</h2></div>
              <p>Compare coaching specialties, locations, pricing and session formats.</p>
            </div>
            <div className="coach-grid">
              {visibleCoaches.map((coach) => (
                <article className="coach-card" key={coach.name} data-sport={coach.sport.toLowerCase()}>
                  <div className="coach-image-wrap">
                    <Image className="coach-image" src={coach.image} alt={`${coach.sport} training`} fill sizes="(max-width: 780px) 100vw, 33vw" />
                    <span className="match-badge">{coach.badge}</span>
                  </div>
                  <div className="coach-content">
                    <div className="coach-meta"><span>{coach.location} · {coach.sport}</span><span>★ {coach.rating}</span></div>
                    <h3>{coach.name}</h3>
                    <p className="specialty">{coach.specialty}</p>
                    <p className="match-reason">{coach.reason}</p>
                    <div className="coach-footer"><div><small>Starting from</small><strong>{coach.price}</strong></div><button type="button" className="text-button" aria-label={`View ${coach.name}'s profile`} onClick={(event) => { profileTriggerRef.current = event.currentTarget; setSelectedSlot(null); setSelectedCoach(coach); }}>View profile</button></div>
                  </div>
                </article>
              ))}
              {visibleCoaches.length === 0 && (
                <p className="no-results" role="status">No coaches match those filters. Try another sport or city.</p>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-heading">
          <div className="container">
            <div className="section-heading compact"><div><p className="eyebrow">Three clear steps</p><h2 id="how-heading">How it works</h2></div></div>
            <div className="steps">
              <article><span>01</span><h3>Tell us what you need</h3><p>Choose your sport, city and coaching goal.</p></article>
              <article><span>02</span><h3>Compare suitable coaches</h3><p>Review experience, price, service details and coaching format.</p></article>
              <article><span>03</span><h3>Reserve a session</h3><p>Choose an available time and confirm the session with your coach.</p></article>
            </div>
          </div>
        </section>

        <section className="section trust-section">
          <div className="container trust-panel">
            <div><p className="eyebrow light">Trust and privacy</p><h2>Confidence without oversharing.</h2></div>
            <ul>
              <li>Coach profiles require review before publication.</li>
              <li>Reviews require a completed CoachConnect booking.</li>
              <li>Exact meeting locations and private contact details will stay private.</li>
            </ul>
          </div>
        </section>

        <section className="section coach-cta" id="become-a-coach">
          <div className="container cta-row"><div><p className="eyebrow">For coaches</p><h2>Help athletes make meaningful progress.</h2></div><a className="button button-primary" href="/account">Coach applications</a></div>
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
              <div className="coach-meta"><span>{selectedCoach.location} · {selectedCoach.mode}</span><span>★ {selectedCoach.rating}</span></div>
              <h2 id="profile-name">{selectedCoach.name}</h2>
              <p className="specialty">{selectedCoach.sport} · {selectedCoach.specialty}</p>
              <p>Review the session format, what is included and the privacy-safe location information before booking.</p>
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
              <section className="availability-panel" aria-labelledby="availability-heading">
                <div className="availability-heading">
                  <div><p className="eyebrow">Choose a time</p><h3 id="availability-heading">Weekly availability</h3></div>
                  <span>60-minute session</span>
                </div>
                <div className="slot-grid">
                  {availableSlots.map((slot) => {
                    const [day, time] = slot.split(" · ");
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={selectedSlot === slot ? "is-selected" : ""}
                        aria-pressed={selectedSlot === slot}
                        aria-label={`Select ${day} at ${time}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <strong>{day}</strong><span>{time}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedSlot && (
                  <div className="booking-handoff">
                    <p role="status"><strong>{selectedSlot.replace(" · ", " at ")} selected.</strong> Sign in to verify the live slot and reserve it.</p>
                    <a className="button button-accent" href="/account">Sign in to reserve</a>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}

      <footer className="footer"><div className="container footer-row"><strong>CoachConnect Pakistan</strong><span>About · Safety · Cancellation · Privacy · Terms</span><span>Prices in PKR · Direct coach payments</span></div></footer>
    </>
  );
}
