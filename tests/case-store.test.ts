import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("caseStore", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStorePath = process.env.AI_QUALITY_STORE_PATH;
  let storePath = "";

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    storePath = join(tmpdir(), `ai-quality-store-${crypto.randomUUID()}.json`);
    process.env.AI_QUALITY_STORE_PATH = storePath;
    delete (globalThis as typeof globalThis & { __aiQualityMemoryCaseStore?: unknown })
      .__aiQualityMemoryCaseStore;
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(storePath, { force: true });
  });

  afterAll(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousStorePath === undefined) {
      delete process.env.AI_QUALITY_STORE_PATH;
    } else {
      process.env.AI_QUALITY_STORE_PATH = previousStorePath;
    }
    delete (globalThis as typeof globalThis & { __aiQualityMemoryCaseStore?: unknown })
      .__aiQualityMemoryCaseStore;
  });

  it("keeps no-db cases available even after module reloads and singleton loss", async () => {
    const firstModule = await import("@/lib/server/case-store");
    const firstStore = firstModule.getCaseStore();

    const aggregate = await firstStore.createCase("跨模块内存案件");

    delete (globalThis as typeof globalThis & { __aiQualityMemoryCaseStore?: unknown })
      .__aiQualityMemoryCaseStore;
    vi.resetModules();

    const secondModule = await import("@/lib/server/case-store");
    const secondStore = secondModule.getCaseStore();
    const cases = await secondStore.listCases();
    const restored = await secondStore.getCase(aggregate.caseRecord.id);

    expect(cases.map((item) => item.id)).toContain(aggregate.caseRecord.id);
    expect(restored?.caseRecord.title).toBe("跨模块内存案件");
  }, 15000);

  it("supports renaming, archiving, restoring, and deleting a case in no-db mode", async () => {
    const module = await import("@/lib/server/case-store");
    const store = module.getCaseStore();

    const created = await store.createCase("待管理案件");

    const renamed = await store.updateCase(created.caseRecord.id, {
      title: "已重命名案件",
    });
    expect(renamed?.caseRecord.title).toBe("已重命名案件");
    expect(renamed?.caseRecord.archivedAt).toBeNull();

    const archived = await store.updateCase(created.caseRecord.id, {
      archived: true,
    });
    expect(archived?.caseRecord.archivedAt).toEqual(expect.any(String));

    const restored = await store.updateCase(created.caseRecord.id, {
      archived: false,
    });
    expect(restored?.caseRecord.archivedAt).toBeNull();

    await expect(store.deleteCase(created.caseRecord.id)).resolves.toBe(true);
    await expect(store.getCase(created.caseRecord.id)).resolves.toBeNull();
  }, 15000);
});
