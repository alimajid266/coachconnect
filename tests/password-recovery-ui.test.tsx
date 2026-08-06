import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "@/app/account/page";
import ResetPasswordPage from "@/app/account/reset-password/page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("password recovery UI", () => {
  it("requests a reset email from the sign-in form", async () => {
    const confirmationMessage = "Check your inbox for password reset instructions.";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      return {
        ok: true,
        json: async () => String(input) === "/api/auth/session"
          ? ({ user: null })
          : ({ message: confirmationMessage }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountPage />);
    fireEvent.change(await screen.findByLabelText(/^email/i), {
      target: { value: "athlete@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/forgot-password");
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toEqual({ email: "athlete@example.com" });
    expect(await screen.findByRole("status")).toHaveTextContent(confirmationMessage);
    expect(screen.queryByText(/if an account exists/i)).not.toBeInTheDocument();
  });

  it("changes a matching password and returns to sign in", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Password updated. You can now sign in." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ResetPasswordPage />);
    expect(document.body.textContent).not.toMatch(/private by default|sample|prototype|fictional/i);
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "New-Private-Passphrase-42" },
    });
    fireEvent.change(screen.getByLabelText(/re-enter new password/i), {
      target: { value: "New-Private-Passphrase-42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/update-password");
    expect(await screen.findByRole("status")).toHaveTextContent(/password updated/i);
    expect(screen.getByRole("link", { name: /return to sign in/i })).toHaveAttribute("href", "/account");
  });

  it("requires the two new-password entries to match before submitting", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "First-Private-Passphrase-42" },
    });
    fireEvent.change(screen.getByLabelText(/re-enter new password/i), {
      target: { value: "Different-Private-Passphrase-42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
