"use client";

import React from "react";

type SovereignShellProps = {
  activeSection?: "Workspace";
  hasCases?: boolean;
  children: React.ReactNode;
};

const navItems: Array<{
  label: SovereignShellProps["activeSection"];
  href: string;
}> = [
  { label: "Workspace", href: "/" },
];

const railItems = [
  { label: "会话", sublabel: "ACTIVE", action: null, active: true },
  { label: "案件", sublabel: "CASES", action: "fireline:toggle-case-drawer", active: false },
] as const;

function dispatchShellEvent(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

export function SovereignShell({
  activeSection = "Workspace",
  children,
}: SovereignShellProps) {
  return (
    <div className="sovereign-shell" data-testid="sovereign-shell">
      <header className="sovereign-topbar">
        <div className="sovereign-brand-block">
          <span className="sovereign-brand">Pin2pin Fireline</span>
          <span className="sovereign-brand-subtitle">Sovereign</span>
        </div>

        <nav className="sovereign-nav" aria-label="主导航">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.label === activeSection ? "page" : undefined}
              onClick={(event) => {
                if (item.href === "#") {
                  event.preventDefault();
                }
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sovereign-utilities">
          <span className="shell-status-chip">CASE + CHAT ONLY</span>
        </div>
      </header>

      <div className="sovereign-body">
        <aside className="sovereign-rail" aria-label="工具侧栏">
          <div className="rail-status">
            <div className="rail-avatar">PF</div>
            <span>ACTIVE</span>
          </div>

          <nav className="rail-nav" aria-label="工具导航">
            {railItems.map((item) => (
              item.action ? (
                <button
                  key={item.label}
                  className={`shell-rail-button${item.active ? " active" : ""}`}
                  type="button"
                  onClick={() => dispatchShellEvent(item.action)}
                >
                  <span className="shell-rail-icon" aria-hidden="true">
                    {item.label.slice(0, 1)}
                  </span>
                  <span>{item.sublabel}</span>
                </button>
              ) : (
                <div key={item.label} className={`shell-rail-label${item.active ? " active" : ""}`}>
                  <span className="shell-rail-icon" aria-hidden="true">
                    {item.label.slice(0, 1)}
                  </span>
                  <span>{item.sublabel}</span>
                </div>
              )
            ))}
          </nav>
        </aside>

        <section className="sovereign-stage">{children}</section>

        <aside className="sovereign-report-rail shell-rail-empty" aria-hidden="true" />
      </div>

      <style>{`
        .sovereign-shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(177, 95, 0, 0.07), transparent 18%),
            radial-gradient(circle at bottom right, rgba(0, 99, 153, 0.08), transparent 20%),
            var(--bg);
        }

        .sovereign-topbar {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 22px;
          min-height: 48px;
          padding: 6px 16px 7px;
          background: rgba(248, 249, 250, 0.82);
          border-bottom: 1px solid var(--line);
          backdrop-filter: blur(18px);
        }

        .sovereign-brand-block {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sovereign-brand {
          font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.04em;
          color: var(--text);
          white-space: nowrap;
        }

        .sovereign-brand-subtitle {
          color: var(--muted);
          font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .sovereign-nav {
          display: flex;
          align-items: center;
          gap: 18px;
          min-width: 0;
        }

        .sovereign-nav a {
          position: relative;
          padding: 4px 0;
          color: var(--muted);
          font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .sovereign-nav a[aria-current="page"] {
          color: var(--brand);
        }

        .sovereign-nav a[aria-current="page"]::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: -9px;
          left: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--brand), var(--brand-strong));
        }

        .sovereign-utilities {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .shell-status-chip {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid rgba(219, 194, 176, 0.24);
          background: rgba(255, 255, 255, 0.72);
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .sovereign-body {
          display: grid;
          grid-template-columns: 50px minmax(0, 1fr) 38px;
          flex: 1;
          min-height: 0;
        }

        .sovereign-rail,
        .sovereign-report-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 12px 6px;
          background: rgba(243, 244, 245, 0.72);
        }

        .sovereign-rail {
          border-right: 1px solid var(--line);
        }

        .sovereign-report-rail {
          border-left: 1px solid var(--line);
          justify-content: space-between;
        }

        .rail-status {
          display: grid;
          justify-items: center;
          gap: 6px;
        }

        .rail-avatar {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          background: linear-gradient(135deg, rgba(0, 99, 153, 0.88), rgba(177, 95, 0, 0.82));
          color: white;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .rail-status span,
        .report-rail-label {
          color: var(--muted);
          font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
        }

        .rail-nav {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 100%;
        }

        .shell-rail-button,
        .shell-rail-label,
        .report-rail-trigger {
          display: grid;
          justify-items: center;
          gap: 3px;
          width: 100%;
          border: 0;
          border-radius: 8px;
          padding: 7px 2px;
          background: transparent;
          color: var(--muted);
        }

        .shell-rail-button,
        .report-rail-trigger {
          cursor: pointer;
        }

        .shell-rail-button.active {
          background: rgba(255, 255, 255, 0.82);
          color: var(--brand);
        }

        .shell-rail-label {
          cursor: default;
          opacity: 0.72;
        }

        .shell-rail-label.active {
          background: rgba(255, 255, 255, 0.82);
          color: var(--brand);
          opacity: 1;
        }

        .shell-rail-button span:last-child {
          font-size: 9px;
          letter-spacing: 0.14em;
        }

        .shell-rail-icon {
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.6);
          font-size: 10px;
          font-weight: 700;
        }

        .shell-rail-button.active .shell-rail-icon,
        .report-rail-trigger {
          background: rgba(255, 255, 255, 0.92);
        }

        .report-rail-trigger {
          width: 28px;
          height: 28px;
          padding: 0;
          color: var(--secondary);
          font-size: 11px;
          font-weight: 800;
        }

        .report-rail-label {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }

        .sovereign-stage {
          position: relative;
          min-width: 0;
          min-height: 0;
          padding: 14px 0 18px;
        }

        @media (max-width: 1100px) {
          .sovereign-topbar {
            grid-template-columns: 1fr;
            justify-items: start;
            gap: 12px;
          }

          .sovereign-utilities {
            width: 100%;
            justify-content: space-between;
          }
        }

        @media (max-width: 880px) {
          .sovereign-body {
            grid-template-columns: 1fr;
            grid-template-rows: auto minmax(0, 1fr) auto;
          }

          .sovereign-rail,
          .sovereign-report-rail {
            flex-direction: row;
            justify-content: space-between;
            padding: 10px 12px;
          }

          .sovereign-rail {
            border-right: 0;
            border-bottom: 1px solid var(--line);
          }

          .sovereign-report-rail {
            border-left: 0;
            border-top: 1px solid var(--line);
          }

          .rail-status {
            grid-auto-flow: column;
            align-items: center;
          }

          .rail-nav {
            flex-direction: row;
            justify-content: center;
            overflow: auto;
          }

          .shell-rail-button {
            width: auto;
            min-width: 54px;
          }

          .report-rail-label {
            writing-mode: initial;
          }
        }

        @media (max-width: 720px) {
          .sovereign-nav {
            flex-wrap: wrap;
            gap: 12px;
          }

          .sovereign-stage {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
