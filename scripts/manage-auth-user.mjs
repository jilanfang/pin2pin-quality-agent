import { randomUUID, scryptSync, randomBytes } from "node:crypto";
import process from "node:process";

import postgres from "postgres";

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9._-]{3,32}$/.test(normalizeUsername(username));
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/manage-auth-user.mjs create <username> <password> [email]",
      "  node scripts/manage-auth-user.mjs set-password <username> <password>",
      "  node scripts/manage-auth-user.mjs disable <username>",
      "  node scripts/manage-auth-user.mjs enable <username>",
    ].join("\n")
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const [command, usernameArg, passwordArg, emailArg] = process.argv.slice(2);
  if (!command || !usernameArg) {
    usage();
    process.exitCode = 1;
    return;
  }

  const username = normalizeUsername(usernameArg);
  if (!isValidUsername(username)) {
    throw new Error("Username must match ^[a-z0-9._-]{3,32}$");
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    if (command === "create") {
      if (!passwordArg) {
        usage();
        process.exitCode = 1;
        return;
      }

      await sql`
        insert into users (id, username, password_hash, email, status, created_at, updated_at)
        values (
          ${randomUUID()},
          ${username},
          ${hashPassword(passwordArg)},
          ${emailArg ?? null},
          ${"active"},
          now(),
          now()
        )
      `;
      console.log(`Created user ${username}`);
      return;
    }

    if (command === "set-password") {
      if (!passwordArg) {
        usage();
        process.exitCode = 1;
        return;
      }

      const result = await sql`
        update users
        set password_hash = ${hashPassword(passwordArg)}, updated_at = now()
        where username = ${username}
      `;
      if (result.count === 0) throw new Error(`User not found: ${username}`);
      console.log(`Updated password for ${username}`);
      return;
    }

    if (command === "disable" || command === "enable") {
      const status = command === "disable" ? "disabled" : "active";
      const result = await sql`
        update users
        set status = ${status}, updated_at = now()
        where username = ${username}
      `;
      if (result.count === 0) throw new Error(`User not found: ${username}`);
      console.log(`${status === "disabled" ? "Disabled" : "Enabled"} ${username}`);
      return;
    }

    usage();
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
