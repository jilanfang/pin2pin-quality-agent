"use client";

import React, { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const action =
        mode === "sign_in"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password });
      const { error: authError } = await action;
      if (authError) throw authError;
      window.location.href = "/";
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "认证失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-panel" aria-label="登录面板">
      <div className="auth-copy">
        <span className="auth-kicker">Pin2pin Fireline</span>
        <h1>{mode === "sign_in" ? "登录后继续处理调查" : "创建账号开始试用"}</h1>
        <p>只保留最小登录能力，进入后直接回到总览与调查工作台。</p>
      </div>

      <div className="auth-form">
        <label>
          邮箱
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
          />
        </label>
        {error ? <div className="auth-error">{error}</div> : null}
        <button type="button" onClick={() => void submit()} disabled={loading || !email || !password}>
          {loading ? "处理中..." : mode === "sign_in" ? "登录" : "创建账号"}
        </button>
        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode((value) => (value === "sign_in" ? "sign_up" : "sign_in"))}
          disabled={loading}
        >
          {mode === "sign_in" ? "没有账号？创建一个" : "已有账号？直接登录"}
        </button>
      </div>
    </section>
  );
}
