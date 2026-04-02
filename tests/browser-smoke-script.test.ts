import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

  it("fails when the delegated Playwright runner exits non-zero", async () => {
    const binDir = join(tempDir, "bin");
    await mkdir(binDir, { recursive: true });

    const curlPath = join(binDir, "curl");
    await writeFile(
      curlPath,
      "#!/usr/bin/env bash\nexit 0\n",
      "utf8"
    );
    await chmod(curlPath, 0o755);

    const nodePath = join(binDir, "node");
    await writeFile(
      nodePath,
      `#!/usr/bin/env bash
set -euo pipefail
printf 'runner failed\\n' >&2
exit 1
`,
      "utf8"
    );
    await chmod(nodePath, 0o755);

    await expect(
      execFileAsync("bash", ["./scripts/browser-smoke.sh"], {
        cwd: "/Users/jilanfang/ai-quality",
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ""}`,
          SMOKE_BASE_URL: "http://localhost:3001",
        },
      })
    ).rejects.toMatchObject({
      code: expect.any(Number),
    });
  });

  it("passes the smoke environment through to the delegated runner", async () => {
    const binDir = join(tempDir, "bin");
    const logPath = join(tempDir, "node-env.log");
    await mkdir(binDir, { recursive: true });

    const curlPath = join(binDir, "curl");
    await writeFile(curlPath, "#!/usr/bin/env bash\nexit 0\n", "utf8");
    await chmod(curlPath, 0o755);

    const nodePath = join(binDir, "node");
    await writeFile(
      nodePath,
      `#!/usr/bin/env bash
set -euo pipefail
printf 'SMOKE_BASE_URL=%s\\n' "$SMOKE_BASE_URL" > "${logPath}"
printf 'SMOKE_AUTH_USERNAME=%s\\n' "$SMOKE_AUTH_USERNAME" >> "${logPath}"
printf 'SMOKE_AUTH_PASSWORD=%s\\n' "$SMOKE_AUTH_PASSWORD" >> "${logPath}"
printf '{"ok":true}\\n'
`,
      "utf8"
    );
    await chmod(nodePath, 0o755);

    await expect(
      execFileAsync("bash", ["./scripts/browser-smoke.sh"], {
        cwd: "/Users/jilanfang/ai-quality",
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ""}`,
          SMOKE_BASE_URL: "http://localhost:3001",
          SMOKE_AUTH_USERNAME: "fireline-demo-01",
          SMOKE_AUTH_PASSWORD: "Pin2pin!2026",
        },
      })
    ).resolves.toMatchObject({
      stdout: expect.stringContaining('{"ok":true}'),
    });

    await expect(readFile(logPath, "utf8")).resolves.toContain("SMOKE_AUTH_USERNAME=fireline-demo-01");
  });

  it("delegates to the repo Playwright runner even when playwright-cli is unavailable", async () => {
    const binDir = join(tempDir, "bin");
    const logPath = join(tempDir, "node.log");
    await mkdir(binDir, { recursive: true });

    const curlPath = join(binDir, "curl");
    await writeFile(curlPath, "#!/usr/bin/env bash\nexit 0\n", "utf8");
    await chmod(curlPath, 0o755);

    const nodePath = join(binDir, "node");
    await writeFile(
      nodePath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" > "${logPath}"
printf '{"ok":true,"runner":"native-playwright"}\\n'
`,
      "utf8"
    );
    await chmod(nodePath, 0o755);

    await expect(
      execFileAsync("bash", ["./scripts/browser-smoke.sh"], {
        cwd: "/Users/jilanfang/ai-quality",
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ""}`,
          SMOKE_BASE_URL: "http://localhost:3001",
          SMOKE_AUTH_USERNAME: "fireline-demo-01",
          SMOKE_AUTH_PASSWORD: "Pin2pin!2026",
        },
      })
    ).resolves.toMatchObject({
      stdout: expect.stringContaining('"runner":"native-playwright"'),
    });

    await expect(readFile(logPath, "utf8")).resolves.toContain("scripts/browser-smoke.mjs");
  });
});
