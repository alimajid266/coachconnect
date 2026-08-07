import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CoachMap from "@/app/coaches/coach-map";
import { coaches } from "@/lib/coaches";

describe("CoachMap preview", () => {
  it("lets a keyboard or pointer user close the selected coach preview", () => {
    const coach = coaches.find((entry) => entry.offersInPerson && entry.coordinates);
    expect(coach).toBeDefined();

    render(<CoachMap city="any" coaches={[coach!]} profileHref={(entry) => `/coaches/${entry.id}`} />);

    fireEvent.click(screen.getByRole("button", { name: `Show ${coach!.name} in ${coach!.area} on map` }));
    expect(screen.getByRole("heading", { name: coach!.name })).toBeInTheDocument();

    const close = screen.getByRole("button", { name: "Close coach preview" });
    fireEvent.click(close);

    expect(screen.queryByRole("heading", { name: coach!.name })).not.toBeInTheDocument();
  });
});
