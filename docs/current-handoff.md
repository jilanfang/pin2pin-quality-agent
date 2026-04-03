# Pin2pin Fireline 当前交接说明

> 用途只有一个，给中断后的线程一个恢复点。
> 它不是长期 backlog，不是架构总说明，也不是正式 source of truth。

如果这里和当前代码、`AGENTS.md`、`docs/README.md` 冲突，以后者为准。

## 当前恢复边界

继续当前产品主线时，默认只看这些目录和文件：

- `app/`
- `components/`
- `lib/`
- `tests/`
- `middleware.ts`

当前产品主线仍然是：

- `Next.js App Router + TypeScript`
- 正式工作台和登录链路走当前应用主线
- `index.html` 只作为离线参考，不作为当前产品实现依据

## 当前恢复入口

优先从这些文件重新建立上下文：

- `app/page.tsx`
- `app/login/page.tsx`
- `components/workspace.tsx`
- `components/sovereign-shell.tsx`
- `lib/server/api.ts`
- `lib/server/auth.ts`
- `lib/server/llm.ts`
- `tests/workspace.test.tsx`
- `tests/home-page.test.tsx`

## 当前默认判断

- 新功能默认落到 `app/ + components/ + lib/`
- 长期任务只写进 `docs/mvp-hardening-checklist.md`
- 部署、环境变量、鉴权和生产验收只看 `docs/deployment-and-demo.md`
- `task_plan.md`、`progress.md`、`findings.md` 只当过程记录，不当长期规范

## 这份文件适合什么时候看

- 线程刚恢复，需要知道先从哪里读代码
- 需要快速确认当前主线入口
- 需要把临时计划、恢复记录和正式文档分开

## 不适合什么时候看

- 想找长期 backlog
- 想确认正式部署规则
- 想确认设计基线
- 想确认产品命名和边界
