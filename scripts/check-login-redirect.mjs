import process from "node:process";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3001";
const USERNAME = process.env.SMOKE_AUTH_USERNAME || "fireline-demo-01";
const PASSWORD = process.env.SMOKE_AUTH_PASSWORD || "Pin2pin!2026";

async function main() {
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      username: USERNAME,
      password: PASSWORD,
    }),
    redirect: "manual",
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed with status ${loginResponse.status}`);
  }

  const setCookie = loginResponse.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Login response did not include a session cookie.");
  }

  const redirectResponse = await fetch(`${BASE_URL}/login`, {
    headers: {
      cookie: setCookie.split(";")[0],
    },
    redirect: "manual",
  });

  console.log(
    JSON.stringify(
      {
        status: redirectResponse.status,
        location: redirectResponse.headers.get("location"),
      },
      null,
      2
    )
  );

  if (redirectResponse.status !== 307 || redirectResponse.headers.get("location") !== "/workspace") {
    throw new Error("Expected /login to redirect authenticated users to /workspace");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
