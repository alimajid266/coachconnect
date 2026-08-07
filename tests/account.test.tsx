import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "@/app/account/page";

const member = {
  id: "member-1",
  displayName: "Ali Member",
  email: "ali@example.com",
  role: "ATHLETE" as const,
  capabilities: { administrator: false, coachStatus: null },
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function response(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function anonymousSessionMock(handler?: (path: string, init?: RequestInit) => unknown) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/auth/session") return response({ user: null });
    if (handler) return handler(path, init);
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("account page", () => {
  it("shows My Account instead of sign-in controls when a session already exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ user: member }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountPage />);

    expect(await screen.findByRole("heading", { name: "My account" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ali Member" })).toBeInTheDocument();
    expect(screen.getAllByText("ali@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Become a coach" })).toSatisfy(
      (links: HTMLElement[]) => links.every((link) => link.getAttribute("href") === "/coach/apply"),
    );
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open sessions and bookings/i })).toHaveAttribute("href", "/sessions");
    expect(screen.getByRole("link", { name: /open training plans/i })).toHaveAttribute("href", "/training-plans");
    expect(screen.getByRole("link", { name: /open recommendation preferences/i })).toHaveAttribute("href", "/recommendations");
    expect(screen.queryByRole("heading", { name: /training hub/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /build a training plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
  });

  it("lets athletes and coaches add an account profile picture", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/auth/session") return response({ user: { ...member, avatarUrl: null } });
      if (path === "/api/schedule") return response({ userId: member.id, bookings: [], slots: [] });
      if (path === "/api/coach-application/image?purpose=avatar" && init?.method === "POST") {
        return response({ path: `${member.id}/avatar.webp`, url: "https://images.example/avatar.webp", purpose: "avatar" });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    const input = await screen.findByLabelText(/account profile picture/i);
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole("img", { name: "Ali Member profile picture" })).toHaveAttribute("src", "https://images.example/avatar.webp");
    expect(fetchMock).toHaveBeenCalledWith("/api/coach-application/image?purpose=avatar", expect.objectContaining({ method: "POST", body: file }));
  });

  it("does not mislabel a member as signed out when the session check fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    render(<AccountPage />);

    expect(await screen.findByRole("heading", { name: /unable to confirm your session/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retry account check/i })).toHaveAttribute("href", "/account");
  });

  it("logs out and returns to account access without leaving stale member data", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/auth/session") return response({ user: member });
      if (String(input) === "/api/auth/logout" && init?.method === "POST") return response({ signedOut: true });
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.queryByText("ali@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/logged out/i);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("requires explicit confirmation before permanently deleting an account", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/auth/session") return response({ user: member });
      if (String(input) === "/api/account" && init?.method === "DELETE") return response({ deleted: true });
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("heading", { name: /delete your account/i })).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: /permanently delete/i });
    expect(confirmButton).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/account", expect.anything());

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "Current-Password-42" },
    });
    fireEvent.change(screen.getByLabelText(/type delete/i), { target: { value: "DELETE" } });
    fireEvent.click(confirmButton);

    expect(await screen.findByRole("heading", { name: "Account deleted" })).toBeInTheDocument();
    expect(screen.queryByText("ali@example.com")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/account", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "Current-Password-42" }),
    });
  });

  it("creates one neutral member account without exposing account roles", async () => {
    const fetchMock = anonymousSessionMock((path) => {
      if (path === "/api/auth/register") {
        return response({ user: { ...member, id: "new-member" } });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Ali Member" } });
    fireEvent.change(screen.getByLabelText(/main training goal/i), { target: { value: "Improve football fitness" } });
    fireEvent.click(screen.getByLabelText("Football"));
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.change(screen.getByLabelText(/re-enter your password/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.click(screen.getByRole("button", { name: /create my account/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    ));
    const registerCall = fetchMock.mock.calls.find(([path]) => path === "/api/auth/register");
    const submitted = JSON.parse(String(registerCall?.[1]?.body));
    expect(submitted).toMatchObject({ displayName: "Ali Member", email: "ali@example.com" });
    expect(submitted).not.toHaveProperty("role");
    expect(await screen.findByRole("link", { name: /open my account/i })).toHaveAttribute("href", "/account");
    expect(screen.queryByDisplayValue("Private-Test-Passphrase-42")).not.toBeInTheDocument();
  });

  it("shows the authenticated account immediately after signing in", async () => {
    let sessionChecks = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/auth/session") {
        sessionChecks += 1;
        return response({ user: sessionChecks === 1 ? null : member });
      }
      if (path === "/api/auth/login") return response({ authenticated: true });
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.change(await screen.findByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in securely/i }));

    expect(await screen.findByRole("heading", { name: "My account" })).toBeInTheDocument();
    expect(screen.getAllByText("ali@example.com").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /open my account/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
  });

  it("never offers an external destination after authentication", async () => {
    window.history.replaceState({}, "", "/account?next=%2F%5Cevil.example");
    let sessionChecks = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/auth/session") {
        sessionChecks += 1;
        return response({ user: sessionChecks === 1 ? null : member });
      }
      if (path === "/api/auth/login") return response({ authenticated: true });
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.change(await screen.findByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in securely/i }));

    expect(await screen.findByRole("heading", { name: "My account" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open my account/i })).not.toBeInTheDocument();
  });

  it("blocks registration when passwords do not match without making a mutation", async () => {
    const fetchMock = anonymousSessionMock();
    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Ali Member" } });
    fireEvent.change(screen.getByLabelText(/main training goal/i), { target: { value: "Improve football fitness" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.change(screen.getByLabelText(/re-enter your password/i), { target: { value: "Different-Test-Passphrase-42" } });
    fireEvent.click(screen.getByRole("button", { name: /create my account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/passwords do not match/i);
    expect(fetchMock.mock.calls.filter(([path]) => path !== "/api/auth/session")).toHaveLength(0);
  });

  it("lets a member register with a sport that is not in the suggested list", async () => {
    let submitted: Record<string, unknown> | null = null;
    anonymousSessionMock((path, init) => {
      if (path === "/api/auth/register") {
        submitted = JSON.parse(String(init?.body));
        return response({ pendingEmailConfirmation: true });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Ali Member" } });
    fireEvent.change(screen.getByLabelText(/add another sport or activity/i), { target: { value: "Archery" } });
    fireEvent.click(screen.getByRole("button", { name: /add sport or activity/i }));
    fireEvent.change(screen.getByLabelText(/main training goal/i), { target: { value: "Improve archery consistency" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.change(screen.getByLabelText(/re-enter your password/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.click(screen.getByRole("button", { name: /create my account/i }));

    await screen.findByRole("heading", { name: /check your email/i });
    expect(submitted).toMatchObject({ interests: ["Archery"] });
  });

  it("asks the member to confirm their email when required", async () => {
    anonymousSessionMock((path) => {
      if (path === "/api/auth/register") return response({ pendingEmailConfirmation: true });
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Ali Member" } });
    fireEvent.change(screen.getByLabelText(/main training goal/i), { target: { value: "Improve football fitness" } });
    fireEvent.click(screen.getByLabelText("Football"));
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.change(screen.getByLabelText(/re-enter your password/i), { target: { value: "Private-Test-Passphrase-42" } });
    fireEvent.click(screen.getByRole("button", { name: /create my account/i }));

    expect(await screen.findByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open my account/i })).not.toBeInTheDocument();
  });

  it("enables another confirmation email after the visible cooldown", async () => {
    vi.useFakeTimers();
    anonymousSessionMock((path) => {
      if (path === "/api/auth/resend-confirmation") return response({ message: "Confirmation email requested." });
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AccountPage />);
    await act(async () => {});

    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /resend confirmation email/i }));
    });

    expect(screen.getByRole("button", { name: /resend available in 30s/i })).toBeDisabled();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByRole("button", { name: /resend confirmation email/i })).toBeEnabled();
  });
});
