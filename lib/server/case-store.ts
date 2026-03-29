import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  artifactsTable,
  caseMessagesTable,
  casesTable,
  caseStagesTable,
  factSnapshotsTable,
  reportVersionsTable,
} from "@/lib/db/schema";
import { buildSeedCase, type SeedCaseKey } from "@/lib/domain/seed-cases";
import type {
  AssumptionItem,
  CaseAggregate,
  CaseMessage,
  CaseRecord,
  CaseStatus,
  FactItem,
  GapItem,
  WorkflowMode,
  D1Status,
  OutputDocument,
  StageRecord,
  WorkflowStage,
} from "@/lib/domain/types";
import { WORKFLOW_STAGES } from "@/lib/domain/types";
import { createCaseAggregate } from "@/lib/domain/workflow-engine";

type CaseUpdateInput = {
  title?: string;
  archived?: boolean;
};

type CaseOwnerContext = {
  ownerUserId?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cloneAggregate(aggregate: CaseAggregate): CaseAggregate {
  return {
    ...aggregate,
    caseRecord: { ...aggregate.caseRecord },
    knownFacts: aggregate.knownFacts.map((item) => ({ ...item })),
    missingFields: aggregate.missingFields.map((item) => ({ ...item })),
    assumptions: aggregate.assumptions.map((item) => ({ ...item })),
    riskFlags: [...aggregate.riskFlags],
    warnings: [...aggregate.warnings],
    messages: aggregate.messages.map((item) => ({ ...item })),
    stages: Object.fromEntries(
      WORKFLOW_STAGES.map((stage) => [stage, { ...aggregate.stages[stage] }])
    ) as CaseAggregate["stages"],
  };
}

type LocalStoreState = {
  cases: Record<string, CaseAggregate>;
  reports: OutputDocument[];
};

function emptyLocalStoreState(): LocalStoreState {
  return {
    cases: {},
    reports: [],
  };
}

function getLocalStorePath() {
  return process.env.AI_QUALITY_STORE_PATH || join(tmpdir(), "ai-quality-demo-store.json");
}

async function readLocalStoreState(): Promise<LocalStoreState> {
  try {
    const content = await readFile(getLocalStorePath(), "utf8");
    const parsed = JSON.parse(content) as Partial<LocalStoreState>;
    return {
      cases: parsed.cases ?? {},
      reports: parsed.reports ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyLocalStoreState();
    }
    throw error;
  }
}

async function writeLocalStoreState(state: LocalStoreState) {
  await writeFile(getLocalStorePath(), JSON.stringify(state), "utf8");
}

class MemoryCaseStore {
  async listCases(ownerUserId?: string | null) {
    const state = await readLocalStoreState();
    return Object.values(state.cases)
      .filter((item) => !ownerUserId || item.caseRecord.ownerUserId === ownerUserId)
      .map((item) => item.caseRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async createCase(title: string, seedCase?: SeedCaseKey, ownerUserId?: string | null) {
    const state = await readLocalStoreState();
    const aggregate = seedCase ? buildSeedCase(seedCase) : null;
    const next: CaseAggregate = aggregate
      ? { ...cloneAggregate(aggregate), caseRecord: { ...aggregate.caseRecord, title } }
      : createCaseAggregate(title);
    next.caseRecord.ownerUserId = ownerUserId ?? null;
    state.cases[next.caseRecord.id] = cloneAggregate(next);
    await writeLocalStoreState(state);
    return cloneAggregate(next);
  }

  async getCase(id: string, ownerUserId?: string | null) {
    const state = await readLocalStoreState();
    const aggregate = state.cases[id];
    if (aggregate && ownerUserId && aggregate.caseRecord.ownerUserId !== ownerUserId) return null;
    return aggregate ? cloneAggregate(aggregate) : null;
  }

  async updateCase(id: string, updates: CaseUpdateInput, ownerUserId?: string | null) {
    const state = await readLocalStoreState();
    const aggregate = state.cases[id];
    if (!aggregate) return null;
    if (ownerUserId && aggregate.caseRecord.ownerUserId !== ownerUserId) return null;

    if (typeof updates.title === "string") {
      aggregate.caseRecord.title = updates.title;
    }

    if (typeof updates.archived === "boolean") {
      aggregate.caseRecord.archivedAt = updates.archived ? nowIso() : null;
    }

    aggregate.caseRecord.updatedAt = nowIso();
    state.cases[id] = cloneAggregate(aggregate);
    await writeLocalStoreState(state);
    return cloneAggregate(aggregate);
  }

  async deleteCase(id: string, ownerUserId?: string | null) {
    const state = await readLocalStoreState();
    if (!state.cases[id]) return false;
    if (ownerUserId && state.cases[id]?.caseRecord.ownerUserId !== ownerUserId) return false;
    delete state.cases[id];
    await writeLocalStoreState(state);
    return true;
  }

  async saveCase(aggregate: CaseAggregate) {
    const state = await readLocalStoreState();
    state.cases[aggregate.caseRecord.id] = cloneAggregate(aggregate);
    await writeLocalStoreState(state);
  }

  async saveReport(document: OutputDocument) {
    const state = await readLocalStoreState();
    state.reports.push(document);
    await writeLocalStoreState(state);
  }
}

function getMemoryStoreSingleton() {
  const globalScope = globalThis as typeof globalThis & {
    __aiQualityMemoryCaseStore?: MemoryCaseStore;
  };

  if (!globalScope.__aiQualityMemoryCaseStore) {
    globalScope.__aiQualityMemoryCaseStore = new MemoryCaseStore();
  }

  return globalScope.__aiQualityMemoryCaseStore;
}

class PostgresCaseStore {
  async listCases(ownerUserId?: string | null): Promise<CaseRecord[]> {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is required");
    const rows = ownerUserId
      ? await db
          .select()
          .from(casesTable)
          .where(eq(casesTable.ownerUserId, ownerUserId))
          .orderBy(desc(casesTable.updatedAt))
      : await db.select().from(casesTable).orderBy(desc(casesTable.updatedAt));
    return rows.map(
      (row) =>
        ({
          id: row.id,
          ownerUserId: row.ownerUserId,
          title: row.title,
          status: row.status as CaseStatus,
          archivedAt: parseDate(row.archivedAt),
          currentStage: row.currentStage as CaseRecord["currentStage"],
          mode: row.mode as WorkflowMode,
          d1Status: row.d1Status as D1Status,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }) satisfies CaseRecord
    );
  }

  async createCase(title: string, seedCase?: SeedCaseKey, ownerUserId?: string | null) {
    const aggregate = seedCase
      ? buildSeedCase(seedCase)
      : createCaseAggregate(title);
    aggregate.caseRecord.title = title;
    aggregate.caseRecord.ownerUserId = ownerUserId ?? null;
    await this.saveCase(aggregate);
    return aggregate;
  }

  async getCase(id: string, ownerUserId?: string | null) {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is required");

    const [caseRow] = ownerUserId
      ? await db
          .select()
          .from(casesTable)
          .where(and(eq(casesTable.id, id), eq(casesTable.ownerUserId, ownerUserId)))
          .limit(1)
      : await db.select().from(casesTable).where(eq(casesTable.id, id)).limit(1);
    if (!caseRow) return null;

    const stageRows = await db
      .select()
      .from(caseStagesTable)
      .where(eq(caseStagesTable.caseId, id));
    const messageRows = await db
      .select()
      .from(caseMessagesTable)
      .where(eq(caseMessagesTable.caseId, id))
      .orderBy(desc(caseMessagesTable.createdAt));
    const [latestSnapshot] = await db
      .select()
      .from(factSnapshotsTable)
      .where(eq(factSnapshotsTable.caseId, id))
      .orderBy(desc(factSnapshotsTable.createdAt))
      .limit(1);

    const stages = Object.fromEntries(
      WORKFLOW_STAGES.map((stage) => {
        const row = stageRows.find((item) => item.stage === stage);
        const value: StageRecord = row
          ? {
              stage,
              workingContent: row.workingContent,
              confirmedContent: row.confirmedContent,
              locked: row.locked,
              impacted: row.impacted,
              impactSummary: row.impactSummary,
              lastReviewedAt: parseDate(row.lastReviewedAt),
            }
          : {
              stage,
              workingContent: "",
              confirmedContent: "",
              locked: false,
              impacted: false,
              impactSummary: null,
              lastReviewedAt: null,
            };
        return [stage, value];
      })
    ) as Record<WorkflowStage, StageRecord>;

    return {
      caseRecord: {
        id: caseRow.id,
        ownerUserId: caseRow.ownerUserId,
        title: caseRow.title,
        status: caseRow.status as CaseStatus,
        archivedAt: parseDate(caseRow.archivedAt),
        currentStage: caseRow.currentStage as CaseRecord["currentStage"],
        mode: caseRow.mode as WorkflowMode,
        d1Status: caseRow.d1Status as D1Status,
        createdAt: caseRow.createdAt.toISOString(),
        updatedAt: caseRow.updatedAt.toISOString(),
      },
      stages,
      messages: [...messageRows]
        .reverse()
        .map(
          (row) =>
            ({
              id: row.id,
              role: row.role as CaseMessage["role"],
              content: row.content,
              messageType: row.messageType as CaseMessage["messageType"],
              createdAt: row.createdAt.toISOString(),
            }) satisfies CaseMessage
        ),
      knownFacts: ((latestSnapshot?.knownFacts as FactItem[] | undefined) ?? []).map((item) => ({ ...item })),
      missingFields: ((latestSnapshot?.missingFields as GapItem[] | undefined) ?? []).map((item) => ({ ...item })),
      assumptions: ((latestSnapshot?.assumptions as AssumptionItem[] | undefined) ?? []).map((item) => ({ ...item })),
      riskFlags: [...(((latestSnapshot?.riskFlags as string[] | undefined) ?? []))],
      warnings: [],
    } satisfies CaseAggregate;
  }

  async saveCase(aggregate: CaseAggregate) {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is required");
    const now = new Date();

    await db
      .insert(casesTable)
      .values({
        id: aggregate.caseRecord.id,
        ownerUserId: aggregate.caseRecord.ownerUserId,
        title: aggregate.caseRecord.title,
        status: aggregate.caseRecord.status,
        archivedAt: aggregate.caseRecord.archivedAt ? new Date(aggregate.caseRecord.archivedAt) : null,
        currentStage: aggregate.caseRecord.currentStage,
        mode: aggregate.caseRecord.mode,
        d1Status: aggregate.caseRecord.d1Status,
        createdAt: new Date(aggregate.caseRecord.createdAt),
        updatedAt: new Date(aggregate.caseRecord.updatedAt || now),
      })
      .onConflictDoUpdate({
        target: casesTable.id,
        set: {
          title: aggregate.caseRecord.title,
          ownerUserId: aggregate.caseRecord.ownerUserId,
          status: aggregate.caseRecord.status,
          archivedAt: aggregate.caseRecord.archivedAt ? new Date(aggregate.caseRecord.archivedAt) : null,
          currentStage: aggregate.caseRecord.currentStage,
          mode: aggregate.caseRecord.mode,
          d1Status: aggregate.caseRecord.d1Status,
          updatedAt: new Date(aggregate.caseRecord.updatedAt || now),
        },
      });

    for (const stage of WORKFLOW_STAGES) {
      const stageRecord = aggregate.stages[stage];
      await db
        .insert(caseStagesTable)
        .values({
          id: `${aggregate.caseRecord.id}-${stage}`,
          caseId: aggregate.caseRecord.id,
          stage,
          workingContent: stageRecord.workingContent,
          confirmedContent: stageRecord.confirmedContent,
          locked: stageRecord.locked,
          impacted: stageRecord.impacted,
          impactSummary: stageRecord.impactSummary,
          lastReviewedAt: stageRecord.lastReviewedAt ? new Date(stageRecord.lastReviewedAt) : null,
        })
        .onConflictDoUpdate({
          target: caseStagesTable.id,
          set: {
            workingContent: stageRecord.workingContent,
            confirmedContent: stageRecord.confirmedContent,
            locked: stageRecord.locked,
            impacted: stageRecord.impacted,
            impactSummary: stageRecord.impactSummary,
            lastReviewedAt: stageRecord.lastReviewedAt ? new Date(stageRecord.lastReviewedAt) : null,
          },
        });
    }

    for (const message of aggregate.messages) {
      await db
        .insert(caseMessagesTable)
        .values({
          id: message.id,
          caseId: aggregate.caseRecord.id,
          role: message.role,
          content: message.content,
          messageType: message.messageType,
          createdAt: new Date(message.createdAt),
        })
        .onConflictDoNothing();
    }

    await db.insert(factSnapshotsTable).values({
      id: randomId("snapshot"),
      caseId: aggregate.caseRecord.id,
      knownFacts: aggregate.knownFacts,
      missingFields: aggregate.missingFields,
      assumptions: aggregate.assumptions,
      riskFlags: aggregate.riskFlags,
      createdAt: new Date(),
    });
  }

  async saveReport(document: OutputDocument) {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is required");
    await db.insert(reportVersionsTable).values({
      id: randomId("report"),
      caseId: document.caseId,
      reportStage: document.reportStage,
      styleMode: document.styleMode,
      payload: document,
      createdAt: new Date(),
    });
  }

  async updateCase(id: string, updates: CaseUpdateInput, ownerUserId?: string | null) {
    const aggregate = await this.getCase(id, ownerUserId);
    if (!aggregate) return null;

    if (typeof updates.title === "string") {
      aggregate.caseRecord.title = updates.title;
    }

    if (typeof updates.archived === "boolean") {
      aggregate.caseRecord.archivedAt = updates.archived ? nowIso() : null;
    }

    aggregate.caseRecord.updatedAt = nowIso();
    await this.saveCase(aggregate);
    return aggregate;
  }

  async deleteCase(id: string, ownerUserId?: string | null) {
    const db = getDb();
    if (!db) throw new Error("DATABASE_URL is required");

    const [existing] = ownerUserId
      ? await db
          .select({ id: casesTable.id })
          .from(casesTable)
          .where(and(eq(casesTable.id, id), eq(casesTable.ownerUserId, ownerUserId)))
          .limit(1)
      : await db.select({ id: casesTable.id }).from(casesTable).where(eq(casesTable.id, id)).limit(1);
    if (!existing) return false;

    await db.delete(caseMessagesTable).where(eq(caseMessagesTable.caseId, id));
    await db.delete(caseStagesTable).where(eq(caseStagesTable.caseId, id));
    await db.delete(factSnapshotsTable).where(eq(factSnapshotsTable.caseId, id));
    await db.delete(reportVersionsTable).where(eq(reportVersionsTable.caseId, id));
    await db.delete(artifactsTable).where(eq(artifactsTable.caseId, id));
    await db.delete(casesTable).where(eq(casesTable.id, id));
    return true;
  }
}

export interface CaseStore {
  listCases(ownerUserId?: string | null): Promise<CaseRecord[]>;
  createCase(title: string, seedCase?: SeedCaseKey, ownerUserId?: string | null): Promise<CaseAggregate>;
  getCase(id: string, ownerUserId?: string | null): Promise<CaseAggregate | null>;
  updateCase(id: string, updates: CaseUpdateInput, ownerUserId?: string | null): Promise<CaseAggregate | null>;
  deleteCase(id: string, ownerUserId?: string | null): Promise<boolean>;
  saveCase(aggregate: CaseAggregate): Promise<void>;
  saveReport(document: OutputDocument): Promise<void>;
}

export function getCaseStore(): CaseStore {
  return process.env.DATABASE_URL ? new PostgresCaseStore() : getMemoryStoreSingleton();
}

export async function ensureArtifactTablesForFutureUse() {
  void artifactsTable;
}
