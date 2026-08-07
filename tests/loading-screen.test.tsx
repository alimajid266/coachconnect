import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/loading";

describe("route loading screen", () => {
  it("uses a license-safe branded loader with an accessible status", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent(/preparing your next session/i);
    expect(document.querySelector(".sports-loader-logo")).toHaveAttribute(
      "src",
      "/brand/coachconnect-linked-rings.svg",
    );
    expect(document.querySelector(".sports-loader-mark")).not.toBeInTheDocument();
  });
});
