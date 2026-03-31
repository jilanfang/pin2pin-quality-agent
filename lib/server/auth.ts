import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";

import { and, eq, gt } from "drizzle-orm";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";

import { getDb } from "@/lib/db/client";
import { authSessionsTable, usersTable } from "@/lib/db/schema";
import type { RequestUserContext } from "@/lib/server/api";
import { AUTH_COOKIE_NAME, AUTH_SESSION_DURATION_MS } from "@/lib/server/auth-config";

export type ServerAuthState = RequestUserContext & {
  authEnabled: boolean;
  username: string | null;
};

type AuthUserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  email: string | null;
  status: string;
};

type LoginSuccess = {
  ok: true;
  sessionToken: string;
  userId: string;
  username: string;
};

type LoginFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const scrypt = promisify(scryptCallback);

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
}

function nowDate() {
  return new Date();
}

function buildSessionExpiryDate() {
  return new Date(Date.now() + AUTH_SESSION_DURATION_MS);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function findUserByUsername(normalizedUsername: string): Promise<AuthUserRecord | null> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is required");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, normalizedUsername))
    .limit(1);

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    email: user.email,
    status: user.status,
  };
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, expectedHash] = passwordHash.split(":");
  if (!salt || !expectedHash) return false;

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHash, "hex");

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function createAuthSession(userId: string) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is required");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = buildSessionExpiryDate();

  await db.insert(authSessionsTable).values({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    createdAt: nowDate(),
  });

  return token;
}

export function createSessionCookie(sessionToken: string): ResponseCookie {
  return {
    name: AUTH_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: buildSessionExpiryDate(),
  };
}

export function createClearedSessionCookie(): ResponseCookie {
  return {
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  };
}

export async function loginWithUsernamePassword(
  username: string,
  password: string
): Promise<LoginSuccess | LoginFailure> {
  requireDatabaseUrl();

  const normalizedUsername = normalizeUsername(username);
  if (!isValidUsername(normalizedUsername) || password.length === 0) {
    return {
      ok: false,
      status: 401,
      error: "用户名或密码错误",
    };
  }

  const user = await findUserByUsername(normalizedUsername);
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "用户名或密码错误",
    };
  }

  if (user.status !== "active") {
    return {
      ok: false,
      status: 403,
      error: "账号已停用",
    };
  }

  const verified = await verifyPassword(password, user.passwordHash);
  if (!verified) {
    return {
      ok: false,
      status: 401,
      error: "用户名或密码错误",
    };
  }

  return {
    ok: true,
    sessionToken: await createAuthSession(user.id),
    userId: user.id,
    username: user.username,
  };
}

export async function revokeSession(sessionToken: string) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is required");

  await db.delete(authSessionsTable).where(eq(authSessionsTable.tokenHash, hashToken(sessionToken)));
}

export async function getServerAuthState(): Promise<ServerAuthState> {
  if (!process.env.DATABASE_URL) {
    return {
      authEnabled: true,
      userId: null,
      isAuthenticated: false,
      username: null,
    };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return {
      authEnabled: true,
      userId: null,
      isAuthenticated: false,
      username: null,
    };
  }

  const db = getDb();
  if (!db) {
    return {
      authEnabled: true,
      userId: null,
      isAuthenticated: false,
      username: null,
    };
  }

  const [session] = await db
    .select({
      userId: authSessionsTable.userId,
      expiresAt: authSessionsTable.expiresAt,
      username: usersTable.username,
      status: usersTable.status,
    })
    .from(authSessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, authSessionsTable.userId))
    .where(
      and(
        eq(authSessionsTable.tokenHash, hashToken(sessionToken)),
        gt(authSessionsTable.expiresAt, nowDate())
      )
    )
    .limit(1);

  if (!session || session.status !== "active") {
    return {
      authEnabled: true,
      userId: null,
      isAuthenticated: false,
      username: null,
    };
  }

  return {
    authEnabled: true,
    userId: session.userId,
    isAuthenticated: true,
    username: session.username,
  };
}

export function assertAuthenticated(
  auth: ServerAuthState
): asserts auth is ServerAuthState & { userId: string; isAuthenticated: true; authEnabled: true } {
  if (!auth.isAuthenticated) {
    throw new Error("Authentication required");
  }
}
