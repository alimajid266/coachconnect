import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteHeader from "@/components/site-header";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("site header", () => {
  it("does not repeat the coach discovery link on the coach catalog", () => {
    render(<SiteHeader initialSession={{ user: null }} hideCoachDiscoveryLink />);

    expect(screen.queryByRole("link", { name: /find a coach/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("keeps one CoachConnect logo and shows account-aware member actions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: "member-1",
          displayName: "Ali Member",
          email: "ali@example.com",
          role: "ATHLETE",
          capabilities: { administrator: false, coachStatus: null },
        },
      }),
    }));

    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "CoachConnect home" })).toHaveAttribute("href", "/");
    expect(await screen.findByRole("navigation", { name: "Workspace shortcuts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Sessions/ })).toHaveAttribute("href", "/sessions");
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("href", "/training-plans");
    expect(screen.getByRole("link", { name: "Recommendation settings" })).toHaveAttribute("href", "/recommendations");
    const menuButton = await screen.findByRole("button", { name: /open account menu for ali member/i });
    expect(menuButton).toHaveTextContent("AM");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "My account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: "Sessions and bookings" })).toHaveAttribute("href", "/sessions");
    expect(screen.getByRole("menuitem", { name: "Training plans" })).toHaveAttribute("href", "/training-plans");
    expect(screen.getByRole("menuitem", { name: "Recommendations" })).toHaveAttribute("href", "/recommendations");
    expect(screen.getByRole("menuitem", { name: "Become a coach" })).toHaveAttribute("href", "/coach/apply");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it("shows an accessible Sessions notification count for athlete and coach bookings", async () => {
    const memberId = "member-1";
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Ali Member", email: "ali@example.com", role: "ATHLETE", capabilities: { administrator: false, coachStatus: "APPROVED" } } }),
      });
      if (String(input) === "/api/schedule") return Promise.resolve({
        ok: true,
        json: async () => ({
          userId: memberId,
          bookings: [
            { bookingId: "incoming", coachId: memberId, athleteId: "athlete-2", status: "REQUESTED" },
            { bookingId: "outgoing", coachId: "coach-2", athleteId: memberId, status: "CONFIRMED", meetingDetails: "Join https://meet.example/session" },
            { bookingId: "old", coachId: memberId, athleteId: "athlete-3", status: "COMPLETED" },
          ],
          slots: [],
        }),
      });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SiteHeader />);

    const sessions = await screen.findByRole("link", { name: "Sessions, 2 updates" });
    expect(sessions).toHaveAttribute("href", "/sessions");
    expect(screen.getByTestId("sessions-notification")).toHaveTextContent("2");
  });

  it("notifies an athlete only after confirmed meeting details are shared", async () => {
    const memberId = "athlete-1";
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Ali Athlete", email: "athlete@example.com", role: "ATHLETE", capabilities: { administrator: false, coachStatus: null } } }),
      });
      if (String(input) === "/api/schedule") return Promise.resolve({
        ok: true,
        json: async () => ({
          userId: memberId,
          bookings: [
            { bookingId: "waiting", coachId: "coach-1", athleteId: memberId, status: "CONFIRMED", meetingDetails: null },
            { bookingId: "shared", coachId: "coach-2", athleteId: memberId, status: "CONFIRMED", meetingDetails: "Join https://meet.example/session" },
            { bookingId: "own-request", coachId: "coach-3", athleteId: memberId, status: "REQUESTED", meetingDetails: null },
          ],
          slots: [],
        }),
      });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }));

    render(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "Sessions, 1 update" })).toHaveAttribute("href", "/sessions");
    expect(screen.getByTestId("sessions-notification")).toHaveTextContent("1");
    fireEvent.click(await screen.findByRole("button", { name: /open account menu for ali athlete/i }));
    expect(screen.getByRole("menuitem", { name: "Sessions and bookings, 1 update" })).toHaveAttribute("href", "/sessions");
  });

  it("refreshes meeting-detail notifications when the athlete returns to the tab", async () => {
    const memberId = "athlete-1";
    let scheduleReads = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Ali Athlete", email: "athlete@example.com", role: "ATHLETE", capabilities: { administrator: false, coachStatus: null } } }),
      });
      if (String(input) === "/api/schedule") {
        scheduleReads += 1;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            userId: memberId,
            bookings: [{
              bookingId: "confirmed",
              coachId: "coach-1",
              athleteId: memberId,
              status: "CONFIRMED",
              meetingDetails: scheduleReads > 1 ? "Join https://meet.example/session" : null,
            }],
            slots: [],
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }));

    render(<SiteHeader />);
    await waitFor(() => expect(scheduleReads).toBe(1));
    expect(screen.queryByTestId("sessions-notification")).not.toBeInTheDocument();

    fireEvent.focus(window);

    expect(await screen.findByRole("link", { name: "Sessions, 1 update" })).toHaveAttribute("href", "/sessions");
    expect(scheduleReads).toBe(2);
  });

  it("clears current session notifications when Sessions is opened and does not restore the same update", async () => {
    const memberId = "athlete-1";
    let scheduleReads = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Ali Athlete", email: "athlete@example.com", role: "ATHLETE", capabilities: { administrator: false, coachStatus: null } } }),
      });
      if (String(input) === "/api/schedule") {
        scheduleReads += 1;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            userId: memberId,
            bookings: [{
              bookingId: "confirmed",
              coachId: "coach-1",
              athleteId: memberId,
              status: "CONFIRMED",
              meetingDetails: "Join https://meet.example/session",
            }],
            slots: [],
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }));

    render(<SiteHeader />);
    const sessions = await screen.findByRole("link", { name: "Sessions, 1 update" });
    sessions.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(sessions);

    expect(screen.getByRole("link", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.queryByTestId("sessions-notification")).not.toBeInTheDocument();

    fireEvent.focus(window);
    await waitFor(() => expect(scheduleReads).toBe(2));
    expect(screen.queryByTestId("sessions-notification")).not.toBeInTheDocument();
  });

  it("merges notifications seen by another tab instead of replacing them", async () => {
    const memberId = "stale-tab-member-raw";
    let bookingId = "first-booking-raw";
    let scheduleReads = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Tab Member", email: "tab@example.com", role: "COACH", capabilities: { administrator: false, coachStatus: "APPROVED" } } }),
      });
      if (String(input) === "/api/schedule") {
        scheduleReads += 1;
        return Promise.resolve({
          ok: true,
          json: async () => ({ userId: memberId, bookings: [{ bookingId, coachId: memberId, athleteId: "athlete", status: "REQUESTED" }] }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }));

    render(<SiteHeader />);
    const firstSessions = await screen.findByRole("link", { name: "Sessions, 1 update" });
    firstSessions.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(firstSessions);
    const storageKey = window.localStorage.key(0);
    expect(storageKey).not.toBeNull();
    const firstSeen = JSON.parse(window.localStorage.getItem(storageKey!) ?? "[]") as string[];

    bookingId = "second-booking-raw";
    fireEvent.focus(window);
    await waitFor(() => expect(scheduleReads).toBe(2));
    expect(await screen.findByRole("link", { name: "Sessions, 1 update" })).toBeInTheDocument();
    const otherTabSeen = "n-other-tab-token";
    window.localStorage.setItem(storageKey!, JSON.stringify([...firstSeen, otherTabSeen]));
    const secondSessions = screen.getByRole("link", { name: "Sessions, 1 update" });
    secondSessions.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(secondSessions);

    const merged = JSON.parse(window.localStorage.getItem(storageKey!) ?? "[]") as string[];
    expect(merged).toEqual(expect.arrayContaining([...firstSeen, otherTabSeen]));
    expect(merged).toHaveLength(3);
  });

  it("persists only bounded opaque notification metadata without raw IDs", async () => {
    const memberId = "private-member-id-raw";
    const bookings = Array.from({ length: 140 }, (_, index) => ({
      bookingId: `private-booking-id-${index}-raw`,
      coachId: memberId,
      athleteId: "athlete",
      status: "REQUESTED",
    }));
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Private Coach", email: "private@example.com", role: "COACH", capabilities: { administrator: false, coachStatus: "APPROVED" } } }),
      });
      if (String(input) === "/api/schedule") return Promise.resolve({ ok: true, json: async () => ({ userId: memberId, bookings }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }));

    render(<SiteHeader />);
    const sessions = await screen.findByRole("link", { name: "Sessions, 128 updates" });
    sessions.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(sessions);

    const persisted = Array.from({ length: window.localStorage.length }, (_, index) => {
      const key = window.localStorage.key(index) ?? "";
      return `${key}:${window.localStorage.getItem(key) ?? ""}`;
    }).join("|");
    expect(persisted).not.toContain(memberId);
    expect(persisted).not.toContain("private-booking-id-");
    expect(persisted).not.toContain("request:");
    expect(JSON.parse(window.localStorage.getItem(window.localStorage.key(0)!) ?? "[]")).toHaveLength(128);
  });

  it("clears the badge from the mobile Sessions menu and keeps it read on focus", async () => {
    const memberId = "mobile-member";
    let scheduleReads = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Mobile Member", email: "mobile@example.com", role: "ATHLETE", capabilities: { administrator: false, coachStatus: null } } }),
      });
      if (String(input) === "/api/schedule") {
        scheduleReads += 1;
        return Promise.resolve({ ok: true, json: async () => ({ userId: memberId, bookings: [{ bookingId: "mobile-booking", coachId: "coach", athleteId: memberId, status: "CONFIRMED", meetingDetails: "Join call" }] }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }));

    render(<SiteHeader />);
    await screen.findByRole("link", { name: "Sessions, 1 update" });
    fireEvent.click(screen.getByRole("button", { name: /open account menu for mobile member/i }));
    const mobileSessions = screen.getByRole("menuitem", { name: "Sessions and bookings, 1 update" });
    mobileSessions.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(mobileSessions);

    expect(screen.queryByTestId("sessions-notification")).not.toBeInTheDocument();
    fireEvent.focus(window);
    await waitFor(() => expect(scheduleReads).toBe(2));
    expect(screen.queryByTestId("sessions-notification")).not.toBeInTheDocument();
  });

  it("removes only the current account notification metadata after logout", async () => {
    const memberId = "logout-member-raw";
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/auth/session") return Promise.resolve({
        ok: true,
        json: async () => ({ user: { id: memberId, displayName: "Logout Member", email: "logout@example.com", role: "COACH", capabilities: { administrator: false, coachStatus: "APPROVED" } } }),
      });
      if (String(input) === "/api/schedule") return Promise.resolve({ ok: true, json: async () => ({ userId: memberId, bookings: [{ bookingId: "logout-booking-raw", coachId: memberId, athleteId: "athlete", status: "REQUESTED" }] }) });
      if (String(input) === "/api/auth/logout") return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }));

    window.localStorage.setItem("unrelated-preference", "keep-me");
    render(<SiteHeader />);
    const sessions = await screen.findByRole("link", { name: "Sessions, 1 update" });
    sessions.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(sessions);
    expect(window.localStorage.length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: /open account menu for logout member/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

    await waitFor(() => expect(screen.getByRole("link", { name: /^sign in$/i })).toBeInTheDocument());
    expect(window.localStorage.getItem("unrelated-preference")).toBe("keep-me");
    expect(window.localStorage.length).toBe(1);
  });

  it("does not falsely show a signed-in member as logged out while session is loading", async () => {
    let resolveSession: ((value: unknown) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((resolve) => { resolveSession = resolve; })));

    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/checking account/i)).toBeInTheDocument();

    resolveSession?.({
      ok: true,
      json: async () => ({ user: null }),
    });
    await waitFor(() => expect(screen.getByRole("link", { name: /^sign in$/i })).toBeInTheDocument());
  });

  it("routes anonymous coach applicants through sign in and back to the application", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) }));

    render(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "Become a coach" })).toHaveAttribute(
      "href",
      "/account?next=%2Fcoach%2Fapply",
    );
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/account");
  });

  it("turns the coach action into profile management after approval", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: "coach-1",
          displayName: "Coach One",
          email: "coach@example.com",
          role: "ATHLETE",
          capabilities: { administrator: false, coachStatus: "APPROVED" },
        },
      }),
    }));

    render(<SiteHeader />);

    fireEvent.click(await screen.findByRole("button", { name: /open account menu for coach one/i }));
    expect(screen.getByRole("menuitem", { name: "Coach profile" })).toHaveAttribute("href", "/coach/apply");
    expect(screen.queryByRole("menuitem", { name: "Become a coach" })).not.toBeInTheDocument();
  });
});
