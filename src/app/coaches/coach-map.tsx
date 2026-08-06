"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCoachPrice, type Coach } from "@/lib/coaches";

type Props = {
  city: string;
  coaches: Coach[];
  onViewProfile: (coach: Coach) => void;
};

type MapboxModule = typeof import("mapbox-gl").default;

export default function CoachMap({ city, coaches, onViewProfile }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const mapboxRef = useRef<MapboxModule | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const mappableCoaches = useMemo(() => coaches.filter((coach) => coach.coordinates), [coaches]);
  const onlineOnlyCount = coaches.filter((coach) => coach.offersOnline && !coach.offersInPerson).length;
  const unmappedInPersonCount = coaches.filter((coach) => coach.offersInPerson && !coach.coordinates).length;
  const selectedVisibleCoach = selectedCoach && mappableCoaches.some((coach) => coach.id === selectedCoach.id)
    ? selectedCoach
    : null;

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!containerRef.current || !token || typeof window.WebGLRenderingContext === "undefined") return;

    let cancelled = false;

    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = token;
        mapboxRef.current = mapboxgl;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [69.3451, 30.3753],
          zoom: 4.25,
          attributionControl: true,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (!cancelled) setMapState("ready");
        });
        map.on("error", () => {
          if (!cancelled) setMapState("error");
        });
        mapRef.current = map;
      })
      .catch(() => {
        if (!cancelled) setMapState("error");
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapState !== "ready" || !mapRef.current || !mapboxRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxRef.current.LngLatBounds();
    mappableCoaches.forEach((coach) => {
      if (!coach.coordinates || !mapRef.current || !mapboxRef.current) return;
      const markerButton = document.createElement("button");
      markerButton.type = "button";
      markerButton.className = `catalog-map-price-marker${selectedVisibleCoach?.id === coach.id ? " is-active" : ""}`;
      markerButton.textContent = formatCoachPrice(coach.price);
      markerButton.setAttribute("aria-label", `Show ${coach.name} in ${coach.area} on map`);
      markerButton.addEventListener("click", () => setSelectedCoach(coach));
      const marker = new mapboxRef.current.Marker({ element: markerButton, anchor: "bottom" })
        .setLngLat(coach.coordinates)
        .addTo(mapRef.current);
      markersRef.current.push(marker);
      bounds.extend(coach.coordinates);
    });

    if (mappableCoaches.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: 64, maxZoom: 11.5, duration: 500 });
    } else {
      mapRef.current.easeTo({ center: [69.3451, 30.3753], zoom: 4.25, duration: 500 });
    }
  }, [mapState, mappableCoaches, selectedVisibleCoach?.id]);

  return (
    <section className="catalog-map" aria-label="Coach locations">
      <div className="catalog-map-heading">
        <div>
          <strong>
            {mappableCoaches.length} training areas{city !== "any" ? ` in ${city}` : ""}
          </strong>
          <span>Choose a marker to preview a coach.</span>
        </div>
        {onlineOnlyCount > 0 && <span>{onlineOnlyCount} online</span>}
        {unmappedInPersonCount > 0 && <span>{unmappedInPersonCount} awaiting map area</span>}
      </div>

      <div className="catalog-map-frame">
        <div className="catalog-map-canvas" ref={containerRef} />
        {mapState === "loading" && <p className="catalog-map-state">Loading map…</p>}
        {mapState === "error" && <p className="catalog-map-state">The map could not load. Coach results remain available.</p>}
      </div>

      <div className="visually-hidden" aria-label="Map locations">
        {mappableCoaches.map((coach) => (
          <button
            type="button"
            aria-label={`Show ${coach.name} in ${coach.area} on map`}
            key={coach.id}
            onClick={() => setSelectedCoach(coach)}
          >
            {coach.name}, {coach.area}
          </button>
        ))}
      </div>

      {selectedVisibleCoach && (
        <article className="catalog-map-preview">
          <p>{selectedVisibleCoach.area}, {selectedVisibleCoach.location}</p>
          <h2>{selectedVisibleCoach.name}</h2>
          <span>{selectedVisibleCoach.sports.join(" · ")} · {selectedVisibleCoach.rating === null ? "New coach" : `★ ${selectedVisibleCoach.rating}`}</span>
          <strong>{formatCoachPrice(selectedVisibleCoach.price)} per session</strong>
          <button type="button" aria-label={`View ${selectedVisibleCoach.name}'s profile`} onClick={() => onViewProfile(selectedVisibleCoach)}>
            View profile
          </button>
        </article>
      )}
    </section>
  );
}
