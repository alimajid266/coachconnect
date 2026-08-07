export type PublicCoachReview = {
  rating: number;
  body: string;
  createdAt: string;
};

export type PublicCoachReviewState =
  | { status: "ready"; reviews: PublicCoachReview[] }
  | { status: "unavailable"; reviews: [] };

type ReviewRpcClient = {
  rpc: (name: string, args: Record<string, string>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function loadPublicCoachReviews(client: ReviewRpcClient, coachId: string): Promise<PublicCoachReviewState> {
  let result: { data: unknown; error: unknown };
  try {
    result = await client.rpc("list_public_coach_reviews", { target_user_id: coachId });
  } catch {
    return { status: "unavailable", reviews: [] };
  }
  if (result.error || !Array.isArray(result.data)) return { status: "unavailable", reviews: [] };

  const reviews = result.data.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const rating = Number(row.rating);
    const body = typeof row.review_body === "string" ? row.review_body.trim() : "";
    const createdAt = typeof row.created_at === "string" ? row.created_at : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || body.length < 10 || Number.isNaN(Date.parse(createdAt))) return [];
    return [{ rating, body, createdAt }];
  });

  return { status: "ready", reviews };
}

export function reconcilePublicReviewStats(
  storedCount: number,
  storedRating: number | null,
  state: PublicCoachReviewState,
) {
  if (state.status === "unavailable") {
    return { available: false, reviewCount: storedCount, rating: storedRating };
  }

  const reviewCount = Math.max(storedCount, state.reviews.length);
  const available = reviewCount === 0 || state.reviews.length > 0;
  const statsLagged = state.reviews.length > storedCount || (storedRating === null && state.reviews.length > 0);
  const visibleAverage = state.reviews.length > 0
    ? Math.round((state.reviews.reduce((total, review) => total + review.rating, 0) / state.reviews.length) * 10) / 10
    : storedRating;

  return {
    available,
    reviewCount,
    rating: statsLagged ? visibleAverage : storedRating,
  };
}
