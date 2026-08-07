"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CoachMap from "@/app/coaches/coach-map";
import SiteHeader from "@/components/site-header";
import { interpretCoachQuery, recommendCoaches, type CoachQueryInterpretation, type DiscoveryFilters } from "@/lib/coach-discovery";
import { coaches as demoCoaches, formatCoachPrice, type Coach } from "@/lib/coaches";

type Props = {
  initialQuery: string;
  initialCity: string;
  initialCoaches?: Coach[];
};

type SortOption = "recommended" | "rating" | "price-low" | "price-high";
const PAGE_SIZE = 20;

export default function CoachCatalog({ initialQuery, initialCity, initialCoaches = [] }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [sport, setSport] = useState("any");
  const [mode, setMode] = useState("any");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [showMap, setShowMap] = useState(false);
  const [dismissedInterpretations, setDismissedInterpretations] = useState<string[]>([]);
  const [approvedCoaches, setApprovedCoaches] = useState<Coach[]>(() => initialCoaches.filter((coach) => !coach.isDemo));
  const [databaseDemoCoaches, setDatabaseDemoCoaches] = useState<Coach[]>(() => initialCoaches.filter((coach) => coach.isDemo));
  const [demoCatalogStatus, setDemoCatalogStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [aiInterpretation, setAiInterpretation] = useState<CoachQueryInterpretation | null>(null);
  const [aiRanking, setAiRanking] = useState<Array<{ id: string; reasons: string[] }> | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [aiError, setAiError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  function profileHref(coach: Coach) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (city !== "any") params.set("city", city);
    if (sport !== "any") params.set("sport", sport);
    if (mode !== "any") params.set("mode", mode);
    if (sort !== "recommended") params.set("sort", sort);
    const returnTo = params.size > 0 ? `/coaches?${params.toString()}` : "/coaches";
    return `/coaches/${encodeURIComponent(coach.id)}?returnTo=${encodeURIComponent(returnTo)}`;
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coaches", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog unavailable");
        const body = await response.json() as { coaches?: unknown; demos?: unknown; demosAvailable?: unknown };
        if (!Array.isArray(body.coaches)) throw new Error("invalid catalog response");
        if (!cancelled) {
          setApprovedCoaches(body.coaches as Coach[]);
          const demosAvailable = body.demosAvailable === true && Array.isArray(body.demos);
          setDatabaseDemoCoaches(demosAvailable ? body.demos as Coach[] : []);
          setDemoCatalogStatus(demosAvailable ? "ready" : "unavailable");
          setCatalogStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDemoCatalogStatus("unavailable");
          setCatalogStatus("unavailable");
        }
      });
    return () => { cancelled = true; };
  }, []);
  const catalogCoaches = useMemo(() => {
    const byId = new Map<string, Coach>();
    if (demoCatalogStatus !== "ready") {
      for (const coach of demoCoaches) byId.set(coach.id, { ...coach, isDemo: true });
    }
    for (const coach of databaseDemoCoaches) byId.set(coach.id, { ...coach, isDemo: true, badge: "Demo profile" });
    for (const coach of approvedCoaches) byId.set(coach.id, { ...coach, isDemo: false });
    return Array.from(byId.values());
  }, [approvedCoaches, databaseDemoCoaches, demoCatalogStatus]);

  const availableCities = useMemo(() => Array.from(new Set(
    catalogCoaches.filter((coach) => coach.location !== "Online").map((coach) => coach.location),
  )).sort(), [catalogCoaches]);
  const availableSports = useMemo(() => Array.from(new Set(catalogCoaches.flatMap((coach) => coach.sports))).sort(), [catalogCoaches]);

  const activeCity = catalogStatus === "ready" && city !== "any" && !availableCities.includes(city)
    ? "any"
    : city;

  const deterministicInterpretation = useMemo(() => interpretCoachQuery(query), [query]);
  const interpretation = aiInterpretation ?? deterministicInterpretation;
  const effectiveFilters: DiscoveryFilters = useMemo(() => ({
    sport: dismissedInterpretations.includes("sport") ? undefined : interpretation.filters.sport,
    city: dismissedInterpretations.includes("city") ? undefined : interpretation.filters.city,
    level: dismissedInterpretations.includes("level") ? undefined : interpretation.filters.level,
    format: dismissedInterpretations.includes("format") ? undefined : interpretation.filters.format,
    affordability: dismissedInterpretations.includes("affordability") ? undefined : interpretation.filters.affordability,
    maxPrice: dismissedInterpretations.includes("maxPrice") ? undefined : interpretation.filters.maxPrice,
    day: dismissedInterpretations.includes("day") ? undefined : interpretation.filters.day,
    tags: interpretation.filters.tags.filter((tag) => !dismissedInterpretations.includes(`tag:${tag}`)),
  }), [dismissedInterpretations, interpretation]);

  const deterministicRecommendations = useMemo(() => recommendCoaches(catalogCoaches, {
    ...interpretation,
    filters: effectiveFilters,
  }), [catalogCoaches, effectiveFilters, interpretation]);
  const recommendations = useMemo(() => {
    if (!aiRanking) return deterministicRecommendations;
    const ranked = new Map(aiRanking.map((entry, index) => [entry.id, { ...entry, index }]));
    return deterministicRecommendations.map((entry) => {
      const ai = ranked.get(entry.coach.id);
      return ai ? { ...entry, reasons: ai.reasons, label: "Strong match" as const } : entry;
    }).sort((first, second) => (ranked.get(first.coach.id)?.index ?? 10_000) - (ranked.get(second.coach.id)?.index ?? 10_000));
  }, [aiRanking, deterministicRecommendations]);

  const visibleRecommendations = useMemo(() => {
    const matches = recommendations.filter(({ coach }) => (
      (activeCity === "any" || coach.location === activeCity)
      && (sport === "any" || coach.sports.includes(sport))
      && (!effectiveFilters.sport || coach.sports.includes(effectiveFilters.sport))
      && (!effectiveFilters.city || coach.location === effectiveFilters.city)
      && (!effectiveFilters.level || coach.levels.includes(effectiveFilters.level))
      && (!effectiveFilters.maxPrice || coach.price <= effectiveFilters.maxPrice)
      && (!effectiveFilters.day || coach.availability.includes(effectiveFilters.day))
      && effectiveFilters.tags.every((tag) => coach.tags.includes(tag))
      && (!effectiveFilters.format
        || (effectiveFilters.format === "Online" && coach.offersOnline)
        || (effectiveFilters.format === "In person" && coach.offersInPerson))
      && (mode === "any"
        || (mode === "Online" && coach.offersOnline)
        || (mode === "In person" && coach.offersInPerson))
    ));
    if (sort === "recommended") return matches;
    return [...matches].sort((first, second) => {
      let comparison = 0;
      if (sort === "rating") comparison = (second.coach.rating ?? -1) - (first.coach.rating ?? -1) || second.coach.reviewCount - first.coach.reviewCount;
      else if (sort === "price-low") comparison = first.coach.price - second.coach.price;
      else comparison = second.coach.price - first.coach.price;
      return comparison || String(first.coach.id).localeCompare(String(second.coach.id));
    });
  }, [activeCity, effectiveFilters, mode, recommendations, sort, sport]);

  const pageCount = Math.max(1, Math.ceil(visibleRecommendations.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pagedRecommendations = useMemo(() => visibleRecommendations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [safePage, visibleRecommendations]);
  const visibleCoaches = useMemo(() => pagedRecommendations.map((entry) => entry.coach), [pagedRecommendations]);
  const recommendationById = useMemo(() => new Map(pagedRecommendations.map((entry) => [entry.coach.id, entry])), [pagedRecommendations]);
  const correctionLabel = (value: string, fallback: string) => {
    const correction = interpretation.corrections.find((entry) => entry.target === value);
    return correction ? `${correction.source} → ${value}` : fallback;
  };
  const interpretationChips = [
    effectiveFilters.sport && { key: "sport", label: correctionLabel(effectiveFilters.sport, `Sport: ${effectiveFilters.sport}`) },
    effectiveFilters.city && { key: "city", label: correctionLabel(effectiveFilters.city, `City: ${effectiveFilters.city}`) },
    effectiveFilters.level && { key: "level", label: correctionLabel(effectiveFilters.level, `Level: ${effectiveFilters.level}`) },
    effectiveFilters.format && { key: "format", label: correctionLabel(effectiveFilters.format, `Format: ${effectiveFilters.format}`) },
    effectiveFilters.affordability && { key: "affordability", label: "Affordable first" },
    effectiveFilters.maxPrice !== undefined && { key: "maxPrice", label: `Up to Rs ${effectiveFilters.maxPrice.toLocaleString("en-PK")}` },
    effectiveFilters.day && { key: "day", label: `Day: ${effectiveFilters.day}` },
    ...effectiveFilters.tags.map((tag) => ({ key: `tag:${tag}`, label: `Focus: ${tag}` })),
  ].filter((chip): chip is { key: string; label: string } => Boolean(chip));

  const clearFilters = () => {
    setQuery("");
    setDismissedInterpretations([]);
    setCity("any");
    setSport("any");
    setMode("any");
    setSort("recommended");
    setCurrentPage(1);
    setAiInterpretation(null);
    setAiRanking(null);
    setAiStatus("idle");
    setAiError("");
  };

  async function runAiSearch() {
    if (query.trim().length < 2 || catalogCoaches.length === 0) return;
    setAiStatus("loading"); setAiError("");
    try {
      const response = await fetch("/api/ai/coach-discovery", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "AI search is temporarily unavailable.");
      setAiInterpretation(body.interpretation); setAiRanking(body.recommendations);
      setDismissedInterpretations([]); setSort("recommended"); setCurrentPage(1); setAiStatus("ready");
    } catch (reason) {
      setAiError(reason instanceof Error ? reason.message : "AI search is temporarily unavailable.");
      setAiStatus("idle");
    }
  }

  return (
    <div className="catalog-page">
      <a className="skip-link" href="#catalog-results">Skip to coach results</a>
      <SiteHeader hideCoachDiscoveryLink />

      <main className="catalog-main" id="catalog-results">
        <section className="catalog-intro">
          <div>
            <h1>Coach catalog</h1>
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
              onChange={(event) => {
                setQuery(event.target.value);
                setDismissedInterpretations([]);
                setCurrentPage(1); setAiInterpretation(null); setAiRanking(null); setAiStatus("idle"); setAiError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim().length >= 2 && aiStatus !== "loading") {
                  event.preventDefault();
                  void runAiSearch();
                }
              }}
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
              {availableSports.map((entry) => <option value={entry} key={entry}>{entry}</option>)}
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
          <button className="catalog-ai-button" type="button" disabled={aiStatus === "loading" || query.trim().length < 2 || catalogCoaches.length === 0} onClick={() => void runAiSearch()}>{aiStatus === "loading" ? "Asking Gemini…" : "Use AI search"}</button>
        </section>

        <div className="catalog-ai-status">
          <span>{aiStatus === "ready" ? "Search interpretation and coach recommendations generated with Gemini 3.5 Flash-Lite." : "Standard search works instantly. Use Gemini for natural-language interpretation and grounded coach recommendations."}</span>
          {aiError && <p role="alert">{aiError} Showing standard search results instead.</p>}
        </div>

        {(interpretationChips.length > 0 || interpretation.conflicts.length > 0) && (
          <section className="catalog-interpretation" aria-label="Search interpretation">
            <div>
              <strong>We interpreted your search as</strong>
              {interpretationChips.length > 0 && (
                <div className="catalog-interpretation-chips">
                  {interpretationChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      aria-label={`Remove ${chip.label}`}
                      onClick={() => setDismissedInterpretations((current) => [...current, chip.key])}
                    >
                      {chip.label} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {interpretation.conflicts.map((conflict) => <p role="alert" key={conflict}>{conflict}</p>)}
          </section>
        )}

        <div className="catalog-results-heading">
          <p role="status">{catalogStatus === "loading" && catalogCoaches.length === 0
            ? "Loading coaches"
            : `${visibleRecommendations.length} ${visibleRecommendations.length === 1 ? "coach" : "coaches"}`}</p>
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
          {showMap && <CoachMap city={city} coaches={visibleCoaches} profileHref={profileHref} />}
          {visibleCoaches.length > 0 ? (
          <section className="catalog-grid" aria-label="Coach results">
            {visibleCoaches.map((coach) => {
              const recommendation = recommendationById.get(coach.id);
              return (
              <article className="catalog-card" key={coach.id}>
                <div className="catalog-card-image">
                  {coach.image ? (
                    <Image
                      src={coach.image}
                      alt={coach.isDemo
                        ? `Illustrative ${coach.sports.join(" and ")} training image for Demo profile`
                        : `${coach.name}, ${coach.sports.join(" and ")} coach`}
                      fill
                      sizes="(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 33vw"
                      unoptimized={coach.image.startsWith("http")}
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
                    {coach.isDemo
                      ? <span>Demo</span>
                      : coach.rating === null
                        ? <span>New</span>
                        : <span aria-label={`${coach.rating} out of 5 stars`}>★ {coach.rating}</span>}
                  </div>
                  {recommendation?.label && (
                    <div className="catalog-match-summary">
                      <b>{recommendation.label}</b>
                      {recommendation.reasons.length > 0 && <span>{recommendation.reasons.slice(0, 3).join(" · ")}</span>}
                    </div>
                  )}
                  <p>{coach.area !== "Online" && coach.area !== coach.location ? `${coach.area}, ` : ""}{coach.location} · {coach.sports.join(" · ")} · {coach.mode}</p>
                  <strong>{coach.specialty}</strong>
                  <div className="catalog-card-footer">
                    <span><b>{formatCoachPrice(coach.price)}</b> per session</span>
                    <span>{coach.isDemo
                      ? "Demo profile"
                      : coach.lessonCount > 0
                        ? `${coach.lessonCount} lessons`
                        : coach.rating === null ? "New coach" : `${coach.reviewCount} reviews`}</span>
                  </div>
                  <Link
                    className="catalog-profile-button"
                    aria-label={`View ${coach.name}'s profile`}
                    href={profileHref(coach)}
                  >
                    View profile
                  </Link>
                </div>
              </article>
              );
            })}
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
        {visibleRecommendations.length > PAGE_SIZE && <nav className="catalog-pagination" aria-label="Coach result pages"><button type="button" disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous page</button><span>Page {safePage} of {pageCount}</span><button type="button" disabled={safePage === pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>Next page</button></nav>}
        <section className="catalog-policy" aria-labelledby="refund-policy-heading">
          <div>
            <p className="eyebrow">Book with clarity</p>
            <h2 id="refund-policy-heading">Refund and cancellation policy</h2>
          </div>
          <div className="catalog-policy-points">
            <p><strong>At least 24 hours before the session:</strong> cancellation is eligible for a full refund or credit from the coach.</p>
            <p><strong>Less than 24 hours:</strong> the coach&apos;s stated late-cancellation terms apply, unless the coach cancels.</p>
            <p><strong>Current MVP:</strong> CoachConnect records booking and payment-demo status but does not process real payments. Any eligible refund is completed outside the platform.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
