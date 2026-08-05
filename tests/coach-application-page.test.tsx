import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CoachApplicationPage from "@/app/coach/apply/page";

afterEach(() => vi.unstubAllGlobals());

describe("coach application page", () => {
  it("gives a signed-in member a complete privacy-safe application form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ application: null }),
    }));

    render(<CoachApplicationPage />);

    expect(await screen.findByRole("heading", { name: /build your coach profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/professional headline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/coaching biography/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /sports you coach/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /people you coach/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /training formats/i })).toBeInTheDocument();
    expect(screen.getByText(/never enter a home address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit for review/i })).toBeInTheDocument();
  });
});
