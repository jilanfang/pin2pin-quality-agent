"use client";

import React, { useEffect, useState } from "react";

type OverviewPayload = {
  stats: {
    activeInvestigations: number;
    pendingEvidence: number;
    readyArtifacts: number;
  };
  recentInvestigations: Array<{
    id: string;
    title: string;
    stageLabel: string;
    statusLabel: string;
    updatedAtLabel: string;
    href: string;
  }>;
  artifactHighlights: Array<{
    caseId: string;
    caseTitle: string;
    artifactKind: "analysis_summary" | "action_plan";
    artifactLabel: string;
    href: string;
  }>;
};

async function readJson(response: Response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || "请求失败");
  }
  return response.json();
}

export function Overview() {
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      try {
        const nextPayload = (await readJson(await fetch("/api/overview"))) as OverviewPayload;
        if (!cancelled) {
          setPayload(nextPayload);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "加载总览失败");
        }
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startNewInvestigation() {
    try {
      setCreating(true);
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "新的调查",
        }),
      });
      const created = await readJson(response);
      window.location.href = `/investigations/${created.id}`;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "创建调查失败");
    } finally {
      setCreating(false);
    }
  }

  const recentInvestigations = payload?.recentInvestigations ?? [];
  const artifactHighlights = payload?.artifactHighlights ?? [];

  return (
    <main className="overview-page" aria-label="总览页">
      <section className="overview-hero overview-panel">
        <div className="overview-hero-copy">
          <span className="overview-eyebrow">总览</span>
          <h1>导入客诉材料，生成 24h 初版 8D</h1>
          <p>先把投诉邮件、会议纪要、照片和现场碎片收拢成一版能交差的快速响应版，再继续补验证。</p>
          <div className="overview-hero-actions">
            <button type="button" className="overview-primary" onClick={() => void startNewInvestigation()} disabled={creating}>
              {creating ? "创建中…" : "开始快速响应"}
            </button>
            <a
              className="overview-secondary"
              href={recentInvestigations[0]?.href ?? "/investigations"}
            >
              继续最近调查
            </a>
          </div>
        </div>
        <div className="overview-stats" aria-label="状态卡">
          <article className="overview-stat-card">
            <strong>{payload?.stats.activeInvestigations ?? 0}</strong>
            <span>进行中的调查</span>
          </article>
          <article className="overview-stat-card">
            <strong>{payload?.stats.pendingEvidence ?? 0}</strong>
            <span>待补证据</span>
          </article>
          <article className="overview-stat-card">
            <strong>{payload?.stats.readyArtifacts ?? 0}</strong>
            <span>可导出结果</span>
          </article>
        </div>
      </section>

      {error ? <div className="overview-alert">{error}</div> : null}

      <section className="overview-grid">
        <section className="overview-panel">
          <div className="overview-section-head">
            <h2>最近调查</h2>
            <a href="/investigations">查看全部</a>
          </div>
          {recentInvestigations.length ? (
            <div className="overview-list">
              {recentInvestigations.map((item) => (
                <a key={item.id} className="overview-investigation-card" href={item.href}>
                  <strong>{item.title}</strong>
                  <div className="overview-inline-meta">
                    <span>{item.stageLabel}</span>
                    <span>{item.statusLabel}</span>
                    <span>{item.updatedAtLabel}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="overview-empty">
              <strong>还没有异常响应，先开始快速响应。</strong>
              <p>从一条真实客诉或现场异常开始，先把 24h 初版站稳。</p>
            </div>
          )}
        </section>

        <section className="overview-panel">
          <div className="overview-section-head">
            <h2>结果产物入口</h2>
          </div>
          {artifactHighlights.length ? (
            <div className="overview-list">
              {artifactHighlights.map((item) => (
                <a key={`${item.caseId}-${item.artifactKind}`} className="overview-investigation-card" href={item.href}>
                  <strong>{item.artifactLabel}</strong>
                  <div className="overview-inline-meta">
                    <span>{item.caseTitle}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="overview-empty">
              <strong>还没有可直接查看的结果产物。</strong>
              <p>先推进一条异常响应，随后再回到这里查看 24h 初版 8D 或行动方案。</p>
            </div>
          )}
        </section>

        <section className="overview-panel overview-copilot-card">
          <div className="overview-section-head">
            <h2>补充方法问题</h2>
            <a href="/copilot">进入</a>
          </div>
          <p>需要脱离具体 case 补问 8D、CAPA、5Why、FMEA 等方法问题时，再进这里。</p>
          <a className="overview-secondary" href="/copilot">
            打开方法助手
          </a>
        </section>
      </section>

      <style>{`
        .overview-page {
          display: grid;
          gap: 16px;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 4px 0 24px;
        }

        .overview-panel {
          border: 1px solid rgba(255, 255, 255, 0.56);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: var(--shadow);
          padding: 20px;
        }

        .overview-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
          gap: 18px;
          align-items: stretch;
        }

        .overview-eyebrow {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .overview-hero-copy {
          display: grid;
          gap: 10px;
        }

        .overview-hero-copy h1 {
          margin: 0;
          font-size: 36px;
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .overview-hero-copy p {
          margin: 0;
          max-width: 620px;
          color: var(--muted);
          font-size: 15px;
        }

        .overview-hero-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 8px;
        }

        .overview-primary,
        .overview-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
        }

        .overview-primary {
          border: 1px solid rgba(0, 99, 153, 0.18);
          background: rgba(0, 99, 153, 0.92);
          color: #fff;
          cursor: pointer;
        }

        .overview-secondary {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.76);
          color: var(--text);
        }

        .overview-stats {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .overview-stat-card {
          display: grid;
          gap: 6px;
          align-content: start;
          padding: 16px;
          border-radius: 18px;
          background: rgba(248, 249, 250, 0.88);
          border: 1px solid var(--line);
        }

        .overview-stat-card strong {
          font-size: 26px;
          line-height: 1;
        }

        .overview-stat-card span {
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
          gap: 16px;
        }

        .overview-section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .overview-section-head h2 {
          margin: 0;
          font-size: 20px;
        }

        .overview-section-head a {
          color: var(--secondary);
          font-size: 12px;
          font-weight: 700;
        }

        .overview-list {
          display: grid;
          gap: 12px;
        }

        .overview-investigation-card {
          display: grid;
          gap: 8px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: rgba(248, 249, 250, 0.72);
        }

        .overview-investigation-card strong {
          font-size: 15px;
        }

        .overview-inline-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: var(--muted);
          font-size: 12px;
        }

        .overview-empty {
          display: grid;
          gap: 8px;
          padding: 22px 18px;
          border-radius: 16px;
          border: 1px dashed var(--line-strong);
          background: rgba(248, 249, 250, 0.68);
        }

        .overview-empty strong,
        .overview-empty p {
          margin: 0;
        }

        .overview-empty p,
        .overview-copilot-card p {
          color: var(--muted);
        }

        .overview-copilot-card {
          grid-column: 2;
        }

        .overview-alert {
          color: var(--danger);
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .overview-hero,
          .overview-grid {
            grid-template-columns: 1fr;
          }

          .overview-copilot-card {
            grid-column: auto;
          }
        }

        @media (max-width: 720px) {
          .overview-stats {
            grid-template-columns: 1fr;
          }

          .overview-hero-copy h1 {
            font-size: 30px;
          }

          .overview-hero-actions {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </main>
  );
}
