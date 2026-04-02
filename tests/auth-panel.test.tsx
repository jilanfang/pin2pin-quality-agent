import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthPanel } from "@/components/auth-panel";

describe("AuthPanel", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        href: "/login",
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the backend error for invalid credentials and stays on the login screen", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: "用户名或密码错误",
        }),
        { status: 401 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("用户名或密码错误")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("/login");
  });

  it("submits login only once when the action is double-clicked before the loading state paints", async () => {
    let resolveLogin: ((value: Response) => void) | null = null;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveLogin = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Pin2pin!2026" } });

    const button = screen.getByRole("button", { name: "登录" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(resolveLogin).toBeTypeOf("function");
    resolveLogin!(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
  });

  it("allows editing and retrying after a failed login attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "用户名或密码错误",
          }),
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("用户名或密码错误")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
