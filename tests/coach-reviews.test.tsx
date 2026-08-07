import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CoachReviewList from "@/components/coach-review-list";
import { loadPublicCoachReviews, reconcilePublicReviewStats } from "@/lib/public-reviews";

describe("public coach reviews", () => {
  it("loads and normalizes the coach's verified public reviews", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ rating: 4, review_body: "Patient, practical and easy to understand.", created_at: "2026-08-07T10:00:00.000Z" }],
      error: null,
    });

    await expect(loadPublicCoachReviews({ rpc }, "coach-1")).resolves.toEqual({
      status: "ready",
      reviews: [{ rating: 4, body: "Patient, practical and easy to understand.", createdAt: "2026-08-07T10:00:00.000Z" }],
    });
    expect(rpc).toHaveBeenCalledWith("list_public_coach_reviews", { target_user_id: "coach-1" });
  });

  it("reports review-loading failure instead of claiming there are no reviews", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "unavailable" } });
    await expect(loadPublicCoachReviews({ rpc }, "coach-1")).resolves.toEqual({ status: "unavailable", reviews: [] });

    render(<CoachReviewList coachName="Ali Majid2" available={false} reviewCount={0} reviews={[]} />);
    expect(screen.getByText("Reviews are temporarily unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("No verified reviews yet.")).not.toBeInTheDocument();
  });

  it("reports a rejected review request as unavailable", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("network unavailable"));
    await expect(loadPublicCoachReviews({ rpc }, "coach-1")).resolves.toEqual({ status: "unavailable", reviews: [] });
  });

  it("reconciles a stale nonzero count and rating from the visible verified rows", () => {
    expect(reconcilePublicReviewStats(1, 2, {
      status: "ready",
      reviews: [
        { rating: 4, body: "Patient, practical and easy to understand.", createdAt: "2026-08-07T10:00:00.000Z" },
        { rating: 5, body: "Clear advice and a very useful session.", createdAt: "2026-08-08T10:00:00.000Z" },
      ],
    })).toEqual({ available: true, reviewCount: 2, rating: 4.5 });
  });

  it("shows verified reviews near the end of a real coach profile without exposing athlete identity", () => {
    render(<CoachReviewList coachName="Ali Majid2" available reviewCount={27} reviews={[
      { rating: 4, body: "Patient, practical and easy to understand.", createdAt: "2026-08-07T10:00:00.000Z" },
    ]} />);

    const region = screen.getByRole("region", { name: /reviews for ali majid2/i });
    expect(within(region).getByRole("heading", { name: "Verified reviews" })).toBeInTheDocument();
    expect(within(region).getByText("27 reviews")).toBeInTheDocument();
    expect(within(region).getByText("Showing the latest verified review.")).toBeInTheDocument();
    expect(within(region).getByText("Patient, practical and easy to understand.")).toBeInTheDocument();
    expect(within(region).getByLabelText("4 out of 5 stars")).toBeInTheDocument();
    expect(within(region).getByText("Verified athlete")).toBeInTheDocument();
  });
});
