import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("server api case management", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStorePath = process.env.AI_QUALITY_STORE_PATH;
  let storePath = "";

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    storePath = join(tmpdir(), `ai-quality-case-api-${crypto.randomUUID()}.json`);
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

  it("updates title and archive state through the server handlers", async () => {
    const api = await import("@/lib/server/api");

    const created = await api.createCaseHandler({ title: "服务端案件" });
    const renamed = await api.updateCaseHandler(created.id, { title: "服务端案件-已重命名" });
    expect(renamed.title).toBe("服务端案件-已重命名");
    expect(renamed.archivedAt).toBeNull();

    const archived = await api.updateCaseHandler(created.id, { archived: true });
    expect(archived.archivedAt).toEqual(expect.any(String));

    const restored = await api.updateCaseHandler(created.id, { archived: false });
    expect(restored.archivedAt).toBeNull();
  });

  it("deletes a case through the server handler", async () => {
    const api = await import("@/lib/server/api");

    const created = await api.createCaseHandler({ title: "待删除案件" });
    await expect(api.deleteCaseHandler(created.id)).resolves.toEqual({ ok: true });

    const cases = await api.listCasesHandler();
    expect(cases.map((item) => item.id)).not.toContain(created.id);
  });
});
