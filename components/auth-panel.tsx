"use client";

import React, { useState } from "react";
import { useRef } from "react";

export function AuthPanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockedRef = useRef(false);

  async function submit() {
    if (submitLockedRef.current) return;
    submitLockedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ username, password }),
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
        <h1>账号登录</h1>
        <p>输入分配好的用户名和密码，直接进入调查工作区。</p>
      </div>

      <div className="auth-form">
        <label>
          用户名
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="alice"
            autoComplete="username"
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="输入登录密码"
            autoComplete="current-password"
          />
        </label>
        {error ? <div className="auth-error">{error}</div> : null}
        <button type="button" onClick={() => void submit()} disabled={loading || !username || !password}>
          {loading ? "处理中..." : "登录"}
        </button>
      </div>
    </section>
  );
}
