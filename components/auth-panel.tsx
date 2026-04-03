"use client";

import React, { useState } from "react";
import { useRef } from "react";

type AuthPanelProps = {
  allowSelfRegister?: boolean;
  requiresInvite?: boolean;
};

export function AuthPanel({ allowSelfRegister = false, requiresInvite = false }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockedRef = useRef(false);

  async function submit() {
    if (submitLockedRef.current) return;
    submitLockedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      if (mode === "register" && password !== confirmPassword) {
        throw new Error("两次输入的密码不一致");
      }

      if (mode === "register" && !allowSelfRegister) {
        throw new Error("当前未开放注册");
      }

      if (mode === "register" && requiresInvite && !inviteCode.trim()) {
        throw new Error("请输入邀请码");
      }

      const payloadBody =
        mode === "register"
          ? { username, password, inviteCode: inviteCode.trim() || undefined }
          : { username, password };
      const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "认证失败");
      }
      window.location.href = "/";
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "认证失败");
    } finally {
      submitLockedRef.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="auth-panel" aria-label="登录面板">
      <div className="auth-copy">
        <span className="auth-kicker">Pin2pin Fireline</span>
        <div className="auth-mode-tabs" role="tablist" aria-label="认证方式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            登录
          </button>
          {allowSelfRegister ? (
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              注册
            </button>
          ) : null}
        </div>
        <h1>{allowSelfRegister && mode === "register" ? "输入邀请码，创建账号" : "账号登录"}</h1>
        <p>
          {allowSelfRegister && mode === "register"
            ? requiresInvite
              ? "填邀请码、用户名和密码，注册后直接进入工作区。"
              : "填用户名和密码，注册后直接进入工作区。"
            : "输入用户名和密码，直接进入工作区。"}
        </p>
        {allowSelfRegister && mode === "register" ? (
          <div className="auth-note">{requiresInvite ? "需要邀请码" : "开放注册中"}</div>
        ) : null}
      </div>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label>
          用户名
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="输入用户名"
            autoComplete="username"
            autoFocus
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "register" ? "至少 8 位密码" : "输入登录密码"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </label>
        {mode === "register" ? (
          <label>
            邀请码
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder={requiresInvite ? "输入邀请码" : "如有邀请码可填写"}
              autoComplete="off"
            />
          </label>
        ) : null}
        {mode === "register" ? (
          <label>
            确认密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="再次输入密码"
              autoComplete="new-password"
            />
          </label>
        ) : null}
        {error ? <div className="auth-error">{error}</div> : null}
        <button
          type="submit"
          disabled={
            loading ||
            !username ||
            !password ||
            (mode === "register" && !confirmPassword) ||
            (mode === "register" && requiresInvite && !inviteCode.trim()) ||
            (mode === "register" && !allowSelfRegister)
          }
        >
          {loading ? "处理中..." : mode === "register" ? "创建账号" : "登录"}
        </button>
      </form>
    </section>
  );
}
