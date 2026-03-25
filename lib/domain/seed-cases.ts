import type { CaseAggregate } from "@/lib/domain/types";
import {
  applyEvidence,
  confirmStage,
  createCaseAggregate,
} from "@/lib/domain/workflow-engine";

export const SEED_CASES = {
  tantalum_reverse_polarity: "钽电容反向贴装客诉",
  fragmented_regression_case: "信息渐进推翻型异常案例",
} as const;

export type SeedCaseKey = keyof typeof SEED_CASES;

export function buildSeedCase(seedKey: SeedCaseKey): CaseAggregate {
  if (seedKey === "fragmented_regression_case") {
    let aggregate = createCaseAggregate(SEED_CASES[seedKey]);
    aggregate = applyEvidence(aggregate, {
      content: "客户端反馈低温条件下偶发不开机，批次C21，影响50台。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = applyEvidence(aggregate, {
      content: "已暂停出货并对库存执行低温筛选。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = applyEvidence(aggregate, {
      content: "初步怀疑主控固件版本差异，但新证据显示也可能与连接器虚焊有关。",
      contextStage: "D4",
    });
    return aggregate;
  }

  let aggregate = createCaseAggregate(SEED_CASES.tantalum_reverse_polarity);
  aggregate = applyEvidence(aggregate, {
    content:
      "客户大麦科技反馈 MCU-800 主控板在上电测试环节冒烟，位号C25，批次B12，2026-03-21发现，影响120台，工单WO-260320，线别SMT2。",
    contextStage: "D2",
  });
  aggregate = confirmStage(aggregate, { stage: "D2" });
  aggregate = applyEvidence(aggregate, {
    content:
      "客户现场已封存待检，已发货批次正在冻结追查，成品库存已扣留，在制品暂停投线并等待复判。",
    contextStage: "D3",
  });
  aggregate = confirmStage(aggregate, { stage: "D3" });
  aggregate = applyEvidence(aggregate, {
    content:
      "怀疑替代料卷带方向与原厂相反，且贴片程序未从 0 度切到 180 度，AOI 阈值也被放宽导致贴反流出。",
    contextStage: "D4",
  });
  aggregate = applyEvidence(aggregate, {
    content: "QE、PE、SMT、IQC、客服负责人已组建团队。",
    contextStage: "D1",
  });
  aggregate = confirmStage(aggregate, { stage: "D1" });
  return aggregate;
}
