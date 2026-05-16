import React from "react";

export function FirelineMarketingHome() {
  return (
    <main className="marketing-page marketing-home" aria-label="Fireline 首页">
      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <span className="marketing-kicker">Fireline</span>
          <h1>Fireline 是质量异常闭环方案里的案件工作台。</h1>
          <p className="marketing-lead">
            它把客诉、异常响应、8D 和 RCA 的零散信息先整理清楚，找出缺口，帮团队 1 小时形成第一版结论。
          </p>
          <div className="marketing-actions">
            <a className="marketing-button marketing-button-primary" href="/login">
              申请试用
            </a>
            <a className="marketing-button marketing-button-secondary" href="/product">
              看产品结构
            </a>
            <a className="marketing-text-link" href="/login">
              已有账号登录
            </a>
          </div>
          <div className="marketing-chip-row" aria-label="适用场景">
            <span>异常响应</span>
            <span>客诉推进</span>
            <span>8D</span>
            <span>RCA</span>
          </div>
        </div>

        <div className="marketing-panel marketing-workbench" aria-label="Fireline 工作方式">
          <div className="marketing-panel-head">
            <span className="marketing-panel-kicker">怎么工作</span>
            <strong>先理清，再推进</strong>
          </div>
          <div className="marketing-list">
            <article>
              <strong>1. 收事实</strong>
              <p>客户邮件、会议纪要、测试结论、现场照片，先拉到一个案件里。</p>
            </article>
            <article>
              <strong>2. 标缺口</strong>
              <p>哪些证据已足够，哪些还缺，哪些结论现在还不能写死，直接标出来。</p>
            </article>
            <article>
              <strong>3. 出首版</strong>
              <p>先形成分析摘要、下一步动作和 24h 初版，不再从空白页硬写。</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
