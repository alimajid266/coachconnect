"use client";

import { useEffect, useRef, useState } from "react";
import type { Coach } from "@/lib/coaches";

type Props = {
  coach: Coach;
};

export default function CoachLocationPreview({ coach }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!containerRef.current || !coach.coordinates || !token || typeof window.WebGLRenderingContext === "undefined") return;

    let cancelled = false;
    let map: import("mapbox-gl").Map | null = null;
    let marker: import("mapbox-gl").Marker | null = null;

    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !containerRef.current || !coach.coordinates) return;
        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: coach.coordinates,
          zoom: 11.5,
          interactive: false,
          attributionControl: true,
        });
        marker = new mapboxgl.Marker({ color: "#294a41" })
          .setLngLat(coach.coordinates)
          .addTo(map);
        map.on("load", () => {
          if (!cancelled) setMapState("ready");
        });
        map.on("error", () => {
          if (!cancelled) setMapState("error");
        });
      })
      .catch(() => {
        if (!cancelled) setMapState("error");
      });

    return () => {
      cancelled = true;
      marker?.remove();
      map?.remove();
    };
  }, [coach.coordinates]);

  if (!coach.coordinates) return null;

  return (
    <section className="catalog-profile-location" aria-label={`${coach.name}'s training area`}>
      <div className="catalog-profile-location-copy">
        <div>
          <span>Approximate training area</span>
          <h3>{coach.area}, {coach.location}</h3>
        </div>
        <p>Exact meeting details are shared after booking.</p>
      </div>
      <div className="catalog-profile-location-frame">
        <div className="catalog-profile-location-map" ref={containerRef} />
        {mapState === "loading" && <span className="catalog-profile-location-state">Loading area map…</span>}
        {mapState === "error" && <span className="catalog-profile-location-state">Area map unavailable</span>}
      </div>
    </section>
  );
}
