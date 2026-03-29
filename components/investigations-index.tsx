"use client";

import React, { useEffect, useState } from "react";

type CaseSummary = {
  id: string;
  title: string;
  status: string;
  archivedAt: string | null;
  currentStage: string;
  mode: string;
  d1Status: string;
  updatedAt: string;
};

async function readJson(response: Response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || "请求失败");
  }
  return response.json();
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvestigationsIndex() {
  const [items, setItems] = useState<CaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = (await readJson(await fetch("/api/cases"))) as CaseSummary[];
        if (!cancelled) {
          setItems(payload);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "加载调查失败");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="investigations-index" aria-label="调查列表页">
      <section className="investigations-panel">
        <div className="investigations-head">
          <div>
            <span className="investigations-eyebrow">调查</span>
            <h1>调查</h1>
          </div>
          <a className="investigations-primary" href="/">
            返回总览
          </a>
        </div>

        {error ? <div className="investigations-error">{error}</div> : null}

        <div className="investigations-list">
          {items.map((item) => (
            <a key={item.id} href={`/investigations/${item.id}`} className="investigations-item">
              <strong>{item.title}</strong>
              <span>{item.currentStage}</span>
              <span>{formatTime(item.updatedAt)}</span>
            </a>
          ))}
        </div>
      </section>

      <style>{`
        .investigations-index {
          width: min(980px, 100%);
          margin: 0 auto;
        }

        .investigations-panel {
          padding: 22px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.56);
          box-shadow: var(--shadow);
        }

        .investigations-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          margin-bottom: 16px;
        }

        .investigations-head h1 {
          margin: 8px 0 0;
          font-size: 28px;
        }

        .investigations-eyebrow {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .investigations-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.8);
          font-weight: 700;
        }

        .investigations-list {
          display: grid;
          gap: 12px;
        }

        .investigations-item {
          display: grid;
          gap: 6px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(248, 249, 250, 0.82);
          border: 1px solid var(--line);
        }

        .investigations-item span,
        .investigations-error {
          color: var(--muted);
          font-size: 12px;
        }

        .investigations-error {
          margin-bottom: 12px;
          color: var(--danger);
          font-weight: 700;
        }
      `}</style>
    </main>
  );
}
