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
      expect(window.location.href).toBe("/workspace");
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
      expect(window.location.href).toBe("/workspace");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("switches to register mode and auto-logs in after a successful registration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel allowSelfRegister requiresInvite />);

    fireEvent.click(screen.getByRole("tab", { name: "注册" }));

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "new-user" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.change(screen.getByLabelText("邀请码"), { target: { value: "FIRELINE-INVITE" } });
    fireEvent.change(screen.getByLabelText("确认密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username: "new-user",
            password: "Pin2pin!2026",
            inviteCode: "FIRELINE-INVITE",
          }),
        })
      );
      expect(window.location.href).toBe("/workspace");
    });
  });

  it("blocks registration when password confirmation does not match", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel allowSelfRegister />);

    fireEvent.click(screen.getByRole("tab", { name: "注册" }));

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "new-user" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.change(screen.getByLabelText("确认密码"), { target: { value: "Mismatch!2026" } });
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    expect(await screen.findByText("两次输入的密码不一致")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.href).toBe("/login");
  });

  it("shows backend registration errors and lets the user retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "用户名已被占用",
          }),
          { status: 409 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel allowSelfRegister />);

    fireEvent.click(screen.getByRole("tab", { name: "注册" }));
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "existing-user" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.change(screen.getByLabelText("确认密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    expect(await screen.findByText("用户名已被占用")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "new-user" } });
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      expect(window.location.href).toBe("/workspace");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a backend disabled-registration message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "当前未开放注册",
        }),
        { status: 403 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel />);

    expect(screen.queryByRole("tab", { name: "注册" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "账号登录" })).toBeInTheDocument();
    expect(window.location.href).toBe("/login");
  });

  it("blocks registration when invite code is required but missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel allowSelfRegister requiresInvite />);

    fireEvent.click(screen.getByRole("tab", { name: "注册" }));
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "new-user" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.change(screen.getByLabelText("确认密码"), { target: { value: "Pin2pin!2026" } });

    expect(screen.getByRole("button", { name: "创建账号" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits the login form when pressing Enter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPanel />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "Pin2pin!2026" } });
    fireEvent.submit(screen.getByRole("button", { name: "登录" }).closest("form")!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe("/workspace");
    });
  });
});
