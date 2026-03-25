# 8D Copilot 试用准备开发 Backlog

## 1. 文档目的

这份文档把 [试用前准备清单](./trial-readiness-checklist.md) 翻译成更接近开发执行的 backlog。

目标不是把产品做完整，而是回答：

`ai-quality` 接下来要具体改哪些地方，才能支持真实用户快速试用，并尽快拿到有效反馈。

## 2. 当前范围

当前 backlog 只覆盖试用反馈闭环，不覆盖：

- 登录 / 用户系统
- 支付 / 订阅
- 邀请 / 组队 / 返佣
- 多工具统一导航
- 企业权限体系

## 3. P0 Backlog

### P0-1 稳定试用环境

目标：

- 给真实用户提供一个稳定、可公开访问的试用地址

当前落点：

- [deployment-and-demo.md](./deployment-and-demo.md)
- [lib/server/case-store.ts](/Users/jilanfang/ai-quality/lib/server/case-store.ts)
- [lib/db/client.ts](/Users/jilanfang/ai-quality/lib/db/client.ts)

需要做的事：

- 接通一个正式 preview 环境
- 对外试用环境切到 `Postgres`
- 确保 preview 环境不再依赖本地文件存储

验收标准：

- 真实用户可直接打开试用地址
- 重启或重新部署后，历史案例不丢
- 健康检查可用

### P0-2 首单引导

目标：

- 用户进入工作台后，不需要创始人口头解释，也能开始第一单

当前落点：

- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)
- [app/page.tsx](/Users/jilanfang/ai-quality/app/page.tsx)

需要做的事：

- 在工作台顶部增加“先做什么”的引导区
- 明确推荐两个起步动作：
  - 加载种子案例
  - 新建空白案件
- 明确告诉用户什么时候能看到第一版结果

验收标准：

- 新用户进入后 10 秒内能理解第一步
- 页面不再像纯 demo 工作台，而像可试用产品入口

### P0-3 空状态和首屏说明

目标：

- 避免用户第一次进入时不知道现在该干嘛

当前落点：

- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)

需要做的事：

- 为无案件状态补一段明确说明
- 为未选中案件状态补引导
- 为报告区、阶段区、消息区补最小空状态提示

验收标准：

- 空白工作台不再出现“知道功能但不知道怎么开始”的状态
- 所有主区域在空状态下都有明确提示

### P0-4 页面内反馈入口

目标：

- 让反馈收集变成产品内动作，而不是依赖用户私聊

当前落点：

- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)
- 新增轻量 feedback API 或外部表单跳转点

需要做的事：

- 加一个固定可见的“反馈”入口
- 提供最短反馈分类：
  - 看不懂怎么用
  - 结果不专业
  - 有 bug / 报错
  - 其他建议

验收标准：

- 用户在工作台里随时能找到反馈入口
- 至少能提交结构化反馈类型

### P0-5 最小埋点

目标：

- 让团队知道用户在哪一步开始、卡住、离开

当前落点：

- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)
- [app/api/**](/Users/jilanfang/ai-quality/app/api)
- 可新增一个简单 telemetry 模块

第一批埋点事件：

- 打开工作台
- 新建案件
- 加载种子案例
- 发送第一条证据
- 生成报告预览
- 生成 final
- 主要报错

验收标准：

- 至少能还原用户的首单关键路径
- 至少能看到最常见失败点

## 4. P1 Backlog

### P1-1 种子案例入口强化

目标：

- 让种子案例不只是一个按钮，而是真正的试用捷径

当前落点：

- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)
- [lib/domain/seed-cases.ts](/Users/jilanfang/ai-quality/lib/domain/seed-cases.ts)

需要做的事：

- 强化种子案例入口的推荐文案
- 明确每个案例适合看什么能力
- 让用户更容易理解为什么先点它

验收标准：

- 用户看到种子案例时，知道它不是测试数据，而是产品演示入口

### P1-2 错误提示和恢复路径

目标：

- 用户失败时知道发生了什么，以及下一步怎么做

当前落点：

- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)
- [lib/server/api.ts](/Users/jilanfang/ai-quality/lib/server/api.ts)

需要做的事：

- 收紧报错文案
- 明确接口错误、校验错误、空结果状态
- 给出最小恢复动作

验收标准：

- 用户遇到失败时，不会只看到模糊的“请求失败”

### P1-3 首次预览后的微反馈

目标：

- 在用户最有感知的时候拿到最短反馈

当前落点：

- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)

需要做的事：

- 用户第一次生成预览后，触发极短反馈
- 只问两件事：
  - 这版结果有帮助吗
  - 你下一步最卡的是什么

验收标准：

- 第一次产生价值的时刻能收回反馈，而不是等用户流失后再问

### P1-4 品牌露出收口

目标：

- 未来从官网跳进来时，不让用户觉得进了另一个产品

当前落点：

- [app/layout.tsx](/Users/jilanfang/ai-quality/app/layout.tsx)
- [components/workspace.tsx](/Users/jilanfang/ai-quality/components/workspace.tsx)

需要做的事：

- 收口页面标题
- 在工作台头部补最小品牌关系
- 明确 `Pin2pin.ai / 8D Copilot`

验收标准：

- 浏览器标题和工作台主视觉都能看出品牌关系

## 5. P2 Backlog

这些可以在试用反馈闭环跑起来后再展开：

- 登录 / 账号体系
- 支付 / 订阅
- 邀请 / 组队 / 返佣
- 多工具统一导航
- 团队协作权限

## 6. 推荐执行顺序

建议按下面顺序推进：

1. `P0-1` 稳定试用环境
2. `P0-2` 首单引导
3. `P0-3` 空状态和首屏说明
4. `P0-4` 页面内反馈入口
5. `P0-5` 最小埋点
6. `P1-1` 种子案例入口强化
7. `P1-2` 错误提示和恢复路径
8. `P1-3` 首次预览后的微反馈
9. `P1-4` 品牌露出收口

## 7. 一句话总结

如果只看 `ai-quality` 接下来最该补什么，答案不是更多功能，而是：

`先把稳定试用、首单引导、反馈入口和埋点闭环补齐。`
