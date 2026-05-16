import React from "react";

export function FirelineProductPage() {
  return (
    <main className="marketing-page marketing-product" aria-label="Fireline 产品页">
      <section className="marketing-hero marketing-hero-product">
        <div className="marketing-hero-copy">
          <span className="marketing-kicker">Product Page</span>
          <h1>Pin2pin Fireline 是异常响应与问题闭环工作台。</h1>
          <p className="marketing-lead">
            它把客户投诉、现场异常、调查推进和结果产物放在同一套界面里，帮助团队更快形成分析摘要、行动方案和 24h 初版 8D。
          </p>
          <div className="marketing-actions">
            <a className="marketing-button marketing-button-primary" href="/login">
              申请试用
            </a>
            <a className="marketing-button marketing-button-secondary" href="/">
              返回首页
            </a>
            <a className="marketing-text-link" href="/login">
              已有账号登录
            </a>
          </div>
        </div>
      </section>

      <section className="marketing-modules" aria-label="Fireline 模块">
        <article className="marketing-panel">
          <span className="marketing-panel-kicker">模块 01</span>
          <h2>总览入口</h2>
          <p>新建调查、继续最近调查、先看当前案件状态。</p>
        </article>
        <article className="marketing-panel">
          <span className="marketing-panel-kicker">模块 02</span>
          <h2>调查推进</h2>
          <p>围着证据、阶段判断和缺口提示推进，不再到处翻聊天记录。</p>
        </article>
        <article className="marketing-panel">
          <span className="marketing-panel-kicker">模块 03</span>
          <h2>结果产物</h2>
          <p>分析摘要、行动方案、24h 初版 8D，先把能交的版本交出去。</p>
        </article>
        <article className="marketing-panel">
          <span className="marketing-panel-kicker">模块 04</span>
          <h2>方法助手</h2>
          <p>8D、CAPA、5Why、FMEA 这些方法问题，单独拉出来问。</p>
        </article>
      </section>
    </main>
  );
}
