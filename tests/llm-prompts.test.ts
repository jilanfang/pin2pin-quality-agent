import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("llm prompt organization", () => {
  it("keeps prompt text out of llm.ts and routes through the centralized prompts module", () => {
    const llmSource = readFileSync(resolve(process.cwd(), "lib/server/llm.ts"), "utf8");

    expect(llmSource).toContain('from "@/lib/server/prompts"');
    expect(llmSource).not.toContain("你是电子质量工程 8D 助手");
    expect(llmSource).not.toContain("你是 Pin2pin Fireline 的调查对话分析器。");
    expect(llmSource).not.toContain("你是 Pin2pin Fireline 的 8D 与质量方法助手。");
  });
});
