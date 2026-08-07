import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CoachLocationPreview from "@/app/coaches/coach-location-preview";
import { coaches } from "@/lib/coaches";

describe("standalone coach location preview", () => {
  it("shows a coarse public-area map even when an approved coach has no stored coordinates", () => {
    const coach = {
      ...coaches[0],
      id: "real-coach-id",
      name: "Ali Majid2",
      location: "Islamabad",
      area: "I-8",
      coordinates: null,
      offersInPerson: true,
      isDemo: false,
    };

    render(<CoachLocationPreview coach={coach} />);

    expect(screen.getByRole("region", { name: /ali majid2's training area/i })).toBeInTheDocument();
    const map = screen.getByTitle("Map of I-8, Islamabad");
    expect(map).toHaveAttribute("src", expect.stringContaining("I-8%2C%20Islamabad%2C%20Pakistan"));
    expect(map).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.getByRole("link", { name: /open approximate area in google maps/i })).toHaveAttribute("href", expect.stringContaining("I-8%2C%20Islamabad%2C%20Pakistan"));
    expect(screen.getByText(/exact meeting details are shared after confirmation/i)).toBeInTheDocument();
  });

  it("labels Demo locations as illustrative instead of promising a booking", () => {
    render(<CoachLocationPreview coach={{ ...coaches[0], isDemo: true }} />);
    expect(screen.getByText(/illustrative area for this demo profile/i)).toBeInTheDocument();
    expect(screen.queryByText(/exact meeting details/i)).not.toBeInTheDocument();
  });

  it("does not expose a location map for online-only coaches", () => {
    render(<CoachLocationPreview coach={{ ...coaches[0], offersInPerson: false }} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
