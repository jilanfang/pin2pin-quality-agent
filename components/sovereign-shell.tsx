"use client";

import React from "react";
import { usePathname } from "next/navigation";

type SovereignShellProps = {
  hasCases?: boolean;
  authEnabled?: boolean;
  isAuthenticated?: boolean;
  username?: string | null;
  children: React.ReactNode;
};

const navItems: Array<{
  label: "总览" | "调查" | "方法问题";
  href: string;
}> = [
  { label: "总览", href: "/" },
  { label: "调查", href: "/investigations" },
  { label: "方法问题", href: "/copilot" },
];

const railItems = [
  { label: "总", sublabel: "总览", action: null },
  { label: "调", sublabel: "调查", action: "fireline:toggle-case-drawer" },
] as const;

function dispatchShellEvent(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

export function SovereignShell({
  authEnabled = false,
  isAuthenticated = false,
  username = null,
  children,
}: SovereignShellProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isMarketingPage = pathname === "/" || pathname === "/product";
  const isWorkspaceEntryPage = pathname === "/workspace";
  const isEntryPage = isMarketingPage || isWorkspaceEntryPage || isLoginPage;
  const usesAppChrome = !isMarketingPage;
  const activeSection =
    pathname?.startsWith("/copilot")
      ? "方法问题"
      : pathname?.startsWith("/investigations")
        ? "调查"
        : pathname === "/workspace"
          ? "总览"
          : "总览";

  return (
    <div
      className={`sovereign-shell${isEntryPage ? " sovereign-shell-entry" : ""}${
        isLoginPage ? " sovereign-shell-login" : ""
      }`}
      data-testid="sovereign-shell"
    >
      <header
        className={`sovereign-topbar${isEntryPage ? " sovereign-topbar-entry" : ""}${
          isMarketingPage ? " sovereign-topbar-marketing" : ""
        }`}
      >
        <div className="sovereign-brand-block">
          <span className="sovereign-brand">Pin2pin Fireline</span>
          <span className="sovereign-brand-subtitle">
            {isMarketingPage ? "Quality Response Workbench" : "Investigation AI"}
          </span>
        </div>

        {usesAppChrome ? (
          <nav className="sovereign-nav" aria-label="主导航">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href === "/" ? "/workspace" : item.href}
                aria-current={item.label === activeSection ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : (
          <nav className="sovereign-nav" aria-label="主导航">
            <a href="/" aria-current={pathname === "/" ? "page" : undefined}>
              首页
            </a>
            <a href="/product" aria-current={pathname === "/product" ? "page" : undefined}>
              产品页
            </a>
          </nav>
        )}

        <div className="sovereign-utilities">
          {authEnabled ? (
            isAuthenticated ? (
              <form action="/auth/sign-out" method="post">
                <button className="shell-auth-button" type="submit">
                  {username ? `退出 ${username}` : "退出"}
                </button>
              </form>
            ) : (
              <a className="shell-auth-link" href="/login">
                {isMarketingPage ? "已有账号登录" : "登录"}
              </a>
            )
          ) : isMarketingPage ? (
            <a className="shell-auth-link" href="/login">
              已有账号登录
            </a>
          ) : null}
        </div>
      </header>

      <div className={`sovereign-body${isEntryPage ? " sovereign-body-entry" : ""}`}>
        {usesAppChrome && !isEntryPage ? (
          <aside className="sovereign-rail" aria-label="工具侧栏">
            <div className="rail-status">
              <div className="rail-avatar">PF</div>
              <span>ACTIVE</span>
            </div>

            <nav className="rail-nav" aria-label="工具导航">
              {railItems.map((item) =>
                item.action ? (
                  <button
                    key={item.label}
                    className={`shell-rail-button${
                      activeSection === "调查" && item.sublabel === "调查" ? " active" : ""
                    }`}
                    type="button"
                    onClick={() => dispatchShellEvent(item.action)}
                  >
                    <span className="shell-rail-icon" aria-hidden="true">
                      {item.label}
                    </span>
                    <span>{item.sublabel}</span>
                  </button>
                ) : (
                  <div
                    key={item.label}
                    className={`shell-rail-label${activeSection === "总览" ? " active" : ""}`}
                  >
                    <span className="shell-rail-icon" aria-hidden="true">
                      {item.label}
                    </span>
                    <span>{item.sublabel}</span>
                  </div>
                )
              )}
            </nav>
          </aside>
        ) : null}

        <section className="sovereign-stage">{children}</section>

        {usesAppChrome && !isEntryPage ? <aside className="sovereign-report-rail" aria-hidden="true" /> : null}
      </div>

      <style>{`
        .sovereign-shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(45, 91, 159, 0.08), transparent 18%),
            radial-gradient(circle at bottom right, rgba(134, 153, 172, 0.1), transparent 20%),
            var(--bg);
        }

        .sovereign-shell-entry {
          background:
            radial-gradient(circle at top center, rgba(45, 91, 159, 0.08), transparent 18%),
            radial-gradient(circle at bottom right, rgba(134, 153, 172, 0.1), transparent 22%),
            var(--bg);
        }

        .sovereign-topbar {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 22px;
          min-height: 56px;
          padding: 10px 18px;
          background: rgba(247, 249, 251, 0.72);
          border-bottom: 1px solid rgba(164, 176, 190, 0.18);
          backdrop-filter: blur(16px);
        }

        .sovereign-topbar-entry {
          max-width: 1160px;
          width: calc(100% - 32px);
          margin: 0 auto;
          padding-left: 0;
          padding-right: 0;
          background: transparent;
          border-bottom: 0;
          backdrop-filter: none;
        }

        .sovereign-topbar-marketing {
          padding-top: 24px;
        }

        .sovereign-brand-block {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sovereign-brand {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text);
          white-space: nowrap;
        }

        .sovereign-brand-subtitle {
          color: var(--muted);
          font-family: var(--font-sans);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .sovereign-nav {
          display: flex;
          align-items: center;
          gap: 18px;
          min-width: 0;
        }

        .sovereign-nav a {
          position: relative;
          padding: 6px 0;
          color: var(--muted);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .sovereign-nav a[aria-current="page"] {
          color: var(--text);
        }

        .sovereign-nav a[aria-current="page"]::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: -10px;
          left: 0;
          height: 2px;
          background: rgba(45, 91, 159, 0.82);
        }

        .sovereign-utilities {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .shell-auth-button,
        .shell-auth-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(164, 176, 190, 0.28);
          background: rgba(255, 255, 255, 0.62);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
        }

        .sovereign-body {
          display: grid;
          grid-template-columns: 60px minmax(0, 1fr) 42px;
          flex: 1;
          min-height: 0;
        }

        .sovereign-body-entry {
          display: block;
        }

        .sovereign-rail,
        .sovereign-report-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 14px 8px;
          background: rgba(244, 247, 250, 0.62);
        }

        .sovereign-rail {
          border-right: 1px solid rgba(164, 176, 190, 0.18);
        }

        .sovereign-report-rail {
          border-left: 1px solid rgba(164, 176, 190, 0.18);
        }

        .rail-status {
          display: grid;
          justify-items: center;
          gap: 6px;
        }

        .rail-avatar {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(45, 91, 159, 0.9), rgba(114, 139, 164, 0.9));
          color: white;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .rail-status span {
          color: var(--muted);
          font-family: var(--font-sans);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }

        .rail-nav {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .shell-rail-button,
        .shell-rail-label {
          display: grid;
          justify-items: center;
          gap: 4px;
          width: 100%;
          border: 0;
          border-radius: 12px;
          padding: 8px 4px;
          background: transparent;
          color: var(--muted);
        }

        .shell-rail-button {
          cursor: pointer;
        }

        .shell-rail-button.active,
        .shell-rail-label.active {
          background: rgba(255, 255, 255, 0.76);
          color: var(--text);
        }

        .shell-rail-icon {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.84);
          font-size: 10px;
          font-weight: 700;
        }

        .shell-rail-button span:last-child,
        .shell-rail-label span:last-child {
          font-size: 10px;
        }

        .sovereign-stage {
          position: relative;
          min-width: 0;
          min-height: 0;
          padding: 14px 0 18px;
        }

        .sovereign-shell-entry .sovereign-stage {
          padding-top: 0;
        }

        @media (max-width: 1100px) {
          .sovereign-topbar,
          .sovereign-topbar-entry {
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
            border-bottom: 1px solid rgba(164, 176, 190, 0.18);
          }

          .sovereign-report-rail {
            border-left: 0;
            border-top: 1px solid rgba(164, 176, 190, 0.18);
          }

          .rail-status {
            grid-auto-flow: column;
            align-items: center;
          }

          .rail-nav {
            flex-direction: row;
            justify-content: center;
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
