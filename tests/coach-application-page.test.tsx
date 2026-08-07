import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByLabelText(/add another sport/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/profile tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/coach ad images/i)).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(screen.getByLabelText(/coach ad images/i)).toHaveAttribute("multiple");
    expect(screen.getByText(/up to five images for your public coach ad/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /people you coach/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /training formats/i })).toBeInTheDocument();
    expect(screen.getByText(/never enter a home address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit for review/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CoachConnect home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it("adds a custom sport and moderated tags to the saved draft", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ application: null }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ application: null }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachApplicationPage />);
    await screen.findByRole("heading", { name: /build your coach profile/i });
    fireEvent.change(screen.getByLabelText(/add another sport/i), { target: { value: "Squash" } });
    fireEvent.click(screen.getByRole("button", { name: /^add sport$/i }));
    fireEvent.change(screen.getByLabelText(/profile tags/i), { target: { value: "Match preparation" } });
    fireEvent.click(screen.getByRole("button", { name: /^add tag$/i }));
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    const savedBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(savedBody.sports).toContain("Squash");
    expect(savedBody.tags).toContain("Match preparation");
  });

  it("explains which filled fields are too short before submitting", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ application: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachApplicationPage />);
    await screen.findByRole("heading", { name: /build your coach profile/i });

    fireEvent.change(screen.getByLabelText(/professional headline/i), { target: { value: "Coach" } });
    fireEvent.change(screen.getByLabelText(/coaching biography/i), { target: { value: "I coach." } });
    fireEvent.click(screen.getByLabelText("Tennis"));
    fireEvent.change(screen.getByLabelText(/years of coaching experience/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Qualifications"), { target: { value: "Coach" } });
    fireEvent.click(screen.getByLabelText("Adults"));
    fireEvent.click(screen.getByLabelText("Beginner"));
    fireEvent.change(screen.getByLabelText("Lesson plan"), { target: { value: "Warm up." } });
    fireEvent.change(screen.getByLabelText(/session price/i), { target: { value: "3000" } });
    fireEvent.click(screen.getByLabelText("Online"));
    fireEvent.change(screen.getByLabelText("Question 1"), { target: { value: "What should I bring?" } });
    fireEvent.change(screen.getByLabelText("Answer 1"), { target: { value: "Comfortable sportswear." } });

    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/professional headline.*at least 10 characters/i);
    expect(alert).toHaveTextContent(/coaching biography.*at least 80 characters/i);
    expect(alert).toHaveTextContent(/qualifications.*at least 10 characters/i);
    expect(alert).toHaveTextContent(/lesson plan.*at least 40 characters/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses intentional layouts for compact numbers and FAQ pairs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ application: null }),
    }));

    render(<CoachApplicationPage />);
    await screen.findByRole("heading", { name: /build your coach profile/i });

    expect(screen.getByLabelText(/years of coaching experience/i)).toHaveClass("application-number-input");
    expect(screen.getByLabelText("Question 1").closest("div")).toHaveClass("application-faq-fields");
  });

  it("describes a successful submission as CoachConnect team review", async () => {
    const application = {
      userId: "member-1",
      status: "DRAFT",
      headline: "Patient tennis coach",
      bio: "I help adult beginners build reliable technique, confidence, and safe training habits through structured sessions.",
      sports: ["Tennis"],
      experienceYears: 3,
      qualifications: "Certified tennis coach",
      audiences: ["Adults"],
      levels: ["Beginner"],
      lessonPlan: "We warm up, practise one focused skill, apply it in match play, and finish with feedback.",
      sessionPricePkr: 3000,
      offersOnline: true,
      offersInPerson: false,
      city: "",
      publicArea: "",
      availability: [],
      faqs: [],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ application }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ application }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ application: { ...application, status: "SUBMITTED" } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachApplicationPage />);
    await screen.findByRole("heading", { name: /build your coach profile/i });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Application submitted for CoachConnect team review.");
    expect(screen.queryByText(/administrator review/i)).not.toBeInTheDocument();
  });

  it("keeps later edits live after the coach has been approved once", async () => {
    const application = {
      userId: "member-1",
      status: "APPROVED",
      headline: "Patient tennis coach",
      bio: "I help adult beginners build reliable technique, confidence, and safe training habits through structured sessions.",
      sports: ["Tennis"],
      experienceYears: 3,
      qualifications: "Certified tennis coach",
      audiences: ["Adults"],
      levels: ["Beginner"],
      lessonPlan: "We warm up, practise one focused skill, apply it in match play, and finish with feedback.",
      sessionPricePkr: 3000,
      offersOnline: true,
      offersInPerson: false,
      city: "",
      publicArea: "",
      availability: [],
      faqs: [],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ application }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ application: { ...application, headline: "Patient online tennis coach", status: "APPROVED" } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachApplicationPage />);
    await screen.findByRole("heading", { name: /build your coach profile/i });
    expect(screen.getByRole("link", { name: /manage availability and bookings/i })).toHaveAttribute("href", "/account#schedule-heading");
    fireEvent.change(screen.getByLabelText(/professional headline/i), { target: { value: "Patient online tennis coach" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile updates/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Coach profile updates are live.");
    expect(screen.queryByText(/editing is paused while the team reviews/i)).not.toBeInTheDocument();
  });

  it("shows a suspension reason and a recovery path", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        application: {
          userId: "member-1",
          status: "SUSPENDED",
          reviewNote: "Please renew your safeguarding certificate before requesting reactivation.",
        },
      }),
    }));

    render(<CoachApplicationPage />);

    expect(await screen.findByText(/please renew your safeguarding certificate/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact support about reactivation/i })).toHaveAttribute("href", "mailto:support@coachconnect.pk?subject=Coach%20profile%20reactivation");
    expect(screen.getByText(/cannot be edited while it is suspended/i)).toBeInTheDocument();
  });
});
