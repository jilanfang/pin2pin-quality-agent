import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("browser smoke script", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = join(tmpdir(), `ai-quality-browser-smoke-script-${crypto.randomUUID()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when playwright reports an error even if run-code exits zero", async () => {
    const binDir = join(tempDir, "bin");
    const logPath = join(tempDir, "playwright.log");
    await mkdir(binDir, { recursive: true });

    const curlPath = join(binDir, "curl");
    await writeFile(
      curlPath,
      "#!/usr/bin/env bash\nexit 0\n",
      "utf8"
    );
    await chmod(curlPath, 0o755);

    const playwrightPath = join(binDir, "playwright-cli");
    await writeFile(
      playwrightPath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "${logPath}"
if [ "$2" = "open" ]; then
  exit 0
fi
if [ "$2" = "run-code" ]; then
  printf '### Error\\n'
  printf 'TimeoutError: simulated\\n'
  exit 0
fi
if [ "$2" = "close" ]; then
  exit 0
fi
exit 0
`,
      "utf8"
    );
    await chmod(playwrightPath, 0o755);

    await expect(
      execFileAsync("bash", ["./scripts/browser-smoke.sh"], {
        cwd: "/Users/jilanfang/ai-quality",
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ""}`,
          SMOKE_BASE_URL: "http://127.0.0.1:3001",
        },
      })
    ).rejects.toMatchObject({
      code: expect.any(Number),
    });
  });

  it("uses a resilient post-login handoff for preview auth flows", async () => {
    const binDir = join(tempDir, "bin");
    const logPath = join(tempDir, "playwright.log");
    await mkdir(binDir, { recursive: true });

    const curlPath = join(binDir, "curl");
    await writeFile(curlPath, "#!/usr/bin/env bash\nexit 0\n", "utf8");
    await chmod(curlPath, 0o755);

    const playwrightPath = join(binDir, "playwright-cli");
    await writeFile(
      playwrightPath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "${logPath}"
if [ "$2" = "open" ]; then
  exit 0
fi
if [ "$2" = "run-code" ]; then
  if printf '%s' "$3" | grep -Fq 'await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 }).catch(() => {});' && \
     printf '%s' "$3" | grep -Fq 'if (page.url().includes("/login")) {' && \
     printf '%s' "$3" | grep -Fq 'await page.goto(baseUrl, { waitUntil: "networkidle" });'; then
    printf '### Result\\n'
    printf '{"ok":true}\\n'
    exit 0
  fi
  printf '### Error\\n'
  printf 'TimeoutError: login redirect never completed\\n'
  exit 0
fi
if [ "$2" = "close" ]; then
  exit 0
fi
exit 0
`,
      "utf8"
    );
    await chmod(playwrightPath, 0o755);

    await expect(
      execFileAsync("bash", ["./scripts/browser-smoke.sh"], {
        cwd: "/Users/jilanfang/ai-quality",
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ""}`,
          SMOKE_BASE_URL: "http://127.0.0.1:3001",
          SMOKE_AUTH_EMAIL: "codex.smoke.20260329@gmail.com",
          SMOKE_AUTH_PASSWORD: "Pin2pin!2026",
        },
      })
    ).resolves.toMatchObject({
      stdout: expect.stringContaining('{"ok":true}'),
    });
  });
});
