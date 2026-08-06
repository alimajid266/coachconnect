import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn(() => null as never));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import DashboardPage from "@/app/dashboard/page";

describe("legacy dashboard route", () => {
  beforeEach(() => redirectMock.mockClear());

  it("redirects old dashboard links to My Account", () => {
    render(<DashboardPage />);

    expect(redirectMock).toHaveBeenCalledWith("/account");
    expect(redirectMock).toHaveBeenCalledOnce();
  });
});
