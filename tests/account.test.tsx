import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "@/app/account/page";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("account page", () => {
  it("creates one member account without locking athlete or coach roles", () => {
    render(<AccountPage />);

    expect(screen.getByRole("heading", { name: /your next move starts here/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /athlete training/i })).toBeInTheDocument();
    expect(screen.queryByText(/phase\s*2/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/private by default|private account|sample|prototype|fictional/i);
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("minLength", "12");
    expect(screen.getByLabelText(/re-enter your password/i)).toHaveAttribute("minLength", "12");
    expect(screen.queryByRole("combobox", { name: /account type/i })).not.toBeInTheDocument();
    expect(screen.getByText(/one account lets you find coaching and apply to coach/i)).toBeInTheDocument();
  });

  it("accepts the Supabase login contract and shows the dashboard handoff", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Private-Test-Passphrase-42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in securely/i }));

    expect(await screen.findByRole("link", { name: /open my dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByDisplayValue("Private-Test-Passphrase-42")).not.toBeInTheDocument();
  });

  it("asks the user to confirm their email when Supabase requires it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pendingEmailConfirmation: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Ali Athlete" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Private-Test-Passphrase-42" },
    });
    fireEvent.change(screen.getByLabelText(/re-enter your password/i), {
      target: { value: "Private-Test-Passphrase-42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create my account/i }));

    expect(await screen.findByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByText(/confirmation link/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open my dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Private-Test-Passphrase-42")).not.toBeInTheDocument();
  });

  it("registers without exposing the password and shows a dashboard handoff", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 7, displayName: "Ali Athlete", email: "ali@example.com", role: "ATHLETE" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Ali Athlete" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Private-Test-Passphrase-42" },
    });
    fireEvent.change(screen.getByLabelText(/re-enter your password/i), {
      target: { value: "Private-Test-Passphrase-42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create my account/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/register");
    const submitted = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(submitted).toMatchObject({ email: "ali@example.com" });
    expect(submitted).not.toHaveProperty("role");
    expect(screen.queryByDisplayValue("Private-Test-Passphrase-42")).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /open my dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("blocks registration when the passwords do not match", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Ali Athlete" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "ali@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Private-Test-Passphrase-42" },
    });
    fireEvent.change(screen.getByLabelText(/re-enter your password/i), {
      target: { value: "Different-Test-Passphrase-42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create my account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/passwords do not match/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enables another confirmation email after a 30 second cooldown", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Confirmation email requested." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);

    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: "ali@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /resend confirmation email/i }));
    });

    expect(screen.getByRole("button", { name: /resend available in 30s/i })).toBeDisabled();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByRole("button", { name: /resend confirmation email/i })).toBeEnabled();
  });
});
