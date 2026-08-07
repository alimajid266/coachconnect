import type { Coach } from "@/lib/coaches";

type Props = {
  coach: Coach;
};

export default function CoachLocationPreview({ coach }: Props) {
  if (!coach.offersInPerson || !coach.area.trim() || !coach.location.trim()) return null;

  const publicQuery = `${coach.area}, ${coach.location}, Pakistan`;
  const encodedQuery = encodeURIComponent(publicQuery);
  const embedUrl = `https://www.google.com/maps?q=${encodedQuery}&z=13&output=embed`;
  const directUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return (
    <section className="catalog-profile-location" aria-label={`${coach.name}'s training area`}>
      <div className="catalog-profile-location-copy">
        <div>
          <span>Approximate training area</span>
          <h3>{coach.area}, {coach.location}</h3>
        </div>
        <p>{coach.isDemo ? "Illustrative area for this Demo profile." : "Exact meeting details are shared after confirmation."}</p>
      </div>
      <div className="catalog-profile-location-frame">
        <iframe
          className="catalog-profile-location-map"
          src={embedUrl}
          title={`Map of ${coach.area}, ${coach.location}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <a className="catalog-profile-map-link" href={directUrl} target="_blank" rel="noreferrer">Open approximate area in Google Maps ↗</a>
    </section>
  );
}
