import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecommendationPreferences from "@/components/recommendation-preferences";

afterEach(() => vi.unstubAllGlobals());

describe("recommendation preferences", () => {
  it("lets a member save a custom sport interest", async () => {
    let submitted: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/preferences" && !init?.method) {
        return { ok: true, json: async () => ({ preferences: { interests: [], preferredLocation: "Lahore", maxBudgetPkr: 3000, trainingGoal: "Build confidence", experienceLevel: "Beginner" } }) };
      }
      if (String(input) === "/api/preferences" && init?.method === "PATCH") {
        submitted = JSON.parse(String(init.body));
        return { ok: true, json: async () => ({ message: "Preferences saved." }) };
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RecommendationPreferences />);

    fireEvent.change(await screen.findByLabelText(/add another sport or activity/i), { target: { value: "Archery" } });
    fireEvent.click(screen.getByRole("button", { name: /add sport or activity/i }));
    fireEvent.click(screen.getByRole("button", { name: /save recommendation preferences/i }));

    await waitFor(() => expect(submitted).toMatchObject({ interests: ["Archery"] }));
    expect(screen.getByText(/preferences saved/i)).toBeInTheDocument();
  });
});
