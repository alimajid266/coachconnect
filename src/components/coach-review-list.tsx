import type { PublicCoachReview } from "@/lib/public-reviews";

function reviewDate(value: string) {
  return new Intl.DateTimeFormat("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(value));
}

export default function CoachReviewList({ coachName, available, reviewCount, reviews }: { coachName: string; available: boolean; reviewCount: number; reviews: PublicCoachReview[] }) {
  return (
    <section className="coach-profile-reviews" aria-label={`Reviews for ${coachName}`}>
      <header>
        <div>
          <span>Session feedback</span>
          <h2>Verified reviews</h2>
        </div>
        <strong>{available ? `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}` : "Unavailable"}</strong>
      </header>
      {available && reviewCount > reviews.length && reviews.length > 0 && <p className="coach-review-disclosure">Showing the latest verified {reviews.length === 1 ? "review" : `${reviews.length} reviews`}.</p>}
      {!available ? (
        <p className="coach-review-empty">Reviews are temporarily unavailable.</p>
      ) : reviews.length > 0 ? (
        <div className="coach-review-list">
          {reviews.map((review) => (
            <article key={`${review.createdAt}:${review.body}`}>
              <div>
                <span className="coach-review-stars" aria-label={`${review.rating} out of 5 stars`}>
                  <span aria-hidden="true">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                </span>
                <time dateTime={review.createdAt}>{reviewDate(review.createdAt)}</time>
              </div>
              <p>{review.body}</p>
              <small>Verified athlete</small>
            </article>
          ))}
        </div>
      ) : <p className="coach-review-empty">No verified reviews yet.</p>}
    </section>
  );
}
