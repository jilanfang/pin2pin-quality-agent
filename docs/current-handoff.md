# Pin2pin Fireline 当前交接说明

> 目的：给新线程一个与当前代码一致的恢复点。当前项目不是单一实现，而是存在 `Next.js` 主应用与根目录 `index.html` 离线原型两条并行线路。

> 2026-03-24 补充：产品主定位已升级为 `失效分析 / 异常响应工具`，`8D` 是正式输出物之一，不再是唯一中心对象。

## 状态快照（2026-03-25）

当前代码库里同时存在两条可运行线路：

1. `Next.js App Router + TypeScript` 单项目实现  
   入口在 `app/`、`components/`、`lib/`，可通过 `npm run dev` 启动。
2. 根目录 `index.html` 单文件离线原型
   仍可运行，适合做离线演示、交互试验和报告展示对照。

这两条线路都还能跑，但功能已经发生分叉。
**如果是沿着本线程继续做界面 / 离线原型 / 报告导出，请以 `index.html` 为准。**
**如果是沿着产品化 / API / LLM / 存储 / Next 页面继续做，请以 `app/ + components/ + lib/` 为准。**

---

## 1. 最新验证

本轮新鲜验证结果：

```bash
cd /Users/jilanfang/ai-quality
node --test deck.test.mjs
npm test
npm run typecheck
npm run build
```

结果：

- `deck.test.mjs`：`30 passed`
- `npm test`：`8` 个测试文件通过，`71` 个测试通过
- `npm run typecheck`：通过
- `npm run build`：通过
- 额外验证：
  - `http://127.0.0.1:3003/` 首页返回 `200`
  - `http://127.0.0.1:3003/api/health` 返回 `200`
  - `/_next/static/chunks/app/page-a30384f9bf25b568.js` 返回 `200`

说明：

- `index.html` 离线原型当前可用
- `Next.js` 主应用当前也没有坏
- 当前真正的问题不是“哪条线不能跑”，而是**文档口径滞后、两条线的边界没有写清**
- 本机 `3001 / 3002` 旧实例存在运行态污染，不能直接拿来代表当前 build；干净实例验证应以新起服务为准

---

## 2. 当前真实实现边界

### A. `index.html` 离线演示线路

文件：

- `index.html`
- `deck.test.mjs`
- `assets/xkyx-tech-grid.svg`

当前行为：

- 强制本地模式：`FORCE_LOCAL_FALLBACK = true`
- 不调用后端
- 按 `D2 -> D8` 理解案件，但在 `D4` 会停下来给“继续 / 收口”建议
- 支持 `D4 final` 收口：
  - 默认输出 `分析摘要`
  - 用户可再生成 `D4 截止版 8D`
- `D8` 确认后仍可生成完整 8D 报告
- `D1` 已固定团队成员：
  - `方暨兰，温阿利，耿向宇，崔杰，张涛，吴蕙羽`
- 品牌已切为：
  - 主标题：`Pin2pin Fireline`
  - 副标题：`Pin2pin.ai 旗下的异常响应与失效分析工作台`
  - 标识：`assets/xkyx-tech-grid.svg`

当前界面已具备：

- 新建项目
- 项目切换
- 项目重命名 / 删除
- 左侧栏折叠
- D2-D8 阶段推进
- D4 收口建议
- 阶段解锁 / 复审
- 对话消息内卡片与按钮
- 完整 HTML 结果页
- Word 导出
- PDF 打印导出
- 图片 / Word / PDF 上传
- Word / PDF 正文摄取进入对话上下文
- D2 在完整报告中以中文 5W1H 样式渲染

当前报告页特征：

- D1-D8 完整章节
- D1 显示固定团队成员
- D2 标题与英文副标题已补齐
- D2 正文按以下标签强化：
  - `发生地点与对象`
  - `发生时间`
  - `异常现象与表现`
  - `影响数量与范围`

### B. `Next.js` 主应用线路

文件：

- `app/page.tsx`
- `components/workspace.tsx`
- `lib/domain/*`
- `lib/server/*`
- `tests/*.test.ts*`

当前能力：

- 案件创建与列表
- 发送证据
- 阶段确认 / 解锁 / 复审
- 24h / interim / final 报告阶段
- 文风选择
- 文本 / HTML 报告预览
- Final 结案
- 本地文件存储 / Postgres 存储
- LLM 适配层与 `extract` 路由

当前 API：

- `GET /api/health`
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/evidence`
- `POST /api/cases/:id/stages/:stage/confirm`
- `POST /api/cases/:id/stages/:stage/unlock`
- `POST /api/cases/:id/stages/:stage/revalidate`
- `GET /api/cases/:id/report-preview`
- `GET /api/cases/:id/report-html`
- `POST /api/cases/:id/report`

---

## 3. 文档与代码不一致的点

当前最大的文档漂移有 4 类：

### 3.1 `docs/current-handoff.md` 里的验证数字已过时

旧版仍写：

- `deck.test.mjs`：`27 passed`
- `npm test`：`52 passed`

但当前最新验证结果已更新为：

- `deck.test.mjs`：`30 passed`
- `npm test`：`71 passed`

### 3.2 `docs/README.md` 和 `docs/current-handoff.md` 对“最近工作发生在哪条线”描述已落后

截至 `2026-03-25`，最近一轮产品加固主要发生在 `Next.js`：

- `旅程 1` 高压副驾感
- `旅程 3` 认知重建和问题排序
- `旅程 4` 专家信任层第一轮补强

对应记录见：

- `task_plan.md`
- `progress.md`
- `findings.md`

### 3.3 `AGENTS.md` 对 `index.html` 的定位写得过于绝对

当前写法容易让人误读成：

- `index.html` 已经失活
- 不能再用于演示或交互试验

更准确的说法应是：

- `Next.js` 是权威产品主线
- `index.html` 是仍在维护的离线原型 / 演示线

### 3.4 `task_plan.md` 不是旧的 LLM 路由任务

当前 `task_plan.md` 已切成：

- `Journey 1-3 Next.js Copilot Hardening`
- 范围明确落在 `app/`、`components/`、`lib/`
- 与最新代码变动是一致的

---

## 4. 当前未对齐 / 未实现项

这里不是“完全没做”，而是指**两条线路尚未对齐**或**文档里说了但当前线程还没真正统一**。

### 4.1 `index.html` 已有，但 Next.js 主应用未对齐的能力

以下能力当前在离线原型里有，`components/workspace.tsx` 主工作台未见对应实现：

- 项目重命名 / 删除
- 左侧折叠态的新版交互
- 品牌替换为 `Pin2pin Fireline + xkyx-tech-grid.svg`
- 完整报告 Word 导出
- 完整报告 PDF 导出入口
- D1 固定团队成员
- D2 中文 5W1H 强调样式
- 单文件离线回退的完整 `D2 -> D8` 原型逻辑

### 4.2 Next.js 主应用已有，但 `index.html` 未对齐的能力

以下能力当前在 Next.js 路线上已有明显实现，而离线原型没有：

- 本地文件 / Postgres 存储切换
- Route Handlers API 主链路
- LLM extract adapter 与环境配置
- `24h / interim / final` 报告阶段
- 文风三档
- seed case 载入
- 正式案件级状态 `open / closed`

### 4.3 文档层未实现的事情

- 还没有一份把“主线优先级”和“离线原型角色”彻底写死的总决策文档
- 还没有一份明确的“离线原型 -> Next.js 回灌清单”
- 运行态污染风险还没写进交接说明的显眼位置

---

## 5. 当前推荐的判断原则

如果是继续当前线程的工作，优先级应为：

1. **承认双线并存，但把 `Next.js` 明确成默认产品主线**
2. **新增产品能力默认优先落到 `Next.js`**
3. **短期离线演示或交互试验时，仍可使用 `index.html`**
4. **把离线原型中仍有价值的能力整理成可迁移清单，而不是继续隐性分叉**

也就是说：

- `index.html` 现在更像“快演示、快试交互”的离线前台
- `Next.js` 已经不只是工程底座，而是当前正在持续演进的产品主线

---

## 6. 最新工作计划

### 阶段 1：文档收口（现在）

- 更新 `docs/current-handoff.md`
- 更新 `docs/README.md`
- 重写 `task_plan.md`
- 明确写出双线现状、验证结果、功能分叉和推荐下一步

### 当前待办唯一依据

- 当前“工程评审 + 设计评审”的所有后续动作，统一收口在 [MVP 加固清单](./mvp-hardening-checklist.md)
- `task_plan.md`、`progress.md`、`findings.md` 现在只承担恢复上下文与阶段判断，不再各自维护平行待办
- 如果后续新增评审动作，先更新 `mvp-hardening-checklist.md`
- 离线原型与主应用的差异账本见 [index-html-to-nextjs-migration-ledger.md](./index-html-to-nextjs-migration-ledger.md)

### 阶段 2：当前默认方向

当前默认方向已经可以收口为：

#### 方向 B：以 `Next.js` 为正式主线，把离线原型中仍有价值的能力按需回灌

适合：

- 近期主要目标是统一产品代码、后续部署和真实模型服务接入
- 当前最新加固工作已连续落在 `Next.js` 主链路

下一步：

- 把 `index.html` 里仍未回灌但确实有价值的能力整理成迁移清单：
  - 品牌呈现差异
  - 导出入口
  - 项目管理交互
  - 侧栏折叠态
  - 特定报告样式细节

风险：

- 如果不记账迁移，离线原型和主应用会继续隐性分叉

### 阶段 3：无论选哪条线，都应该做的事

- 明确“权威实现”并更新 `AGENTS.md`
- 写一份迁移 / 对齐清单，避免继续隐性分叉
- 把最新验证命令和运行态污染提示固定进 handoff

---

## 7. 建议的立即行动项

按优先级排序：

1. 以 `Next.js` 作为下一阶段默认权威实现继续推进
2. 立即建立“离线原型增量迁移清单”
3. 清理本机旧实例后，再做一次 `3001` 端口的干净生产验证
4. 不要继续在两条线上同时做新增功能而不记账

---

## 8. 换线程恢复点

继续本线程时优先看：

- `index.html`
- `deck.test.mjs`
- `docs/current-handoff.md`
- `task_plan.md`

如果是继续 Next.js 路线，再补看：

- `components/workspace.tsx`
- `lib/domain/workflow-engine.ts`
- `lib/domain/report-builder.ts`
- `lib/server/api.ts`
- `tests/workspace.test.tsx`
