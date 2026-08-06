"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import CoachLocationPreview from "@/app/coaches/coach-location-preview";
import CoachMap from "@/app/coaches/coach-map";
import SiteHeader from "@/components/site-header";
import { allSports, coaches as demoCoaches, formatCoachPrice, type Coach } from "@/lib/coaches";

type Props = {
  initialQuery: string;
  initialCity: string;
  initialCoaches?: Coach[];
};

type SortOption = "recommended" | "rating" | "price-low" | "price-high";

export default function CoachCatalog({ initialQuery, initialCity, initialCoaches = [] }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [sport, setSport] = useState("any");
  const [mode, setMode] = useState("any");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [showMap, setShowMap] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [approvedCoaches, setApprovedCoaches] = useState<Coach[]>(initialCoaches);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  function openCoach(coach: Coach) {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedCoach(coach);
  }

  function closeCoach() {
    setSelectedCoach(null);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coaches", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog unavailable");
        const body = await response.json() as { coaches?: unknown };
        if (!Array.isArray(body.coaches)) throw new Error("invalid catalog response");
        if (!cancelled) {
          setApprovedCoaches(body.coaches as Coach[]);
          setCatalogStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogStatus("unavailable");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedCoach) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedCoach(null);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ));
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
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [selectedCoach]);

  const catalogCoaches = useMemo(() => {
    const byId = new Map<string, Coach>(demoCoaches.map((coach) => [coach.id, coach]));
    for (const coach of approvedCoaches) byId.set(coach.id, coach);
    return Array.from(byId.values());
  }, [approvedCoaches]);

  const availableCities = useMemo(() => Array.from(new Set(
    catalogCoaches.filter((coach) => coach.location !== "Online").map((coach) => coach.location),
  )).sort(), [catalogCoaches]);

  const activeCity = catalogStatus === "ready" && city !== "any" && !availableCities.includes(city)
    ? "any"
    : city;

  const visibleCoaches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const queryTerms = normalizedQuery
      .split(/\s+/)
      .filter((term) => term && !["a", "coach", "coaches", "coaching", "for", "the"].includes(term));
    const matches = catalogCoaches.filter((coach) => {
      const searchable = [coach.name, ...coach.sports, coach.specialty, coach.location, coach.mode]
        .join(" ")
        .toLowerCase();
      return (queryTerms.length === 0 || queryTerms.every((term) => searchable.includes(term)))
        && (activeCity === "any" || coach.location === activeCity)
        && (sport === "any" || coach.sports.includes(sport as (typeof coach.sports)[number]))
        && (mode === "any"
          || (mode === "Online" && coach.offersOnline)
          || (mode === "In person" && coach.offersInPerson));
    });

    return [...matches].sort((first, second) => {
      let comparison = 0;
      if (sort === "rating") comparison = (second.rating ?? -1) - (first.rating ?? -1) || second.reviewCount - first.reviewCount;
      else if (sort === "price-low") comparison = first.price - second.price;
      else if (sort === "price-high") comparison = second.price - first.price;
      else comparison = first.rank - second.rank;
      return comparison || String(first.id).localeCompare(String(second.id));
    });
  }, [activeCity, catalogCoaches, mode, query, sort, sport]);

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
      <SiteHeader />

      <main className="catalog-main" id="catalog-results">
        <section className="catalog-intro">
          <div>
            <p>Coach catalog</p>
            <h1>Find a coach</h1>
            <span>Browse approved coaches and interactive demo profiles across every sport, city and training format.</span>
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
            <select aria-label="City" value={activeCity} onChange={(event) => setCity(event.target.value)}>
              <option value="any">Any city</option>
              {availableCities.map((entry) => <option value={entry} key={entry}>{entry}</option>)}
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
          <p role="status">{catalogStatus === "loading" && catalogCoaches.length === 0
            ? "Loading coaches"
            : `${visibleCoaches.length} ${visibleCoaches.length === 1 ? "coach" : "coaches"}`}</p>
          <div>
            <span>Available coaches</span>
            <button type="button" onClick={() => setShowMap((current) => !current)}>
              {showMap ? "Hide map" : "Show map"}
            </button>
          </div>
        </div>

        {catalogStatus === "unavailable" && (
          <p className="catalog-data-warning" role="alert">The approved coach catalog is temporarily unavailable. Please refresh and try again.</p>
        )}

        <div className={`catalog-content${showMap ? " catalog-content-with-map" : ""}`}>
          {showMap && <CoachMap city={city} coaches={visibleCoaches} onViewProfile={openCoach} />}
          {visibleCoaches.length > 0 ? (
          <section className="catalog-grid" aria-label="Coach results">
            {visibleCoaches.map((coach) => (
              <article className="catalog-card" key={coach.id}>
                <div className="catalog-card-image">
                  {coach.image ? (
                    <Image
                      src={coach.image}
                      alt={`${coach.name}, ${coach.sports.join(" and ")} coach`}
                      fill
                      sizes="(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="catalog-coach-placeholder" aria-hidden="true">
                      {coach.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                    </div>
                  )}
                  <span>{coach.badge}</span>
                </div>
                <div className="catalog-card-body">
                  <div className="catalog-card-title">
                    <h2>{coach.name}</h2>
                    {coach.rating === null
                      ? <span>New</span>
                      : <span aria-label={`${coach.rating} out of 5 stars`}>★ {coach.rating}</span>}
                  </div>
                  <p>{coach.area !== "Online" && coach.area !== coach.location ? `${coach.area}, ` : ""}{coach.location} · {coach.sports.join(" · ")} · {coach.mode}</p>
                  <strong>{coach.specialty}</strong>
                  <div className="catalog-card-footer">
                    <span><b>{formatCoachPrice(coach.price)}</b> per session</span>
                    <span>{coach.rating === null ? "Newly approved" : `${coach.reviewCount} reviews · ${coach.lessonCount} lessons`}</span>
                  </div>
                  <button
                    className="catalog-profile-button"
                    type="button"
                    aria-label={`View ${coach.name}'s profile`}
                    onClick={() => openCoach(coach)}
                  >
                    View profile
                  </button>
                </div>
              </article>
            ))}
          </section>
          ) : catalogStatus === "loading" ? (
          <section className="catalog-empty">
            <h2>Loading approved coaches</h2>
            <p>Please wait while the latest coach profiles are loaded.</p>
          </section>
          ) : catalogStatus === "unavailable" ? (
          <section className="catalog-empty">
            <h2>Coach catalog temporarily unavailable</h2>
            <p>Refresh the page to try loading approved coach profiles again.</p>
          </section>
          ) : (
          <section className="catalog-empty">
            <h2>No coaches match these filters</h2>
            <p>Clear the filters to see every coach profile again.</p>
            <button type="button" onClick={clearFilters}>Show all coaches</button>
          </section>
          )}
        </div>
      </main>

      {selectedCoach && (
        <div className="catalog-profile-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCoach();
        }}>
          <section ref={dialogRef} className="catalog-profile" role="dialog" aria-modal="true" aria-labelledby="catalog-profile-name">
            <button ref={closeButtonRef} className="catalog-profile-close" type="button" aria-label="Close coach profile" onClick={closeCoach}>×</button>
            <div className="catalog-profile-image">
              {selectedCoach.image ? (
                <Image src={selectedCoach.image} alt="" fill sizes="(max-width: 680px) 100vw, 520px" />
              ) : (
                <div className="catalog-coach-placeholder" aria-hidden="true">
                  {selectedCoach.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                </div>
              )}
            </div>
            <div className="catalog-profile-body">
              {selectedCoach.isDemo && <span className="catalog-demo-label">Demo profile</span>}
              <p>{selectedCoach.area !== "Online" && selectedCoach.area !== selectedCoach.location ? `${selectedCoach.area}, ` : ""}{selectedCoach.location} · {selectedCoach.sports.join(" · ")} · {selectedCoach.mode}</p>
              <h2 id="catalog-profile-name">{selectedCoach.name}</h2>
              <strong>{selectedCoach.specialty}</strong>
              <div className="catalog-profile-sports" aria-label="Sports coached">
                {selectedCoach.sports.map((entry) => <span key={entry}>{entry}</span>)}
              </div>
              <div className="catalog-profile-summary">
                {selectedCoach.rating === null
                  ? <span><b>New</b>No reviews yet</span>
                  : <span><b>★ {selectedCoach.rating}</b>{selectedCoach.reviewCount} reviews</span>}
                {selectedCoach.lessonCount > 0 && <span aria-label={`${selectedCoach.lessonCount} lessons taught`}><b>{selectedCoach.lessonCount}</b>lessons taught</span>}
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
                {(selectedCoach.coachingStyle || selectedCoach.languages.length > 0) && <section>
                  <h3>Coaching style</h3>
                  {selectedCoach.coachingStyle && <p>{selectedCoach.coachingStyle}</p>}
                  {selectedCoach.languages.length > 0 && <span><b>Languages</b>{selectedCoach.languages.join(" · ")}</span>}
                </section>}
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
              {selectedCoach.availability.length > 0 && <section className="catalog-profile-availability">
                <h3>Weekly availability</h3>
                <div>{selectedCoach.availability.map((day) => <span key={day}>{day}</span>)}</div>
              </section>}
              <CoachLocationPreview coach={selectedCoach} />
              {selectedCoach.faqs.length > 0 && <section className="catalog-profile-faq">
                <h3>Frequently asked questions</h3>
                <div>
                  {selectedCoach.faqs.map((faq) => (
                    <details key={faq.question}>
                      <summary>{faq.question}</summary>
                      <p>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>}
              <span className="catalog-profile-reserve">Booking requests are not open yet.</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
