# 8D 输出层契约与渲染规则

## 1. 文档目的

这份文档把当前 `8D / 异常响应工具` 的输出能力收敛成可实施的契约。

目标是明确三件事：

1. 生成系统到底先产出什么结构化内容
2. 文风如何作用于内容，但不污染方法论判断
3. `文本 / 正式报告 / PDF` 分别怎么从同一内容层派生出来

一句话说，这份文档要防止后续实现时出现下面这些问题：

- 把 HTML 样式写进生成逻辑
- 把文风当成三套完全不同的内容模板
- 为了正式报告好看，把 `待验证` 写成 `已确认`
- 文本和 HTML 输出内容不一致

## 2. 总体原则

输出系统必须拆成三层：

1. `内容层`
2. `文风层`
3. `渲染层`

它们的责任边界必须清楚。

## 2.1 内容层

内容层负责：

- 事实
- 假设
- 证据状态
- D1-D8 结构化内容
- 风险状态
- 案件状态

内容层不负责：

- 最终措辞风格
- HTML 呈现
- PDF 分页

## 2.2 文风层

文风层负责：

- 同一内容的表达口径
- 句子正式度
- 段落组织方式
- 面向客户还是面向内部的表达差异

文风层不负责：

- 新增或删除事实
- 改写证据成熟度
- 改写案件状态
- 改写是否结案

## 2.3 渲染层

渲染层负责：

- 文本格式化
- HTML 报告排版
- 后续 PDF 输出

渲染层不负责：

- 根因判断
- 待验证判断
- 内容补造

## 3. 当前推荐的数据流

当前推荐的数据流应该是：

`案件事实与阶段状态 -> 结构化输出内容 -> 文风映射 -> 文本 / HTML -> PDF`

更细一点可以拆成：

1. `Extractor / Workflow` 产出案件状态
2. `Draft Generator` 产出结构化 8D 内容
3. `Style Mapper` 按文风调整表达
4. `Text Renderer` 生成文本
5. `HTML Renderer` 生成正式报告
6. 后续 `PDF Renderer` 基于 HTML 导出

## 4. 输出层最小契约

## 4.1 输出对象

建议输出层统一产出一个 `Output Document` 对象。

它至少应包含：

```json
{
  "document_id": "",
  "case_id": "",
  "language": "zh-CN",
  "style_mode": "professional_neutral",
  "output_status": "draft",
  "case_status": "open",
  "audience": "customer",
  "summary": {},
  "sections": [],
  "pending_items": [],
  "risk_flags": [],
  "metadata": {}
}
```

## 4.2 顶层字段建议

### `document_id`

当前输出文档的唯一标识。

### `case_id`

所属案件标识。

### `language`

当前先固定为：

- `zh-CN`

### `style_mode`

当前固定三档之一：

- `professional_neutral`
- `customer_formal`
- `internal_direct`

### `output_status`

建议至少支持：

- `draft`
- `interim`
- `final`

### `case_status`

建议至少支持：

- `open`
- `monitoring`
- `closed`

当前 MVP 实际最关键的是：

- `open`
- `closed`

### `audience`

建议支持：

- `customer`
- `internal`
- `mixed`

这个字段和 `style_mode` 有关联，但不完全等价。

### `summary`

报告头部摘要。

### `sections`

结构化的 `D1-D8` 内容。

### `pending_items`

所有当前仍待补、待验证、待确认的关键项。

### `risk_flags`

高风险提醒。

### `metadata`

文档级元数据，例如：

- 版本
- 生成时间
- 渲染时间
- 是否允许导出

## 5. 报告头部摘要契约

`summary` 建议至少包含：

```json
{
  "title": "",
  "report_no": "",
  "customer_name": "",
  "product_name": "",
  "product_model": "",
  "work_order": "",
  "batch": "",
  "severity": "high",
  "report_version": "24h_initial",
  "owner": "",
  "current_goal": "",
  "scope_statement": "",
  "status_badges": []
}
```

## 5.1 为什么需要 `summary`

因为 `正式报告` 和 `文本` 都需要一层稳定的头部信息。

它也是后续：

- HTML 头部卡片
- PDF 首页摘要
- 分享视图

的基础。

## 6. 章节契约

`sections` 应为稳定数组，每项对应一段可单独渲染的 8D 内容。

建议结构：

```json
{
  "section_key": "D4",
  "section_title": "根本原因分析",
  "status": "partial",
  "maturity": "high_confidence",
  "audience_notes": [],
  "blocks_export": false,
  "content_blocks": [],
  "warnings": [],
  "pending_items": []
}
```

## 6.1 字段解释

### `section_key`

- `D1`
- `D2`
- `D3`
- `D4`
- `D5`
- `D6`
- `D7`
- `D8`

### `section_title`

当前中文标题。

### `status`

建议支持：

- `missing`
- `partial`
- `ready`
- `confirmed`

### `maturity`

建议支持：

- `fact_only`
- `working_hypothesis`
- `high_confidence`
- `validated`

这个字段非常关键。

它比单纯 `status` 更能表达证据成熟度。

### `audience_notes`

用于保存：

- 对客户需要更谨慎表达的提醒
- 内部口径说明

注意：

这不是给用户看的主内容，而是文风映射时可用的辅助信息。

### `blocks_export`

用于明确该章节当前是否阻止正式导出。

例如：

- `D1` 缺失
- `D8` 未完成
- 某些关键章节仍处于 `missing`

### `content_blocks`

真正的内容块。

### `warnings`

章节级提醒。

### `pending_items`

本章节还没补齐的关键项。

## 7. 内容块契约

建议每个章节内部不是一整坨文本，而是多个 `content_blocks`。

结构建议：

```json
{
  "block_type": "bullet_group",
  "label": "发生原因",
  "items": [],
  "evidence_refs": [],
  "confidence": "high",
  "visibility": "all"
}
```

## 7.1 推荐的 `block_type`

至少支持：

- `paragraph`
- `bullet_group`
- `fact_list`
- `cause_tree`
- `action_list`
- `pending_list`
- `warning_box`

这样做的意义是：

- `文本` 可以把这些块转成清晰标题和列表
- `正式报告` 可以按块渲染不同样式
- 后续 `HTML -> PDF` 会更稳定

## 8. 证据与状态标签

这是整个输出层最不能丢的部分。

建议统一定义这些状态标签：

### 8.1 事实类

- `confirmed_fact`
- `reported_by_customer`
- `observed_internal`
- `measured`

### 8.2 判断类

- `hypothesis`
- `high_confidence_judgment`
- `validated_root_cause`
- `suspected_escape_cause`

### 8.3 流程类

- `pending_validation`
- `export_blocker`
- `customer_pending`
- `open_case`

## 8.1 为什么必须标签化

因为没有标签，文风和渲染层就很容易把边界写丢。

例如：

- `待验证`
- `客户待回传`
- `已验证根因`

这三种东西在视觉和语言上都必须能区分。

## 9. 文风映射规则

## 9.1 文风输入

当前只允许三种：

- `professional_neutral`
- `customer_formal`
- `internal_direct`

## 9.2 文风映射允许改变的内容

- 标题语气
- 句子长短
- 连接词
- 正式度
- 对客户风险提示的措辞

例如：

同一句话：

- `professional_neutral`
  - 当前已初步锁定发生原因，流出原因仍需结合现场记录进一步确认。
- `customer_formal`
  - 基于当前证据，发生原因已形成初步判断；针对流出原因的确认仍在进行中，后续将结合现场记录进一步更新。
- `internal_direct`
  - 发生原因基本锁定，流出原因还差现场记录补齐，先别结案。

## 9.3 文风映射禁止改变的内容

- 不能把 `pending_validation` 删除
- 不能把 `working_hypothesis` 改成 `validated`
- 不能把 `open` 改成 `closed`
- 不能删除风险提示
- 不能新增没有来源的结论

## 10. 文本渲染规则

`文本` 渲染器的目标是：

- 可复制
- 可粘贴
- 可二次编辑

## 10.1 文本渲染原则

- 标题简洁
- 层级稳定
- 列表优先
- 不依赖颜色或视觉组件传达关键信息

## 10.2 文本中状态的表达

文本里必须通过显式文字表达状态，例如：

- `当前判断`
- `待验证`
- `待客户确认`
- `案件状态：Open`

不能因为没有颜色样式就省略状态。

## 11. HTML 渲染规则

`正式报告` 渲染器的目标是：

- 像报告
- 易预览
- 易打印
- 为 PDF 做准备

## 11.1 HTML 渲染原则

- 固定报告头部
- 固定 D1-D8 顺序
- 状态标签可视化
- 重要字段卡片化
- 警示和待验证项有明显区隔

## 11.2 HTML 中必须明确可视化的状态

至少要可视化：

- `Open / Closed`
- `24h 初版 / Interim / Final`
- `待验证`
- `高风险`
- `客户待确认`

## 11.3 HTML 不允许做的事

- 不允许为追求“干净”而隐藏待验证项
- 不允许把 warning 只放在 hover 或折叠层
- 不允许页面看起来像 marketing landing page

## 12. PDF 渲染规则

当前阶段 PDF 不单独实现，但文档上要先定规则。

## 12.1 PDF 来源

PDF 来源必须是：

- 统一的 HTML 报告视图

不能走另一套单独模板系统。

## 12.2 PDF 关注点

后续导出时，至少要保证：

- A4 分页稳定
- 标题不会断裂
- 长列表分页可读
- 状态标签在打印后仍能识别

## 13. 与现有 Prompt 架构的关系

这份契约对当前 `Prompt Architecture v1` 的含义是：

- `Draft Generator` 不应只输出一段 `rendered_markdown`
- 更好的方向是：
  - 先输出结构化 `Output Document`
  - 再由独立 renderer 生成文本和 HTML

也就是说，后续最值得演进的是：

- 从“直接写最终文本”
- 升级到“先写结构化内容，再做多形态渲染”

## 14. 当前阶段最小实现建议

如果后续要按最小成本推进，我建议分三步：

### 第一步

- 保留当前阶段内容生成
- 在生成结果中补充：
  - `case_status`
  - `output_status`
  - `maturity`
  - `pending_items`

### 第二步

- 增加统一 `Output Document` 中间层
- 先打通 `文本`

### 第三步

- 基于同一中间层打通 `正式报告 HTML`
- 再接 `HTML -> PDF`

## 15. 当前阶段的一句话结论

实现上最重要的不是先把 HTML 做得多漂亮，而是先把：

`结构化内容层 -> 稳定文风映射 -> 多输出渲染`

这条链路拆干净。
